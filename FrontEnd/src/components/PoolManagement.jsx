import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaLock,
  FaUnlock,
  FaFlag,
  FaCheckCircle,
  FaHourglassHalf,
  FaCoins,
} from "react-icons/fa";

export default function PoolManagement({ groupId }) {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  // See note in GroupLedger.jsx: ESLint may miss JSX member-expression usage.
  const _motion = motion;

  const [pool, setPool] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [newMilestone, setNewMilestone] = useState("");
  const [releasePercent, setReleasePercent] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPoolData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Get pool by group ID
      const poolRes = await axios.get(`${API_BASE}/pools/group/${groupId}`, {
        withCredentials: true,
      });

      const poolData = poolRes.data?.pool;

      if (poolData) {
        setPool(poolData);

        // Load milestones
        if (poolData?._id) {
          const milestonesRes = await axios.get(
            `${API_BASE}/pools/${poolData._id}/milestones`,
            { withCredentials: true },
          );
          setMilestones(milestonesRes.data?.milestones || []);
        }
      } else {
        setError("Pool not found. Please create a payment intent first.");
        setPool(null);
      }
    } catch (e) {
      console.error("Error loading pool:", e);

      // If 404, pool doesn't exist yet
      if (e.response?.status === 404) {
        setError(
          "Pool not created yet. Initialize a payment intent to create a pool.",
        );
        setPool(null);
        setMilestones([]);
      } else {
        setError(e?.response?.data?.message || "Failed to load pool data");
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE, groupId]);

  // Load pool data
  useEffect(() => {
    loadPoolData();

    // Listen for pool updates from payment
    const handlePoolUpdate = () => {
      loadPoolData();
    };

    window.addEventListener("poolUpdated", handlePoolUpdate);
    return () => window.removeEventListener("poolUpdated", handlePoolUpdate);
  }, [loadPoolData]);

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!pool) {
      setError("Pool not initialized yet");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await axios.post(
        `${API_BASE}/pools/${pool._id}/milestones`,
        {
          title: newMilestone,
          description,
          releasePercent: Number(releasePercent),
        },
        { withCredentials: true },
      );

      setMilestones((prev) => [res.data?.milestone, ...prev]);
      setNewMilestone("");
      setReleasePercent("");
      setDescription("");
      setSuccessMsg("Milestone created successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId) => {
    if (!pool) return;

    setError("");
    try {
      await axios.post(
        `${API_BASE}/pools/${pool._id}/milestones/${milestoneId}/complete`,
        {},
        { withCredentials: true },
      );
      await loadPoolData();
      setSuccessMsg("Milestone completed! Funds released.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to complete milestone");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="animate-pulse">Loading pool management...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="alert alert-error shadow-lg"
          >
            <span>{error}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="alert alert-success shadow-lg"
          >
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!pool && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 shadow-lg"
        >
          <div className="card-body">
            <h2 className="card-title text-yellow-900 text-lg">
              ⚠️ No Pool Data
            </h2>
            <p className="text-yellow-800">
              Create a payment intent in the Payment Pool section above to
              initialize the pool and start managing milestones.
            </p>
          </div>
        </motion.div>
      )}

      {/* Pool Overview Card */}
      {pool && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-white shadow-xl border border-emerald-100"
        >
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6 text-slate-800">💰 Pool Management</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Pool Amount */}
              <div className="flex flex-col bg-white p-4 rounded-lg border border-emerald-100">
                <span className="text-sm text-slate-600 font-semibold">
                  Total Pool
                </span>
                <span className="text-3xl font-bold flex items-center gap-2 mt-2 text-slate-800">
                  <FaCoins className="text-emerald-500" />
                  {pool.totalAmount}
                </span>
                <span className="text-xs text-slate-500">{pool.currency}</span>
              </div>

              {/* Contributors */}
              <div className="flex flex-col bg-white p-4 rounded-lg border border-emerald-100">
                <span className="text-sm text-slate-600 font-semibold">
                  Contributors
                </span>
                <span className="text-3xl font-bold mt-2 text-slate-800">
                  {pool.contributions?.length || 0}
                </span>
              </div>

              {/* Released Amount */}
              <div className="flex flex-col bg-white p-4 rounded-lg border border-emerald-100">
                <span className="text-sm text-slate-600 font-semibold">
                  Released
                </span>
                <span className="text-3xl font-bold text-emerald-600 mt-2">
                  {pool.releasedAmount || 0}
                </span>
                <span className="text-xs text-slate-500">{pool.currency}</span>
              </div>

              {/* Locked Amount */}
              <div className="flex flex-col bg-white p-4 rounded-lg border border-emerald-100">
                <span className="text-sm text-slate-600 font-semibold">Locked</span>
                <span className="text-3xl font-bold text-red-500 mt-2">
                  {(pool.totalAmount - (pool.releasedAmount || 0)).toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">{pool.currency}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-2 text-slate-700">
                <span className="font-semibold">Release Progress</span>
                <span className="font-bold text-slate-800">
                  {Math.round(
                    ((pool.releasedAmount || 0) / pool.totalAmount) * 100,
                  )}
                  %
                </span>
              </div>
              <progress
                className="progress w-full h-2 accent-black"
                value={pool.releasedAmount || 0}
                max={pool.totalAmount}
              ></progress>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Milestone Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-white shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition-all"
      >
        <div className="card-body">
          <h2 className="card-title text-slate-800 flex items-center gap-3 mb-5">
            <FaFlag className="text-emerald-500 text-xl" />
            Create Milestone
          </h2>

          <form onSubmit={handleAddMilestone} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-slate-700">
                    Milestone Title
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white"
                  placeholder="e.g., Phase 1 Complete"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-slate-700">
                    Release % of Pool
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input input-bordered bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white"
                  placeholder="25"
                  value={releasePercent}
                  onChange={(e) => setReleasePercent(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-slate-700">
                    Description
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white"
                  placeholder="Optional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none gap-2"
              >
                <FaFlag /> {submitting ? "Adding..." : "Add Milestone"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Milestones List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-white shadow-lg transition-all"
      >
        <div className="card-body">
          <h2 className="card-title text-slate-800 mb-5 flex items-center gap-3">
            <FaCheckCircle className="text-green-500 text-xl" />
            Milestones ({milestones.length})
          </h2>

          <div className="space-y-4">
            <AnimatePresence>
              {milestones.length === 0 ? (
                <motion.div
                  key="no-milestones"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-10 text-slate-400"
                >
                  <FaHourglassHalf className="mx-auto text-3xl mb-3 opacity-50" />
                  <p>
                    No milestones yet. Create one to lock and release funds!
                  </p>
                </motion.div>
              ) : (
                milestones.map((m) => (
                  <motion.div
                    key={m._id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-5 rounded-xl shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {m.status === "COMPLETED" ? (
                            <FaUnlock className="text-green-500 text-lg" />
                          ) : (
                            <FaLock className="text-amber-500 text-lg" />
                          )}
                          <h3 className="font-bold text-slate-800 text-lg">
                            {m.title}
                          </h3>
                        </div>

                        {m.description && (
                          <p className="text-sm text-slate-600 mb-3">
                            {m.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                            Release: {m.releasePercent}%
                          </span>
                          {m.status === "COMPLETED" ? (
                            <span className="text-green-600 font-bold flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                              <FaCheckCircle /> Completed
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold flex items-center gap-1 bg-amber-100 px-3 py-1 rounded-full">
                              <FaHourglassHalf /> Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {m.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleCompleteMilestone(m._id)}
                          className="btn btn-sm bg-green-500 hover:bg-green-600 text-white border-none"
                        >
                          <FaCheckCircle /> Complete
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Contributions Breakdown */}
      {pool?.contributions && pool.contributions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-white shadow-lg transition-all"
        >
          <div className="card-body">
            <h2 className="card-title text-slate-800 mb-5 flex items-center gap-3">
              <FaCoins className="text-blue-500 text-xl" />
              Contributions
            </h2>
            <div className="space-y-3">
              {pool.contributions.map((c) => (
                <motion.div
                  key={c.userId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-slate-800">
                    {c.userName}
                  </span>
                  <span className="font-bold text-blue-600 text-lg">
                    {c.amount} {pool.currency}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
