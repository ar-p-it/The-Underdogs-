import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { useMemo } from "react";
import InviteQRModal from "../components/InviteQRModal";
import { motion } from "framer-motion";

export default function MyGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteGroup, setInviteGroup] = useState(null);
  const userId = useSelector((s) => s.auth?.user?._id);
  const userEmail = useSelector((s) => s.auth?.user?.emailId);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  const loadGroups = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/groups/my`, {
        withCredentials: true,
      });
      setGroups(res.data?.groups || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    const handler = () => loadGroups();
    window.addEventListener("groups:refresh", handler);
    return () => window.removeEventListener("groups:refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  const visibleGroups = useMemo(() => {
    // If userId isn't hydrated yet, rely on backend scoping and show what we have
    if (!userId) return groups;
    return (groups || []).filter((g) => {
      const adminId = g?.admin?._id || g?.admin;
      const isAdmin = adminId && String(adminId) === String(userId);
      const isParticipant =
        Array.isArray(g.participants) &&
        g.participants.some((p) => {
          const pid = p?.user?._id || p?.user;
          return pid && String(pid) === String(userId);
        });
      return isAdmin || isParticipant;
    });
  }, [groups, userId]);

  return (
    <div className="min-h-screen bg-white text-black flex">
      <Sidebar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">My Groups</h1>
          {userEmail && (
            <div className="text-sm text-gray-600">
              Signed in as <span className="font-medium">{userEmail}</span>
            </div>
          )}
        </div>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {visibleGroups.map((g) => (
            <motion.div
              key={g._id}
              className="card border-t bg-white shadow-md hover:shadow-lg transition-shadow"
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
            >
              <div className="card-body ">
                <div className="flex items-center justify-between ">
                  <h2 className="card-title">{g.name}</h2>
                </div>
                <div className="mt-2">
                  <p className="opacity-70">
                    {g.description || "No description"}
                  </p>
                  <div className="mt-2 text-sm opacity-70">
                    Deposit per person: {g.depositAmountPerPerson} {g.currency}
                  </div>
                  <div className="mt-1 text-sm opacity-70">
                    Status: {g.status}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Admin: {String(g.admin)}
                  </div>
                  <div className="mt-3">
                    <Link
                      to={`/groups/${g._id}`}
                      className="btn btn-primary bg-emerald-500 border-none"
                    >
                      Open Group
                    </Link>
                    <button
                      type="button"
                      className="btn ml-2"
                      onClick={() => {
                        setInviteGroup(g);
                        setShowInvite(true);
                      }}
                      title="Show invite link and QR"
                    >
                      Invite Link
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {!loading && visibleGroups.length === 0 && (
            <div className="text-base-content/70">
              No groups yet — create or join one!
            </div>
          )}
        </div>
        {/* Invite Link Modal */}
        <InviteQRModal
          open={showInvite}
          groupId={inviteGroup?._id}
          groupName={inviteGroup?.name}
          onClose={() => {
            setShowInvite(false);
            setInviteGroup(null);
          }}
        />
      </main>
    </div>
  );
}
