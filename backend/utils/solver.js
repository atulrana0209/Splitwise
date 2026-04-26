/**
 * Min Cash Flow Algorithm to simplify debts
 * @param {Array} transactions - Array of { from: String, to: String, amount: Number }
 * @returns {Array} - Simplified array of { from: String, to: String, amount: Number }
 */
function minimizeCashFlow(transactions) {
  const balances = {};

  // 1. Calculate net balance for each person
  for (const t of transactions) {
    if (!balances[t.from]) balances[t.from] = 0;
    if (!balances[t.to]) balances[t.to] = 0;

    balances[t.from] -= t.amount; // they owe money
    balances[t.to] += t.amount;   // they are owed money
  }

  // 2. Separate into Debtors and Creditors
  const debtors = [];
  const creditors = [];

  for (const [user, balance] of Object.entries(balances)) {
    if (balance > 0) {
      creditors.push({ user, amount: balance });
    } else if (balance < 0) {
      debtors.push({ user, amount: -balance });
    }
  }

  // 3. Greedy algorithm to settle debts
  const result = [];
  let d = 0; // debtor index
  let c = 0; // creditor index

  // Standard O(N) sort to make the greedy choice a bit more optimal
  // Although finding max is technically better, sorting once is O(N log N) 
  // and iterating is O(N), which is efficient.
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    result.push({
      from: debtor.user,
      to: creditor.user,
      amount: Number(settledAmount.toFixed(2))
    });

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // Fix precision issues
    if (Math.abs(debtor.amount) < 0.01) d++;
    if (Math.abs(creditor.amount) < 0.01) c++;
  }

  return result;
}

module.exports = { minimizeCashFlow };
