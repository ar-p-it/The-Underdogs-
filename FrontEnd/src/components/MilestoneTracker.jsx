import { useState, useEffect } from "react";
import axios from "axios";

export default function MilestoneTracker({ groupId }) {
  const [group, setGroup] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    description: "",
    amount: "",
    percentage: "",
    index: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [distributions, setDistributions] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  const loadGroup = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`, {
        withCredentials: true,
      });
      setGroup(res.data.group);
      setMilestones(res.data.group.milestones || []);
      setDistributions(res.data.group.distributions || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load group:", err);
      setLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (
      !newMilestoneForm.description ||
      (!newMilestoneForm.amount && !newMilestoneForm.percentage)
    ) {
      alert("Please fill in description and either amount or percentage");
      return;
    }

    try {
      // First, create milestone via Finternet API
      const milestoneData = {
        milestoneIndex: newMilestoneForm.index,
        description: newMilestoneForm.description,
        amount:
          newMilestoneForm.amount ||
          (group.poolAmount * newMilestoneForm.percentage) / 100,
        percentage:
          newMilestoneForm.percentage ||
          (newMilestoneForm.amount * 100) / group.poolAmount,
      };

      const finternetRes = await axios.post(
        `${API_BASE}/groups/${groupId}/create-milestone`,
        { milestones: [milestoneData] },
        { withCredentials: true },
      );

      alert("Milestone created successfully!");
      setNewMilestoneForm({
        description: "",
        amount: "",
        percentage: "",
        index: newMilestoneForm.index + 1,
      });
      setShowForm(false);
      loadGroup();
    } catch (err) {
      console.error("Failed to create milestone:", err);
      alert("Error: " + err.response?.data?.message);
    }
  };

  const handleReleaseMilestone = async (milestoneId, index) => {
    if (!window.confirm(`Release funds from milestone ${index}?`)) return;

    try {
      const res = await axios.post(
        `${API_BASE}/groups/${groupId}/release-milestone`,
        { milestoneId, milestoneIndex: index },
        { withCredentials: true },
      );

      alert(
        `✅ Released ${res.data.milestone.totalReleased} - ${res.data.milestone.perUserAmount} per participant`,
      );
      loadGroup();
    } catch (err) {
      console.error("Failed to release milestone:", err);
      alert("Error: " + err.response?.data?.message);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  if (loading) {
    return <div className="text-center py-8">Loading milestones...</div>;
  }

  if (!group) {
    return <div className="alert alert-error">Group not found</div>;
  }

  const statusColor = {
    PENDING: "badge-warning",
    COMPLETED: "badge-info",
    RELEASED: "badge-success",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-2xl">📊 Milestone Management</h2>
          <p>
            Group: <strong>{group.name}</strong> • Pool:{" "}
            <strong>
              {group.poolAmount} {group.currency}
            </strong>
          </p>
        </div>
      </div>

      {/* Create Milestone Section */}
      <div className="card bg-white shadow">
        <div className="card-body">
          <h3 className="card-title mb-4">➕ Create Milestone</h3>

          {!showForm ? (
            <button
              className="btn btn-primary w-full"
              onClick={() => setShowForm(true)}
            >
              Add New Milestone
            </button>
          ) : (
            <div className="form-control gap-4">
              <input
                type="text"
                placeholder="Milestone description (e.g., Phase 1 - Foundation)"
                className="input input-bordered"
                value={newMilestoneForm.description}
                onChange={(e) =>
                  setNewMilestoneForm({
                    ...newMilestoneForm,
                    description: e.target.value,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered"
                  value={newMilestoneForm.amount}
                  onChange={(e) =>
                    setNewMilestoneForm({
                      ...newMilestoneForm,
                      amount: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Percentage %"
                  className="input input-bordered"
                  value={newMilestoneForm.percentage}
                  onChange={(e) =>
                    setNewMilestoneForm({
                      ...newMilestoneForm,
                      percentage: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="btn btn-success flex-1"
                  onClick={handleCreateMilestone}
                >
                  Create Milestone
                </button>
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestones List */}
      <div className="card bg-white shadow">
        <div className="card-body">
          <h3 className="card-title mb-4">
            🎯 Milestones ({milestones.length})
          </h3>

          {milestones.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No milestones created yet
            </p>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div
                  key={milestone.finternetMilestoneId}
                  className="p-4 border border-base-300 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg">
                        Milestone {milestone.index}
                      </p>
                      <p className="text-sm opacity-70">
                        {milestone.description}
                      </p>
                    </div>
                    <div
                      className={`badge badge-lg ${statusColor[milestone.status]}`}
                    >
                      {milestone.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 my-3 text-sm">
                    <div className="bg-base-200 p-2 rounded">
                      <p className="opacity-70">Amount</p>
                      <p className="font-bold">
                        {milestone.amount} {group.currency}
                      </p>
                    </div>
                    <div className="bg-base-200 p-2 rounded">
                      <p className="opacity-70">Percentage</p>
                      <p className="font-bold">
                        {milestone.percentage ||
                          ((milestone.amount / group.poolAmount) * 100).toFixed(
                            1,
                          )}
                        %
                      </p>
                    </div>
                    <div className="bg-base-200 p-2 rounded">
                      <p className="opacity-70">Per User</p>
                      <p className="font-bold">
                        {(milestone.amount / group.participants.length).toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  </div>

                  {milestone.status === "PENDING" && (
                    <button
                      className="btn btn-success btn-sm w-full"
                      onClick={() =>
                        handleReleaseMilestone(
                          milestone.finternetMilestoneId,
                          milestone.index,
                        )
                      }
                    >
                      💰 Release Funds
                    </button>
                  )}

                  {milestone.status === "RELEASED" && (
                    <div className="text-sm text-success font-semibold">
                      ✅ Released on{" "}
                      {new Date(milestone.releasedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distributions Summary */}
      {distributions.length > 0 && (
        <div className="card bg-white shadow">
          <div className="card-body">
            <h3 className="card-title mb-4">📈 Distribution History</h3>

            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Released</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((dist, idx) => (
                    <tr key={idx}>
                      <td>#{dist.milestoneIndex}</td>
                      <td className="font-mono text-xs">
                        {dist.user?.slice(-6)}
                      </td>
                      <td className="font-bold">{dist.amount}</td>
                      <td>
                        <span className={`badge ${statusColor[dist.status]}`}>
                          {dist.status}
                        </span>
                      </td>
                      <td className="text-sm">
                        {dist.releasedAt
                          ? new Date(dist.releasedAt).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pool Summary */}
      <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow">
        <div className="card-body">
          <h3 className="card-title">💡 Quick Summary</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm opacity-90">Total Pool</p>
              <p className="text-2xl font-bold">{group.poolAmount}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Allocated in Milestones</p>
              <p className="text-2xl font-bold">
                {milestones.reduce((sum, m) => sum + m.amount, 0)}
              </p>
            </div>
          </div>
          <p className="text-sm mt-4 opacity-90">
            Status: <span className="font-bold">{group.paymentStatus}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
