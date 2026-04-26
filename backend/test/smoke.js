/**
 * UnitySplit Smoke Test
 * Run with: node test/smoke.js
 * 
 * Requires the server to be running locally on port 5000.
 * Uses Node 18+ built-in fetch.
 */

const BASE = 'http://localhost:5000/api';

let token1, token2, groupId, expenseId, iouId;
let pass = 0;
let fail = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    pass++;
  } else {
    console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

async function api(method, path, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('\n🧪 UnitySplit Smoke Tests\n');

  // ─── Health ────────────────────────────────────────────
  console.log('▶ Health Check');
  const healthRes = await fetch('http://localhost:5000/health');
  const healthData = await healthRes.json().catch(() => ({}));
  assert('Server is healthy', healthRes.status === 200 && healthData.success);

  // ─── Auth ──────────────────────────────────────────────
  console.log('\n▶ Auth');

  // Validation failure
  const badReg = await api('POST', '/auth/register', { email: 'notanemail', password: 'x' });
  assert('Validation rejects bad register payload', badReg.status === 422);

  // Register user 1
  const ts = Date.now();
  const reg1 = await api('POST', '/auth/register', {
    name: 'Alice',
    email: `alice_${ts}@test.com`,
    password: 'password123',
  });
  assert('Register user 1', reg1.status === 201 && reg1.data.token);
  token1 = reg1.data.token;
  const alice1Id = reg1.data._id;

  // Register user 2
  const reg2 = await api('POST', '/auth/register', {
    name: 'Bob',
    email: `bob_${ts}@test.com`,
    password: 'password123',
  });
  assert('Register user 2', reg2.status === 201 && reg2.data.token);
  token2 = reg2.data.token;
  const bobId = reg2.data._id;

  // Login
  const login = await api('POST', '/auth/login', { email: `alice_${ts}@test.com`, password: 'password123' });
  assert('Login returns token', login.status === 200 && login.data.token);

  // Update profile
  const profile = await api('PUT', '/auth/me', { name: 'Alice A.', currencyPreference: 'USD' }, token1);
  assert('Update profile', profile.status === 200 && profile.data.currencyPreference === 'USD');

  // Change password
  const changePwd = await api('PUT', '/auth/change-password', { oldPassword: 'password123', newPassword: 'newpass456' }, token1);
  assert('Change password', changePwd.status === 200);

  // Search users
  const search = await api('GET', '/auth/users?search=Bob', null, token1);
  assert('Search users by name', search.status === 200 && search.data.users?.length > 0);

  // ─── Groups ─────────────────────────────────────────────
  console.log('\n▶ Groups');

  const createG = await api('POST', '/groups', {
    name: 'Trip to Goa',
    emoji: '🏖️',
    currency: 'INR',
    description: 'Beach trip expenses',
    members: [alice1Id, bobId],
  }, token1);
  assert('Create group', createG.status === 201 && createG.data.group?._id);
  groupId = createG.data.group._id;

  const getG = await api('GET', '/groups', null, token1);
  assert('Get groups list (paginated)', getG.status === 200 && Array.isArray(getG.data.groups));

  // ─── Expenses ───────────────────────────────────────────
  console.log('\n▶ Expenses');

  // Equal split
  const addExp = await api('POST', `/groups/${groupId}/expenses`, {
    description: 'Hotel booking',
    amount: 3000,
    participants: [alice1Id, bobId],
    splitType: 'EQUAL',
    category: 'Travel',
  }, token1);
  assert('Add EQUAL expense', addExp.status === 201 && addExp.data.transaction?._id);
  expenseId = addExp.data.transaction?._id;

  // EXACT split validation (bad sum)
  const badExact = await api('POST', `/groups/${groupId}/expenses`, {
    description: 'Dinner',
    amount: 600,
    splitType: 'EXACT',
    splits: [{ userId: alice1Id, amount: 100 }, { userId: bobId, amount: 100 }],
  }, token1);
  assert('EXACT split rejects bad sum', badExact.status === 400);

  // Update expense
  const updExp = await api('PUT', `/groups/${groupId}/expenses/${expenseId}`, {
    description: 'Hotel booking (updated)',
    category: 'Utilities',
  }, token1);
  assert('Update expense', updExp.status === 200);

  // Settlement plan
  const settle = await api('GET', `/groups/${groupId}/settle`, null, token1);
  assert('Get settlement plan', settle.status === 200 && Array.isArray(settle.data.settlement));

  // ─── Settlements ────────────────────────────────────────
  console.log('\n▶ Settlements (Real-world)');

  const markS = await api('POST', '/settlements', {
    toUserId: bobId,
    groupId,
    amount: 1500,
    note: 'Paid via UPI',
  }, token1);
  assert('Mark debt as settled', markS.status === 201 && markS.data.settlement?._id);

  const getS = await api('GET', `/settlements/group/${groupId}`, null, token1);
  assert('Get group settlements', getS.status === 200 && getS.data.settlements?.length > 0);

  // ─── IOUs ───────────────────────────────────────────────
  console.log('\n▶ Personal IOUs');

  const createIOU = await api('POST', '/transactions', {
    description: 'Borrowed cash',
    amount: 500,
    toUserId: bobId,
  }, token1);
  assert('Create IOU', createIOU.status === 201);
  iouId = createIOU.data.transaction?._id;

  const getIOUs = await api('GET', '/transactions?status=PENDING', null, token1);
  assert('Get IOUs (filtered by status)', getIOUs.status === 200);

  // Approve IOU (as Bob)
  const approveR = await api('PUT', `/transactions/${iouId}/approve`, {}, token2);
  assert('Approve IOU as recipient', approveR.status === 200);

  // Delete IOU (already approved, should fail)
  const delIOU = await api('DELETE', `/transactions/${iouId}`, {}, token1);
  assert('Cannot delete non-PENDING IOU', delIOU.status === 400);

  // ─── Delete Expense ─────────────────────────────────────
  console.log('\n▶ Cleanup');

  const delExp = await api('DELETE', `/groups/${groupId}/expenses/${expenseId}`, {}, token1);
  assert('Delete expense', delExp.status === 200);

  const delGroup = await api('DELETE', `/groups/${groupId}`, {}, token1);
  assert('Soft-delete group', delGroup.status === 200);

  // Deleted group should no longer appear in list
  const getGAfter = await api('GET', '/groups', null, token1);
  const found = getGAfter.data.groups?.find((g) => g._id === groupId);
  assert('Archived group excluded from list', !found);

  // ─── Summary ────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (fail === 0) console.log('🎉 All smoke tests passed!\n');
  else console.log('⚠️  Some tests failed. Check above for details.\n');

  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
