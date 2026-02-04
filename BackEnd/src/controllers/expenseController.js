const Decimal = require('decimal.js');
const Expense = require('../models/expense');
const Group = require('../models/group');

function computeSplits({ method, amount, participants, inputSplits }) {
  const total = new Decimal(amount);
  const splits = [];
  if (method === 'equal') {
    const n = participants.length;
    const each = total.div(n);
    let running = new Decimal(0);
    for (let i = 0; i < n; i++) {
      let amt = each.toDecimalPlaces(2);
      running = running.plus(amt);
      // rounding adjustment: last or first gets correction
      if (i === 0) {
        const correction = total.minus(each.mul(n)).toDecimalPlaces(2);
        amt = amt.plus(correction);
      }
      splits.push({ user: participants[i], amount: amt.toNumber() });
    }
  } else if (method === 'exact') {
    // inputSplits: [{ user, amount }]
    let sum = new Decimal(0);
    for (const s of inputSplits) sum = sum.plus(new Decimal(s.amount));
    if (!sum.equals(total)) throw new Error('Split amounts must sum to total');
    for (const s of inputSplits) splits.push({ user: s.user, amount: Number(new Decimal(s.amount).toDecimalPlaces(2)) });
  } else if (method === 'percent') {
    // inputSplits: [{ user, percent }]
    let percentSum = new Decimal(0);
    for (const s of inputSplits) percentSum = percentSum.plus(new Decimal(s.percent));
    if (!percentSum.equals(new Decimal(100))) throw new Error('Percent splits must sum to 100');
    let running = new Decimal(0);
    for (let i = 0; i < inputSplits.length; i++) {
      const s = inputSplits[i];
      let amt = total.mul(new Decimal(s.percent).div(100)).toDecimalPlaces(2);
      running = running.plus(amt);
      if (i === 0) {
        const correction = total.minus(running).toDecimalPlaces(2);
        amt = amt.plus(correction);
      }
      splits.push({ user: s.user, amount: amt.toNumber(), percent: Number(s.percent) });
    }
  } else if (method === 'shares') {
    // inputSplits: [{ user, shares }]
    let shareSum = new Decimal(0);
    for (const s of inputSplits) shareSum = shareSum.plus(new Decimal(s.shares));
    if (shareSum.isZero()) throw new Error('Total shares must be > 0');
    let running = new Decimal(0);
    for (let i = 0; i < inputSplits.length; i++) {
      const s = inputSplits[i];
      let amt = total.mul(new Decimal(s.shares).div(shareSum)).toDecimalPlaces(2);
      running = running.plus(amt);
      if (i === 0) {
        const correction = total.minus(running).toDecimalPlaces(2);
        amt = amt.plus(correction);
      }
      splits.push({ user: s.user, amount: amt.toNumber(), shares: Number(s.shares) });
    }
  } else {
    throw new Error('Unknown split method');
  }
  return splits;
}

function simplifyDebts(balances) {
  // balances: [{ user, balance }] where positive means they are owed, negative means they owe
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b }));
  const settlements = [];

  // sort largest first
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // more negative first

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const pay = Math.min(credit.balance, -debt.balance);
    settlements.push({ from: debt.user, to: credit.user, amount: Number(new Decimal(pay).toDecimalPlaces(2)) });
    credit.balance -= pay;
    debt.balance += pay;
    if (credit.balance <= 1e-9) i++;
    if (debt.balance >= -1e-9) j++;
  }
  return settlements;
}

exports.postExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { amount, currency, paidBy, splitMethod, splits: inputSplits } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // validate membership
    const isMember = group.participants.some(p => p.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a participant of this group' });

    // default paidBy to current user
    const paidUser = paidBy || req.user._id;

    const participantIds = group.participants.map(p => p.user);
    // ensure paidBy is a participant of the group
    if (!participantIds.map(id => id.toString()).includes(paidUser.toString())) {
      return res.status(400).json({ success: false, message: 'Payer must be a participant of this group' });
    }
    const computedSplits = computeSplits({ method: splitMethod, amount, participants: participantIds, inputSplits: inputSplits });

    const expense = await Expense.create({
      group: group._id,
      amount,
      currency: currency || group.currency || 'INR',
      paidBy: paidUser,
      splitMethod,
      splits: computedSplits,
      status: 'approved',
      approvedBy: req.user._id,
    });

    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenses = await Expense.find({ group: groupId }).sort({ createdAt: -1 });
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('participants.user', 'firstName lastName emailId');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const expenses = await Expense.find({ group: groupId });

    // init balances
    const balancesMap = new Map();
    for (const p of group.participants) {
      const uid = (p.user?._id || p.user).toString();
      balancesMap.set(uid, { user: p.user, balance: 0 });
    }
    try {
      console.log('[Balances] group', groupId, 'participants', Array.from(balancesMap.keys()));
      console.log('[Balances] expenses count', expenses.length);
    } catch (_) {}

    for (const exp of expenses) {
      const paidBy = exp.paidBy.toString();
      const amt = new Decimal(exp.amount);
      // credit paid amount
      const bPaid = balancesMap.get(paidBy);
      if (bPaid) {
        bPaid.balance += amt.toNumber();
      } else {
        try { console.warn('[Balances] paidBy not found in participants', paidBy); } catch (_) {}
      }
      // debit owed per split
      for (const s of exp.splits) {
        const key = s.user.toString();
        const b = balancesMap.get(key);
        if (b) {
          b.balance -= Number(new Decimal(s.amount).toDecimalPlaces(2));
        } else {
          try { console.warn('[Balances] split user not found in participants', key); } catch (_) {}
        }
      }
    }

    const balances = Array.from(balancesMap.values()).map(b => ({ user: b.user, balance: Number(new Decimal(b.balance).toDecimalPlaces(2)) }));
    try { console.log('[Balances] result', balances); } catch (_) {}
    const settlements = simplifyDebts(balances);

    res.json({ success: true, balances, settlements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
