import { useState } from "react";
import axios from "axios";

export default function GroupPaymentFlow({ groupId, poolAmount, numParticipants }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [intentId, setIntentId] = useState("");
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7777";

  const handleCreateIntent = async () => {
    const total = parseInt(poolAmount, 10);
    const count = parseInt(numParticipants, 10);
    if (!total || total <= 0 || !count || count <= 0) {
      setError("Pool amount and participant count must be derived from expenses.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[Frontend] Creating payment intent...");
      const response = await axios.post(
        `${API_BASE}/groups/${groupId}/create-payment-intent`,
        {
          totalAmount: total,
          numParticipants: count,
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

  const handleCreateNewIntent = () => {
    setStep(1);
    setIntentId("");
    setPaymentUrl("");
    setError("");
  };

  return (
    <div
      style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}
    >
      <h2>🏊 Group Payment Pool</h2>

      {/* Step 1: Create Intent (values derived from props) */}
      {step === 1 && (
        <div>
          <h3>Step 1: Initialize Payment Pool</h3>
          <div style={{ marginBottom: "10px" }}>
            <strong>Total Pool Amount (derived): </strong>
            <span style={{ marginLeft: 6 }}>{poolAmount}</span>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Number of Participants (derived): </strong>
            <span style={{ marginLeft: 6 }}>{numParticipants}</span>
          </div>
          {error && (
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}
          <button
            onClick={handleCreateIntent}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#007bff",
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
            onClick={() => window.open(paymentUrl, "_blank")}
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
