import { useState, useEffect } from "react";
import axios from "axios";

export default function GroupPaymentFlow({ groupId }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [poolStatus, setPoolStatus] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  const loadGroup = async () => {
    try {
      const res = await axios.get(`${API_BASE}/groups/${groupId}`, {
        withCredentials: true,
      });
      setGroup(res.data.group);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load group:", err);
      setLoading(false);
    }
  };

  const handleCreatePaymentIntent = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/groups/${groupId}/create-payment-intent`,
        { totalAmount: group.poolAmount, numParticipants: 3 },
        { withCredentials: true },
      );
      setPaymentUrl(res.data.poolUrl);
      loadGroup();
    } catch (err) {
      console.error("Failed to create payment intent:", err);
      alert("Error creating payment intent: " + err.response?.data?.message);
    }
  };

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert("Please enter a valid contribution amount");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/groups/${groupId}/contribute`,
        { contributionAmount: parseFloat(contributionAmount) },
        { withCredentials: true },
      );
      setPaymentUrl(res.data.paymentUrl);
      setContributionAmount("");
      loadGroup();
    } catch (err) {
      console.error("Failed to register contribution:", err);
      alert("Error: " + err.response?.data?.message);
    }
  };

  const handleVerifyPool = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/groups/${groupId}/verify-pool`,
        {},
        { withCredentials: true },
      );
      setPoolStatus(res.data);
      loadGroup();
    } catch (err) {
      console.error("Failed to verify pool:", err);
      alert("Error: " + err.response?.data?.message);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  if (loading) {
    return <div className="text-center py-8">Loading group...</div>;
  }

  if (!group) {
    return <div className="alert alert-error">Group not found</div>;
  }

  const totalContributions =
    group.participants?.reduce((sum, p) => sum + (p.depositAmount || 0), 0) ||
    0;

  const contributorsCount =
    group.participants?.filter((p) => p.depositAmount > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
        <div className="card-body">
          <h1 className="card-title text-2xl">{group.name}</h1>
          <p className="opacity-90">{group.description}</p>
        </div>
      </div>

      {/* Pool Status Card */}
      <div className="card bg-white shadow">
        <div className="card-body">
          <h2 className="card-title mb-4">💰 Pool Status</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm opacity-70">Pool Target</p>
              <p className="text-2xl font-bold">
                {group.poolAmount} {group.currency}
              </p>
            </div>
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm opacity-70">Total Contributed</p>
              <p className="text-2xl font-bold text-success">
                {totalContributions} {group.currency}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <p className="text-sm mb-2">
              Progress:{" "}
              {((totalContributions / group.poolAmount) * 100).toFixed(0)}%
            </p>
            <progress
              className="progress progress-success w-full"
              value={totalContributions}
              max={group.poolAmount}
            />
          </div>

          <div
            className="badge badge-lg"
            style={{ backgroundColor: "rgb(34, 197, 94)" }}
          >
            {group.paymentStatus || "AWAITING_CONTRIBUTIONS"}
          </div>

          {poolStatus && (
            <div className="mt-4 p-3 bg-info bg-opacity-10 rounded-lg text-sm">
              <p>
                <strong>Status:</strong> {poolStatus.intentStatus || "Unknown"}
              </p>
              <p>
                <strong>Funded:</strong> {poolStatus.percentageFunded}%
              </p>
              {poolStatus.message && (
                <p className="text-success font-semibold">
                  {poolStatus.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Intent Section */}
      {!group.finternetIntentId && (
        <div className="card bg-warning bg-opacity-20 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg">
              ⚠️ Step 1: Initialize Payment Pool
            </h3>
            <p className="text-sm mb-4">
              The group admin needs to create the shared escrow pool first.
            </p>
            <button
              className="btn btn-warning w-full"
              onClick={handleCreatePaymentIntent}
            >
              Create Payment Intent
            </button>
          </div>
        </div>
      )}

      {/* Contribution Section */}
      {group.finternetIntentId && (
        <div className="card bg-white shadow">
          <div className="card-body">
            <h3 className="card-title text-lg">
              💳 Step 2: Register Your Contribution
            </h3>

            <div className="form-control gap-3">
              <input
                type="number"
                placeholder="Enter your contribution amount"
                className="input input-bordered"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
              />

              <button className="btn btn-primary" onClick={handleContribute}>
                Register Contribution
              </button>
            </div>

            {/* Participants List */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">
                Participants ({contributorsCount})
              </h4>
              <div className="space-y-2">
                {group.participants?.map((p) => (
                  <div
                    key={p.user}
                    className="flex justify-between items-center p-2 bg-base-200 rounded"
                  >
                    <span className="text-sm">{p.user}</span>
                    <div className="text-right">
                      <span className="font-semibold">
                        {p.depositAmount || 0} {group.currency}
                      </span>
                      {p.deposited && (
                        <span className="badge badge-success badge-sm ml-2">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Section */}
      {paymentUrl && (
        <div className="card bg-success bg-opacity-20 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg">✅ Step 3: Complete Payment</h3>
            <p className="text-sm mb-4">
              Share this payment link with all participants. Everyone uses the
              SAME link to contribute to the shared pool.
            </p>

            <div className="bg-white p-4 rounded-lg border-2 border-success mb-4 break-all text-xs font-mono">
              {paymentUrl}
            </div>

            <button
              className="btn btn-success w-full gap-2"
              onClick={() => window.open(paymentUrl, "_blank")}
            >
              <span>💰</span> Go to Payment Page
            </button>
          </div>
        </div>
      )}

      {/* Verify Pool Section */}
      {group.finternetIntentId && (
        <div className="card bg-white shadow">
          <div className="card-body">
            <h3 className="card-title text-lg">
              🔍 Step 4: Verify Pool Status
            </h3>
            <p className="text-sm mb-4">
              Check if all participants have completed their payments.
            </p>

            <button className="btn btn-info w-full" onClick={handleVerifyPool}>
              Check Pool Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
