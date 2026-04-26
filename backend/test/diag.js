/**
 * Quick diagnostic: just logs raw status + body for each call
 */
const BASE = 'http://localhost:5000/api';

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
  const ts = Date.now();

  const reg1 = await api('POST', '/auth/register', { name:'Alice', email:`a_${ts}@t.com`, password:'pass123' });
  console.log('Register1:', reg1.status, JSON.stringify(reg1.data).slice(0,200));
  const token1 = reg1.data.token;
  const alice1Id = reg1.data._id;

  const reg2 = await api('POST', '/auth/register', { name:'Bob', email:`b_${ts}@t.com`, password:'pass123' });
  console.log('Register2:', reg2.status);
  const token2 = reg2.data.token;
  const bobId = reg2.data._id;

  const health = await api('GET', '/../health');
  console.log('Health:', health.status, JSON.stringify(health.data));

  const badReg = await api('POST', '/auth/register', { email:'notanemail', password:'x' });
  console.log('Bad register:', badReg.status, JSON.stringify(badReg.data));

  const profile = await api('PUT', '/auth/me', { name:'Alice A.', currencyPreference:'USD' }, token1);
  console.log('Update profile:', profile.status, JSON.stringify(profile.data).slice(0,200));

  const changePwd = await api('PUT', '/auth/change-password', { oldPassword:'pass123', newPassword:'newpass456' }, token1);
  console.log('Change pwd:', changePwd.status, JSON.stringify(changePwd.data));

  const search = await api('GET', '/auth/users?search=Bob', null, token1);
  console.log('Search users:', search.status, JSON.stringify(search.data).slice(0,200));

  const createG = await api('POST', '/groups', { name:'Test Trip', emoji:'🏖️', currency:'INR' }, token1);
  console.log('Create group:', createG.status, JSON.stringify(createG.data).slice(0,200));
  const groupId = createG.data.group?._id;

  const getG = await api('GET', '/groups', null, token1);
  console.log('Get groups:', getG.status, JSON.stringify(getG.data).slice(0,200));

  const addExp = await api('POST', `/groups/${groupId}/expenses`, {
    description:'Hotel', amount:3000, participants:[alice1Id, bobId], splitType:'EQUAL', category:'Travel'
  }, token1);
  console.log('Add expense:', addExp.status, JSON.stringify(addExp.data).slice(0,300));
  const expenseId = addExp.data.transaction?._id;

  const badExact = await api('POST', `/groups/${groupId}/expenses`, {
    description:'Dinner', amount:600, splitType:'EXACT',
    splits:[{userId:alice1Id,amount:100},{userId:bobId,amount:100}]
  }, token1);
  console.log('Bad exact:', badExact.status, JSON.stringify(badExact.data));

  const settle = await api('GET', `/groups/${groupId}/settle`, null, token1);
  console.log('Settlement:', settle.status, JSON.stringify(settle.data).slice(0,200));

  const markS = await api('POST', '/settlements', { toUserId:bobId, groupId, amount:1500, note:'UPI' }, token1);
  console.log('Mark settled:', markS.status, JSON.stringify(markS.data).slice(0,200));

  const getS = await api('GET', `/settlements/group/${groupId}`, null, token1);
  console.log('Get settlements:', getS.status, JSON.stringify(getS.data).slice(0,200));

  const createIOU = await api('POST', '/transactions', { description:'Cash', amount:500, toUserId:bobId }, token1);
  console.log('Create IOU:', createIOU.status, JSON.stringify(createIOU.data).slice(0,200));
  const iouId = createIOU.data.transaction?._id;

  const approveR = await api('PUT', `/transactions/${iouId}/approve`, {}, token2);
  console.log('Approve IOU:', approveR.status, JSON.stringify(approveR.data).slice(0,200));
}

run().catch(e => console.error('CRASH:', e.message));
