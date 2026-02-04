import { useState, useEffect, useRef } from 'react';
import { SignOutButton } from '@clerk/clerk-react';
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';

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

  // Refs for GSAP number animations
  const totalRef = useRef(null);
  const owedRef = useRef(null);
  const oweRef = useRef(null);

  useEffect(() => {
    // Example GSAP counter animation
    // Even if values are 0, this creates a "loading" feel
    const tl = gsap.timeline();
    tl.fromTo([totalRef.current, owedRef.current, oweRef.current], 
      { innerText: 0 }, 
      { 
        innerText: (i) => [0, 0, 0][i], // Replace with real data values
        duration: 1.5, 
        snap: { innerText: 0.01 },
        stagger: 0.2,
        ease: "power3.out",
        onUpdate: function() {
          // Optional: format as currency during update
        }
      }
    );
  }, []);

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
            { label: "Total Balance", ref: totalRef, color: "text-emerald-950", sub: "All settled up!" },
            { label: "You are owed", ref: owedRef, color: "text-emerald-600", sub: "+$0.00 this week" },
            { label: "You owe", ref: oweRef, color: "text-orange-500", sub: "-$0.00 pending" }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
            >
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={`text-3xl font-bold ${stat.color}`}>$</span>
                <span ref={stat.ref} className={`text-3xl font-bold ${stat.color}`}>0.00</span>
              </div>
              <p className="text-xs mt-2 text-slate-400 font-medium">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-emerald-950">Expense Summary</h2>
                <select className="select select-ghost select-sm focus:bg-transparent">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
              </div>
              <div className="p-8 grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-sm font-semibold text-emerald-700">Monthly Spending</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">$0.00</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-600">Yearly Total</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">$0.00</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-emerald-950">Balance Details</h2>
                <button className="text-emerald-600 text-sm font-semibold hover:underline">View all</button>
              </div>
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <p className="text-slate-500 font-medium">No recent activity</p>
              </div>
            </div>
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