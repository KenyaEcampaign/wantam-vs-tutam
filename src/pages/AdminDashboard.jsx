import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);

  const loadPayments = async () => {
    const { data, error } = await supabase
      .from("payment_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    const pending = (data || []).filter(
      (p) => p.status === "pending" || !p.status
    );

    const approved = (data || []).filter(
      (p) => p.status === "approved"
    );

    const rejected = (data || []).filter(
      (p) => p.status === "rejected"
    );

    setPayments([
      ...pending,
      ...approved,
      ...rejected,
    ]);
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/admin";
        return;
      }
    };

    checkUser();
    loadPayments();
  }, []);

  const approvePayment = async (payment) => {
    if (payment.status === "approved") {
      alert("Already approved");
      return;
    }

    const confirmed = window.confirm(
      `Approve KSh ${payment.amount} for ${payment.candidate}?`
    );

    if (!confirmed) return;

    const voteRows = [];

    for (let i = 0; i < payment.votes; i++) {
      voteRows.push({
        option_name: payment.candidate,
      });
    }

    const { error } = await supabase
      .from("votes")
      .insert(voteRows);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
.from("payment_submissions")
.update({
  status: "approved",
  approved_votes: payment.votes,
  approved_at: new Date().toISOString(),
})
.eq("id", payment.id);

    alert("Payment Approved");

    loadPayments();
  };

  const rejectPayment = async (payment) => {
    if (payment.status === "rejected") {
      alert("Already rejected");
      return;
    }

    const confirmed = window.confirm(
      `Reject payment ${payment.payment_ref}?`
    );

    if (!confirmed) return;

    await supabase
      .from("payment_submissions")
      .update({
        status: "rejected",
      })
      .eq("id", payment.id);

    alert("Payment Rejected");

    loadPayments();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  };

  return (
    <div
      style={{
        padding: 30,
        background: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
        }}
      >
        <h1>🇰🇪 Kenya eCampaign Admin</h1>

        <button
          onClick={logout}
          style={{
            background: "#d32f2f",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#0b3d2e",
                color: "white",
              }}
            >
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Reference</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Votes</th>
              <th style={thStyle}>M-Pesa Code</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                style={{
                  background:
                    payment.status === "approved"
                      ? "#e8f5e9"
                      : payment.status === "rejected"
                      ? "#ffebee"
                      : "#fffde7",
                }}
              >
                <td style={tdStyle}>{payment.id}</td>

                <td style={tdStyle}>
                  <b>{payment.payment_ref}</b>
                </td>

                <td style={tdStyle}>
                  {payment.candidate}
                </td>

                <td style={tdStyle}>
                  KSh {payment.amount}
                </td>

                <td style={tdStyle}>
                  {payment.votes}
                </td>

                <td style={tdStyle}>
                  {payment.mpesa_code}
                </td>

                <td style={tdStyle}>
                  {payment.status === "approved" && "✅ Approved"}
                  {payment.status === "rejected" && "❌ Rejected"}
                  {(payment.status === "pending" ||
                    !payment.status) &&
                    "⏳ Pending"}
                </td>

                <td style={tdStyle}>
                  {payment.status === "pending" ||
                  !payment.status ? (
                    <>
                      <button
                        onClick={() =>
                          approvePayment(payment)
                        }
                        style={{
                          background: "green",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          marginRight: 5,
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          rejectPayment(payment)
                        }
                        style={{
                          background: "#d32f2f",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <b>
                      {payment.status === "approved"
                        ? "✓ Locked"
                        : "✗ Locked"}
                    </b>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "14px",
  border: "1px solid #ddd",
  textAlign: "left",
};

const tdStyle = {
  padding: "12px",
  border: "1px solid #ddd",
};