import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  FaMoneyBill, 
  FaUsers, 
  FaChartPie, 
  FaBell, 
  FaDivide, 
  FaBolt 
} from "react-icons/fa";
import { motion } from "framer-motion";
import gsap from "gsap";

// --- Animation Variants (Framer Motion) ---
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
};

// --- Data for clean mapping ---
const featuresList = [
  { icon: FaUsers, title: "Group Expenses", desc: "Manage shared costs for trips, dinners, and events." },
  { icon: FaMoneyBill, title: "Smart Settlements", desc: "Automate who owes whom and settle instantly." },
  { icon: FaChartPie, title: "Expense Analytics", desc: "Insights by category, member, and timeline." },
  { icon: FaBell, title: "Payment Reminders", desc: "Never miss a payment with smart nudges." },
  { icon: FaDivide, title: "Multiple Split Types", desc: "Equal, percentage, shares, or custom splits." },
  { icon: FaBolt, title: "Real-time Updates", desc: "See changes instantly across all members." },
];

const stepsList = [
  { step: 1, title: "Create or Join", desc: "Invite friends and set up your shared space." },
  { step: 2, title: "Add Expenses", desc: "Scan bills or add expenses in seconds." },
  { step: 3, title: "Settle Up", desc: "Smart suggestions and instant settlements." },
];

export default function LandingPage() {
  const videoRef = useRef(null);

  // --- GSAP for Continuous Floating Animation ---
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(videoRef.current, {
        y: -15,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-emerald-100">
      
      {/* --- HERO SECTION --- */}
      <section className="container mx-auto px-4 py-16 md:py-24 relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-3xl -z-10 opacity-60" />

        <div className="flex flex-col items-center text-center gap-10">
          
          {/* GSAP Animated Video Container */}
          <div ref={videoRef} className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="p-2 bg-white rounded-3xl shadow-2xl shadow-emerald-200/50"
            >
              <video
                src="/landingvideo.mp4"
                className="w-full max-w-lg rounded-2xl"
                autoPlay
                loop
                muted
                playsInline
              />
            </motion.div>
          </div>

          <motion.div 
            className="max-w-4xl space-y-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-slate-900"
            >
              Don't just track debts. <br />
              <span className="text-emerald-500">Settle them instantly.</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
            >
              The first group expense manager with built-in programmable payments. 
              Pool funds, set rules, and automate settlements effortlessly.
            </motion.p>
            
            <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/signup" 
                className="btn bg-emerald-500 hover:bg-emerald-600 border-none text-white btn-lg rounded-full px-10 shadow-lg shadow-emerald-200"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need</h2>
          <p className="text-slate-500">Powerful features to handle any splitting scenario.</p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {featuresList.map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="card bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-300"
            >
              <div className="card-body">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="text-emerald-600 w-6 h-6" />
                </div>
                <h3 className="card-title text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="bg-emerald-900 text-white py-24 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Splitting expenses has never been easier
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stepsList.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2, duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-emerald-900/50 mb-6"
                >
                  {item.step}
                </motion.div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-emerald-200 max-w-xs">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- BOTTOM CTA --- */}
      <section className="container mx-auto px-4 py-24">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="bg-emerald-50 rounded-[3rem] p-12 text-center border border-emerald-100"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Ready to simplify expense sharing?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust us with their shared finances.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
            <Link 
              to="/signup" 
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none btn-lg px-12 rounded-full text-lg"
            >
              Get Started for Free
            </Link>
          </motion.div>
        </motion.div>
      </section>

    </div>
  );
}