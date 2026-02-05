import { useEffect, useState } from "react";
import axios from "axios";

export default function GroupPaymentFlow({
  groupId,
  initialPoolAmount,
  initialNumParticipants,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [poolAmount, setPoolAmount] = useState("");
  const [numParticipants, setNumParticipants] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [intentId, setIntentId] = useState("");
  const [error, setError] = useState("");
  const [poolId, setPoolId] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  useEffect(() => {
    if (initialPoolAmount !== undefined && initialPoolAmount !== null) {
      setPoolAmount(String(initialPoolAmount));
    }
    if (
      initialNumParticipants !== undefined &&
      initialNumParticipants !== null
    ) {
      setNumParticipants(String(initialNumParticipants));
    }
    // only initialize once from props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateIntent = async () => {
    const total = Number(poolAmount);
    const count = Number(numParticipants);
    if (!Number.isFinite(total) || total <= 0) {
      setError("Please enter a valid total pool amount");
      return;
    }
    if (!Number.isFinite(count) || count <= 0) {
      setError("Please enter a valid number of participants");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[Frontend] Creating payment intent...");
      const response = await axios.post(
        `${API_BASE}/groups/${groupId}/create-payment-intent`,
        {
          totalAmount: Math.floor(total),
          numParticipants: Math.floor(count),
          timestamp: Date.now(),
        },
        { withCredentials: true },
      );

      console.log("[Frontend] Intent created:", response.data);
      setIntentId(response.data.intentId);
      setPaymentUrl(response.data.poolUrl);
      setStep(2);
    } catch (err) {
      console.error("[Frontend Error]", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to create intent");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Get pool by group ID
      const poolRes = await axios.get(`${API_BASE}/pools/group/${groupId}`, {
        withCredentials: true,
      });

      const pool = poolRes.data?.pool;
      setPoolId(pool?._id);

      // Add contribution to pool
      if (pool?._id) {
        await axios.post(
          `${API_BASE}/pools/${pool._id}/contribute`,
          {
            amount: Number(poolAmount),
            paymentIntentId: intentId,
          },
          { withCredentials: true },
        );

        console.log("[Frontend] Contribution recorded to pool");

        // Dispatch event to notify pool management component
        window.dispatchEvent(new CustomEvent("poolUpdated"));
      }
    } catch (err) {
      console.error("[Frontend] Contribution error:", err);
      // Don't block payment flow if contribution recording fails
    }
  };

  const handleCreateNewIntent = () => {
    setStep(1);
    setError("");
    setIntentId("");
    setPaymentUrl("");
  };

  return (
    <div
      style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}
    >
      <h2>🏊 Group Payment Pool</h2>

      {/* Step 1: Create Intent */}
      {step === 1 && (
        <div>
          <h3>Step 1: Initialize Payment Pool</h3>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Total Pool Amount
            </label>
            <input
              type="number"
              value={poolAmount}
              onChange={(e) => setPoolAmount(e.target.value)}
              placeholder="e.g., 6000"
              style={{ padding: "5px", width: "220px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Number of Participants
            </label>
            <input
              type="number"
              value={numParticipants}
              onChange={(e) => setNumParticipants(e.target.value)}
              placeholder="e.g., 3"
              style={{ padding: "5px", width: "220px" }}
            />
          </div>
          {error && (
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}
          <button
            onClick={handleCreateIntent}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "var(--color-emerald-600)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create Payment Intent"}
          </button>
        </div>
      )}

      {/* Step 2: Show Payment URL */}
      {step === 2 && (
        <div
          style={{
            backgroundColor: "#f0f8ff",
            padding: "15px",
            borderRadius: "4px",
          }}
        >
          <h3>✅ Payment Intent Created!</h3>
          <div style={{ marginBottom: "10px" }}>
            <strong>Intent ID:</strong>
            <code
              style={{
                display: "block",
                wordBreak: "break-all",
                marginTop: "5px",
              }}
            >
              {intentId}
            </code>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Payment URL (Share with all participants):</strong>
            <code
              style={{
                display: "block",
                wordBreak: "break-all",
                marginTop: "5px",
              }}
            >
              {paymentUrl}
            </code>
          </div>

          <button
            onClick={() => {
              handlePaymentSuccess();
              window.open(paymentUrl, "_blank");
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Open Payment Page
          </button>

          <button
            onClick={() => navigator.clipboard.writeText(paymentUrl)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Copy Link
          </button>

          <button
            onClick={handleCreateNewIntent}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Create New Intent
          </button>
        </div>
      )}
    </div>
  );
}
