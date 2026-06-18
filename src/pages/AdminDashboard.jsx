import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);

  const [wantamVotes, setWantamVotes] = useState(0);
const [tutamVotes, setTutamVotes] = useState(0);
const [totalRevenue, setTotalRevenue] = useState(0);
const [liveVotes, setLiveVotes] = useState([]);
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

  const loadStats = async () => {
  const { count: wanCount } = await supabase
    .from("votes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("option_name", "WANTAM");

  const { count: tutCount } = await supabase
    .from("votes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("option_name", "TUTAM");

  const { data: approvedPayments } = await supabase
    .from("payment_submissions")
    .select("amount")
    .eq("status", "approved");

  const revenue =
    approvedPayments?.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    ) || 0;

  setWantamVotes(wanCount || 0);
  setTutamVotes(tutCount || 0);
  setTotalRevenue(revenue);
};
const loadLiveVotes = async () => {
  const { data } = await supabase
    .from("votes")
    .select("*")
    .order("id", { ascending: false })
    .limit(10);

  setLiveVotes(data || []);
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

  const voteChannel = supabase
    .channel("admin-live-votes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "votes",
      },
      () => {
        loadStats();
        loadLiveVotes();
      }
    )
    .subscribe();

  checkUser();
  loadStats();
  loadPayments();
  loadLiveVotes();

  return () => {
    supabase.removeChannel(voteChannel);
  };
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

  const totalVotes =
  wantamVotes + tutamVotes;

  const wantamPercent =
  totalVotes > 0
    ? ((wantamVotes / totalVotes) * 100).toFixed(1)
    : 0;

const tutamPercent =
  totalVotes > 0
    ? ((tutamVotes / totalVotes) * 100).toFixed(1)
    : 0;
const leader =
  wantamVotes > tutamVotes
    ? "🇰🇪 WANTAM"
    : tutamVotes > wantamVotes
    ? "🔵 TUTAM"
    : "🤝 TIED";

const pendingCount = payments.filter(
  (p) => p.status === "pending" || !p.status
).length;

const approvedCount = payments.filter(
  (p) => p.status === "approved"
).length;
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
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
    marginBottom: 25,
  }}
>
  <div style={cardStyle}>
    <h3>Total Votes</h3>
    <h1>{totalVotes}</h1>
  </div>

  <div style={cardStyle}>
    <h3>🇰🇪 WANTAM</h3>
    <h1>{wantamVotes}</h1>
  </div>

  <div style={cardStyle}>
    <h3>🔵 TUTAM</h3>
    <h1>{tutamVotes}</h1>
  </div>

  <div style={cardStyle}>
    <h3>Leader</h3>
    <h1>{leader}</h1>
  </div>

  <div style={cardStyle}>
    <h3>Pending Payments</h3>
    <h1>{pendingCount}</h1>
  </div>

  <div style={cardStyle}>
    <h3>Approved Payments</h3>
    <h1>{approvedCount}</h1>
  </div>

  <div style={cardStyle}>
    <h3>Total Revenue</h3>
    <h1>KSh {totalRevenue}</h1>
  </div>
</div>

<div
  style={{
    background: "#0b3d2e",
    color: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: "center",
  }}
>
  <h2>📊 Live Election Dashboard</h2>

  <h1>{leader}</h1>

  <p>
    Total Votes: {totalVotes} | Revenue:
    KSh {totalRevenue} | Pending:
    {pendingCount}
  </p>
</div>
     <div
  style={{
    background: "white",
    borderRadius: 12,
    overflowX: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    width: "100%",
  }}
>
        <table
  style={{
    width: "100%",
    minWidth: "1000px",
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
                          padding: "6px 10px",
fontSize: "12px",
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
                          padding: "6px 10px",
fontSize: "12px",
                          
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

const cardStyle = {
  background: "white",
  padding: 20,
  borderRadius: 12,
  textAlign: "center",
  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
};
const thStyle = {
  padding: "14px",
  border: "1px solid #ddd",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  border: "1px solid #ddd",
  whiteSpace: "nowrap",
};