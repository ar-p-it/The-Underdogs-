import { useState, useEffect, useRef, useMemo } from 'react';
import { SignOutButton } from '@clerk/clerk-react';
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import Sidebar from '../components/Sidebar';
import CreateGroupModal from '../components/CreateGroupModal';
import InviteQRModal from '../components/InviteQRModal';
import JoinGroupModal from '../components/JoinGroupModal';

// Animation variants for Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const userId = useSelector((s) => s.auth?.user?._id);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:7777';

  // User stats
  const [totalBalance, setTotalBalance] = useState(0);
  const [youAreOwed, setYouAreOwed] = useState(0);
  const [youOwe, setYouOwe] = useState(0);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  const [recent, setRecent] = useState([]);

  // Derived chart data
  const spendingTrend = useMemo(() => {
    const items = (recent || []).slice(0, 10).reverse();
    return items.map(r => ({
      label: r.date?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) || '',
      amount: Number(r.amount || 0),
    }));
  }, [recent]);

  const totalsData = useMemo(() => (
    [
      { name: 'Monthly', value: Number(monthlySpending || 0) },
      { name: 'Yearly', value: Number(yearlyTotal || 0) },
    ]
  ), [monthlySpending, yearlyTotal]);

  const balanceData = useMemo(() => (
    [
      { name: 'Owed to You', value: Number(youAreOwed || 0), color: '#059669' }, // emerald-600
      { name: 'You Owe', value: Number(youOwe || 0), color: '#f59e0b' }, // amber-500
    ]
  ), [youAreOwed, youOwe]);

  // Refs for GSAP number animations
  const totalRef = useRef(null);
  const owedRef = useRef(null);
  const oweRef = useRef(null);

  useEffect(() => {
    // Optional animation retained for subtle transitions; values render directly below
    const tl = gsap.timeline();
    tl.to([totalRef.current, owedRef.current, oweRef.current], { duration: 0.2, opacity: 0.6 })
      .to([totalRef.current, owedRef.current, oweRef.current], { duration: 0.2, opacity: 1.0 });
  }, [totalBalance, youAreOwed, youOwe]);

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/groups/summary/my`, { withCredentials: true });
        const data = res.data || {};
        setTotalBalance(Number((data.totalBalance ?? 0).toFixed?.(2) || data.totalBalance || 0));
        setYouAreOwed(Number((data.youAreOwed ?? 0).toFixed?.(2) || data.youAreOwed || 0));
        setYouOwe(Number((data.youOwe ?? 0).toFixed?.(2) || data.youOwe || 0));
        setMonthlySpending(Number((data.monthlySpending ?? 0).toFixed?.(2) || data.monthlySpending || 0));
        setYearlyTotal(Number((data.yearlyTotal ?? 0).toFixed?.(2) || data.yearlyTotal || 0));
        setRecent((data.recent || []).map(r => ({ ...r, date: new Date(r.date) })));
      } catch (_) {
        // ignore for now
      }
    };

    loadUserStats();
    const refresh = () => loadUserStats();
    window.addEventListener('groups:refresh', refresh);
    return () => window.removeEventListener('groups:refresh', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex-1 container mx-auto px-6 py-8"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <motion.h1 variants={itemVariants} className="text-4xl font-extrabold tracking-tight text-emerald-950">
              Dashboard
            </motion.h1>
            <motion.p variants={itemVariants} className="text-slate-500">Welcome back! Here's your summary.</motion.p>
          </div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-xl font-medium border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={() => setIsJoinOpen(true)}
            >
              Join Group
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-xl font-medium bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors"
              onClick={() => setIsCreateOpen(true)}
            >
              Create New Group
            </motion.button>
          </motion.div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Total Balance", value: totalBalance, ref: totalRef, color: "text-emerald-950", sub: "Across all groups" },
            { label: "You are owed", value: youAreOwed, ref: owedRef, color: "text-emerald-600", sub: "Positive net across groups" },
            { label: "You owe", value: youOwe, ref: oweRef, color: "text-orange-500", sub: "Outstanding dues across groups" }
          ].map((stat, idx) => (
             <motion.div 
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 120, damping: 12 }}
              className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-slate-100"
            >
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={`text-3xl font-bold ${stat.color}`}>₹</span>
                <span ref={stat.ref} className={`text-3xl font-bold ${stat.color}`}>
                  {Number(stat.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs mt-2 text-slate-400 font-medium">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <motion.div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-slate-100 overflow-hidden" whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-emerald-950">Expense Summary</h2>
                <select className="select select-ghost select-sm focus:bg-transparent">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
              </div>
              <div className="p-8 grid sm:grid-cols-2 gap-6">
                <motion.div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow" whileHover={{ y: -3, scale: 1.005 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
                  <p className="text-sm font-semibold text-emerald-700">Monthly Spending</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">₹{Number(monthlySpending || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </motion.div>
                <motion.div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow" whileHover={{ y: -3, scale: 1.005 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
                  <p className="text-sm font-semibold text-slate-600">Yearly Total</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">₹{Number(yearlyTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </motion.div>
              </div>
              {/* Charts Section */}
              <div className="p-6 border-t border-slate-50">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Spending Trend (Line) */}
                  <motion.div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4" whileHover={{ y: -3, scale: 1.005 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-emerald-950">Spending Trend</h3>
                      <span className="text-xs text-slate-400">Last {spendingTrend.length} activities</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={spendingTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="amount" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} name="Amount" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Totals (Bar) */}
                  <motion.div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4" whileHover={{ y: -3, scale: 1.005 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-emerald-950">Totals</h3>
                      <span className="text-xs text-slate-400">Monthly vs Yearly</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={totalsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="value" name="₹" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* Balance Breakdown (Pie) */}
                <div className="grid grid-cols-1 mt-6">
                  <motion.div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4" whileHover={{ y: -3, scale: 1.005 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-emerald-950">Balance Breakdown</h3>
                      <span className="text-xs text-slate-400">Owed vs Owe</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Pie data={balanceData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} label>
                            {balanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-slate-100" whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-emerald-950">Recent Activity</h2>
              </div>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <p className="text-slate-500 font-medium">No recent activity</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recent.map((r, i) => (
                    <li key={i} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{r.groupName}</div>
                        <div className="text-xs text-slate-500">{r.date.toLocaleDateString()} {r.currency || 'INR'}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-700">₹{Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.main>

      {/* Modals remain the same logic-wise */}
      <CreateGroupModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(group) => {
          const id = group?._id || group?.id;
          const name = group?.name || 'New Group';
          setInviteInfo({ id, name });
          setIsCreateOpen(false);
          window.dispatchEvent(new CustomEvent('groups:refresh'));
        }}
      />
      <JoinGroupModal
        open={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoined={() => {
          setIsJoinOpen(false);
          window.dispatchEvent(new CustomEvent('groups:refresh'));
        }}
      />
      <InviteQRModal
        open={!!inviteInfo}
        groupId={inviteInfo?.id}
        groupName={inviteInfo?.name}
        onClose={() => setInviteInfo(null)}
      />
    </div>
  );
}