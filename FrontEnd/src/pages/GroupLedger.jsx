import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { 
  FaMoneyBillWave, 
  FaUsers, 
  FaExchangeAlt, 
  FaReceipt, 
  FaCheckCircle, 
  FaWallet 
} from 'react-icons/fa';

// --- Animation Variants ---
const containerVar = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1 } 
  }
};

const itemVar = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
};

const listVar = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export default function GroupLedger() {
  const { groupId } = useParams();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:7777';

  // State
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [splitMethod, setSplitMethod] = useState('equal');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [inputSplits, setInputSplits] = useState([]);

  // Refs for GSAP
  const submitBtnRef = useRef(null);
  const balanceRefs = useRef([]);

  const participants = useMemo(() => group?.participants || [], [group]);

  // --- Data Loading ---
  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [gRes, eRes, bRes] = await Promise.all([
        axios.get(`${API_BASE}/groups/${groupId}`, { withCredentials: true }),
        axios.get(`${API_BASE}/groups/${groupId}/expenses`, { withCredentials: true }),
        axios.get(`${API_BASE}/groups/${groupId}/balances`, { withCredentials: true }),
      ]);
      setGroup(gRes.data?.group);
      setExpenses(eRes.data?.expenses || []);
      setBalances(bRes.data?.balances || []);
      setSettlements(bRes.data?.settlements || []);
      setCurrency(gRes.data?.group?.currency || 'INR');
      
      const fetchedParticipants = gRes.data?.group?.participants || [];
      setInputSplits(fetchedParticipants.map(p => ({
        user: p.user?._id || p.user,
        amount: '',
        percent: '',
        shares: ''
      })));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, API_BASE]);

  // --- GSAP Balance Animation ---
  useEffect(() => {
    // Animate numbers whenever balances update
    balanceRefs.current.forEach((el, index) => {
      if(el) {
        const targetVal = balances[index]?.balance || 0;
        gsap.fromTo(el, 
          { innerText: 0 }, 
          { 
            innerText: targetVal, 
            duration: 1.5, 
            snap: { innerText: 1 }, // Snap to whole numbers
            ease: "power2.out" 
          }
        );
      }
    });
  }, [balances]);

  // --- Form Submission ---
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // GSAP Button Animation
    if (submitBtnRef.current) {
      gsap.to(submitBtnRef.current, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut"
      });
    }

    try {
      const payload = {
        amount: Number(amount),
        currency,
        splitMethod,
        splits: inputSplits
          .filter(s => s.user)
          .map(s => ({
            user: s.user,
            amount: splitMethod === 'exact' ? Number(s.amount || 0) : undefined,
            percent: splitMethod === 'percent' ? Number(s.percent || 0) : undefined,
            shares: splitMethod === 'shares' ? Number(s.shares || 0) : undefined,
          })),
      };
      const res = await axios.post(`${API_BASE}/groups/${groupId}/expenses`, payload, { withCredentials: true });
      
      setExpenses(prev => [res.data?.expense, ...prev]);
      
      // Refresh balances
      const bRes = await axios.get(`${API_BASE}/groups/${groupId}/balances`, { withCredentials: true });
      setBalances(bRes.data?.balances || []);
      setSettlements(bRes.data?.settlements || []);
      
      // Reset Form
      setAmount('');
      setSplitMethod('equal');
      
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add expense');
    }
  };

  // --- Render Dynamic Inputs ---
  const renderInputs = () => {
    if (splitMethod === 'equal') {
      return (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2"
        >
          <FaCheckCircle /> Split equally among all {participants.length} participants.
        </motion.div>
      );
    }

    const label = splitMethod === 'exact' ? 'Amount' : splitMethod === 'percent' ? 'Percent %' : 'Shares';

    return (
      <motion.div 
        className="grid md:grid-cols-2 gap-3"
        initial="hidden"
        animate="visible"
        variants={containerVar}
      >
        {participants.map((p, idx) => (
          <motion.div key={p.user._id || p.user} variants={itemVar} className="form-control">
            <label className="label">
              <span className="label-text font-medium text-slate-600">{p.user.firstName || 'Member'} {p.user.lastName || ''}</span>
            </label>
            <input
              type="number"
              className="input input-bordered bg-white border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
              placeholder={label}
              value={
                splitMethod === 'exact'
                  ? (inputSplits[idx]?.amount ?? '')
                  : splitMethod === 'percent'
                  ? (inputSplits[idx]?.percent ?? '')
                  : (inputSplits[idx]?.shares ?? '')
              }
              onChange={(e) => {
                const clone = [...inputSplits];
                if (!clone[idx]) {
                  clone[idx] = { user: (p.user?._id || p.user), amount: '', percent: '', shares: '' };
                }
                if (splitMethod === 'exact') clone[idx].amount = e.target.value;
                else if (splitMethod === 'percent') clone[idx].percent = e.target.value;
                else clone[idx].shares = e.target.value;
                setInputSplits(clone);
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-emerald-100 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold flex items-center gap-2 text-emerald-800"
          >
            <FaMoneyBillWave className="text-emerald-500" /> 
            {group?.name || 'Group Ledger'}
          </motion.h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && <div className="text-center text-emerald-600 animate-pulse">Loading details...</div>}
        {error && <div className="alert alert-error mb-6 shadow-lg">{error}</div>}

        {group && (
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={containerVar}
            initial="hidden"
            animate="visible"
          >
            
            {/* LEFT COLUMN: ADD EXPENSE & HISTORY */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Add Expense Card */}
              <motion.div variants={itemVar} className="card bg-white shadow-xl shadow-emerald-100/50 border border-emerald-50 overflow-visible">
                <div className="card-body">
                  <h2 className="card-title text-xl text-slate-700 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <FaReceipt size={14} />
                    </div>
                    Add New Expense
                  </h2>
                  
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      
                      {/* Amount */}
                      <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Total Amount</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-slate-400 text-sm">{currency}</span>
                          <input 
                            type="number" 
                            className="input input-bordered w-full pl-12 bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            required 
                          />
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Currency</span></label>
                        <select className="select select-bordered w-full bg-white border-slate-300" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                          <option>INR</option>
                          <option>USD</option>
                          <option>EUR</option>
                        </select>
                      </div>

                      {/* Split Method */}
                      <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Split Method</span></label>
                        <select className="select select-bordered w-full bg-white border-slate-300" value={splitMethod} onChange={(e) => setSplitMethod(e.target.value)}>
                          <option value="equal">Equal Split</option>
                          <option value="exact">Exact Amounts</option>
                          <option value="percent">Percentages</option>
                          <option value="shares">Shares</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic Inputs Wrapper with Animation */}
                    <div className="bg-white p-2 rounded-xl">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={splitMethod}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {renderInputs()}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                      <button 
                        ref={submitBtnRef}
                        type="submit" 
                        className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none px-8 text-lg shadow-lg shadow-emerald-200"
                      >
                        Add Expense
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>

              {/* Expense History List */}
              <motion.div variants={itemVar} className="card bg-white shadow-lg border border-slate-100">
                <div className="card-body">
                  <h2 className="card-title text-slate-700 mb-4">Recent Activity</h2>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {expenses.map((exp) => (
                        <motion.div 
                          key={exp._id}
                          layout
                          variants={listVar}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-200 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <FaMoneyBillWave />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-lg">
                                {exp.amount} <span className="text-sm font-normal text-slate-500">{exp.currency}</span>
                              </div>
                              <div className="text-xs font-medium uppercase tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded-full inline-block border border-slate-200 mt-1">
                                {exp.splitMethod}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-xs text-slate-400">
                               {new Date(exp.createdAt).toLocaleDateString()}
                             </div>
                             <div className="text-xs text-slate-400">
                               {new Date(exp.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {expenses.length === 0 && (
                      <div className="text-center py-10 text-slate-400 italic">No expenses recorded yet.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT COLUMN: BALANCES & SETTLEMENTS */}
            <div className="space-y-8">
              
              {/* Balances Card */}
              <motion.div variants={itemVar} className="card bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-xl shadow-emerald-200">
                <div className="card-body">
                  <h2 className="card-title flex items-center gap-2 mb-4">
                    <FaWallet className="text-emerald-200" /> Net Balances
                  </h2>
                  <div className="space-y-3">
                    {balances.map((b, i) => (
                      <div key={b.user._id || b.user} className="flex items-center justify-between bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-emerald-200 text-emerald-900 rounded-full w-8">
                              <span className="text-xs font-bold">{(b.user.firstName || 'M')[0]}</span>
                            </div>
                          </div>
                          <span className="font-medium">{b.user.firstName || 'Member'}</span>
                        </div>
                        <div className={`font-mono font-bold text-lg ${b.balance >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                          {b.balance >= 0 ? '+' : ''}
                          {/* GSAP Target span */}
                          <span ref={el => balanceRefs.current[i] = el}>0</span>
                        </div>
                      </div>
                    ))}
                    {balances.length === 0 && <div className="opacity-70 text-center text-sm">No balances calculated.</div>}
                  </div>
                </div>
              </motion.div>

              {/* Settlements Card */}
              <motion.div variants={itemVar} className="card bg-white shadow-lg border border-slate-100">
                <div className="card-body">
                  <h2 className="card-title text-slate-700 flex items-center gap-2">
                    <FaExchangeAlt className="text-emerald-500" /> Suggested Settlements
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">The most efficient way to clear debts.</p>
                  
                  <div className="space-y-3">
                    {settlements.map((s, i) => {
                      const fromUser = s.from;
                      const toUser = s.to;
                      const key = `${fromUser?._id || fromUser}-${toUser?._id || toUser}-${s.amount}`;
                      const fromName = `${fromUser?.firstName || 'Member'} ${fromUser?.lastName || ''}`.trim();
                      const toName = `${toUser?.firstName || 'Member'} ${toUser?.lastName || ''}`.trim();
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={key}
                          className="flex items-center p-3 rounded-lg border border-slate-100 bg-slate-50"
                        >
                          <div className="flex-1 flex flex-col items-center">
                            <span className="font-semibold text-slate-700 text-sm">{fromName}</span>
                          </div>
                          
                          <div className="flex flex-col items-center px-2">
                            <span className="text-emerald-600 font-bold text-sm bg-emerald-100 px-2 py-0.5 rounded">
                              {s.amount}
                            </span>
                            <div className="h-[1px] w-full bg-slate-300 my-1 relative">
                              <div className="absolute right-0 -top-1 w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-slate-300 border-b-[3px] border-b-transparent"></div>
                            </div>
                            <span className="text-[10px] uppercase text-slate-400">Pays</span>
                          </div>

                          <div className="flex-1 flex flex-col items-center">
                            <span className="font-semibold text-slate-700 text-sm">{toName}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                    {settlements.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">Everyone is settled up!</div>}
                  </div>
                </div>
              </motion.div>

              {/* Participants List (Mini) */}
               <motion.div variants={itemVar} className="card bg-white shadow border border-slate-100">
                  <div className="card-body py-4">
                     <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <FaUsers /> Group Members
                     </h3>
                     <div className="flex -space-x-2 overflow-hidden py-1">
                        {participants.map((p, i) => (
                          <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-800" title={p.user.emailId}>
                             {(p.user.firstName || 'U')[0]}
                          </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}