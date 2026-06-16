import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";

export default function Home() {
  const [wantam, setWantam] = useState(0);
  const [tutam, setTutam] = useState(0);
  const [visitors, setVisitors] = useState(0);
  const [supportAmount, setSupportAmount] = useState("");

  const [mpesaCode, setMpesaCode] = useState("");
 const [selectedCandidate, setSelectedCandidate] = useState("");
const [showPayment, setShowPayment] = useState(false);
const [paymentRef, setPaymentRef] = useState("");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  function Card({ title, children }) {
  return (
    <div
      style={{
        background: "white",
        padding: 15,
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <h4 style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
        {title}
      </h4>
      <h2 style={{ margin: 10 }}>{children}</h2>
    </div>
  );
}

function ResultBar({ label, value, percent, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>{label}</b>
        <span>{percent}% ({value})</span>
      </div>

      <div
        style={{
          height: 14,
          background: "#eee",
          borderRadius: 20,
          overflow: "hidden",
          marginTop: 5,
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function VoteButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "18px 25px",
        borderRadius: 12,
        border: "none",
        background: color,
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        minWidth: 180,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      }}
    >
      {label}
    </button>
  );
}
  // ----------------------------
  // LOAD VOTES (STABLE)
  // ----------------------------
  const loadVotes = useCallback(async () => {
    const { count: wanCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("option_name", "WANTAM");

    const { count: tuCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("option_name", "TUTAM");

    setWantam(wanCount || 0);
    setTutam(tuCount || 0);
  }, []);

  // ----------------------------
  // LOAD VISITORS
  // ----------------------------
  const loadVisitors = useCallback(async () => {
    const { count } = await supabase
      .from("visitors")
      .select("*", { count: "exact", head: true });

    setVisitors(count || 0);
  }, []);

  // ----------------------------
  // SYNC (optional DB totals table)
  // ----------------------------
  const syncVoteTotals = useCallback(async () => {
    const { count: wanCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("option_name", "WANTAM");

    const { count: tuCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("option_name", "TUTAM");

    await supabase
      .from("vote_totals")
      .update({ total_votes: wanCount || 0 })
      .eq("option_name", "WANTAM");

    await supabase
      .from("vote_totals")
      .update({ total_votes: tuCount || 0 })
      .eq("option_name", "TUTAM");
  }, []);

  // ----------------------------
  // VOTE (FIXED + SAFE REFRESH)
  // ----------------------------
  const vote = async (option) => {
    const { error } = await supabase.from("votes").insert([
      { option_name: option },
    ]);

    if (error) return console.log(error);

    await syncVoteTotals();
    await loadVotes();
  };

  // ----------------------------
  // VISITOR TRACKING
  // ----------------------------
  const registerVisitor = useCallback(async () => {
    const alreadyVisited = localStorage.getItem("visited");

    if (!alreadyVisited) {
      await supabase.from("visitors").insert([{}]);
      localStorage.setItem("visited", "true");
    }

    loadVisitors();
  }, [loadVisitors]);

  // ----------------------------
  // EFFECT (REALTIME + FALLBACK FIX)
  // ----------------------------
  useEffect(() => {
    loadVotes();
    loadVisitors();
    registerVisitor();

    // REALTIME (ALL EVENTS FIXED)
    const channel = supabase
      .channel("live-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        async () => {
          await loadVotes();
          await syncVoteTotals();
        }
      )
      .subscribe();

    // 🔥 FALLBACK POLLING (fixes ALL browsers + missed updates)
    const interval = setInterval(() => {
      loadVotes();
      loadVisitors();
    }, 5000);

    // countdown
    const electionDate = new Date("2027-08-10T06:00:00");

    const timer = setInterval(() => {
      const diff = electionDate - new Date();
      if (diff <= 0) return;

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadVotes, loadVisitors, registerVisitor, syncVoteTotals]);

  // ----------------------------
  // COMPUTED VALUES
  // ----------------------------
  const totalVotes = wantam + tutam;

  const wantamPercent =
    totalVotes > 0 ? ((wantam / totalVotes) * 100).toFixed(1) : 0;

  const tutamPercent =
    totalVotes > 0 ? ((tutam / totalVotes) * 100).toFixed(1) : 0;

  const leader =
    wantam > tutam ? "🇰🇪 WANTAM" : tutam > wantam ? "🔵 TUTAM" : "🤝 TIED";

    const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    fontFamily: "Arial, sans-serif",
    color: "#111",
    padding: "20px",
  },

  header: {
    textAlign: "center",
    padding: "20px",
    background: "#0b3d2e",
    color: "white",
    borderRadius: "12px",
  },

  flagTitle: {
    fontSize: "28px",
    fontWeight: "bold",
  },

  subtitle: {
    opacity: 0.9,
  },

  disclaimer: {
    fontSize: "12px",
    opacity: 0.7,
    marginTop: "8px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  card: {
    background: "white",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    textAlign: "center",
  },

  bigText: {
    fontSize: "22px",
  },

  resultsSection: {
    marginTop: "25px",
  },

  sectionTitle: {
    textAlign: "center",
    marginBottom: "15px",
  },

  resultBox: {
    background: "white",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  barBg: {
    height: "12px",
    background: "#eee",
    borderRadius: "10px",
    overflow: "hidden",
  },

  barFillGreen: {
    height: "100%",
    background: "#1b8f3a",
  },

  barFillBlue: {
    height: "100%",
    background: "#1e63ff",
  },

  wantamBtn: {
    marginTop: "10px",
    background: "#1b8f3a",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },

  tutamBtn: {
    marginTop: "10px",
    background: "#1e63ff",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },

  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },

  payBtn: {
    marginTop: "10px",
    width: "100%",
    padding: "12px",
    background: "#f5b301",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  footer: {
    marginTop: "30px",
    textAlign: "center",
    padding: "20px",
    background: "#0b3d2e",
    color: "white",
    borderRadius: "12px",
  },
};

const submitPayment = async () => {
  if (!mpesaCode) {
    alert("Enter M-Pesa Code");
    return;
  }

  const { error } = await supabase
    .from("payment_submissions")
    .insert([
      {
        candidate: selectedCandidate,
        amount: Number(supportAmount),
        votes: Number(supportAmount),
        mpesa_code: mpesaCode,
        payment_ref: paymentRef,
      },
    ]);

  if (error) {
    alert("Failed to save payment");
    return;
  }

  const candidateName =
  selectedCandidate === "WANTAM"
    ? "🇰🇪 WANTAM"
    : "🔵 TUTAM";

const message = `
🇰🇪 KENYA eCAMPAIGN PAYMENT CONFIRMATION

━━━━━━━━━━━━━━━

📌 Candidate Supported:
${candidateName}

💰 Amount Paid:
KSh ${supportAmount}

🗳 Votes Purchased:
${supportAmount}

🔖 Reference Number:
${paymentRef}

📱 M-Pesa Code:
${mpesaCode}

━━━━━━━━━━━━━━━

Please verify this payment and approve the votes.

Thank you.
`;
window.open(
  `https://wa.me/254721830380?text=${encodeURIComponent(message)}`,
  "_blank"
);

  alert("Payment submitted successfully");
};
  // ----------------------------
  // UI
  // ----------------------------
  return (
  <div style={styles.page}>
    
    {/* HEADER */}
    <div style={styles.header}>
      <div style={styles.flagTitle}>
        🇰🇪 <span>Peaceful 2027 Elections</span>
      </div>

      <p style={styles.subtitle}>
        Competition • Youth Empowerment • Democracy
      </p>

      <p style={styles.disclaimer}>
        Unofficial public opinion tracker. Not affiliated with any election body.
      </p>
    </div>

    {/* DASHBOARD CARDS */}
    <div style={styles.grid}>

      <div style={styles.card}>
        <h3>⏳ COUNTDOWN TO 2027 ELECTIONS </h3>
        <h2 style={styles.bigText}>
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </h2>
      </div>

      <div style={styles.card}>
        <h3>🏆 Current Leader</h3>
        <h2 style={styles.bigText}>
          {wantam > tutam ? "🇰🇪 WANTAM" : tutam > wantam ? "🔵 TUTAM" : "🤝 TIED"}
        </h2>
      </div>

      <div style={styles.card}>
        <h3>🗳 Total Votes</h3>
        <h2 style={styles.bigText}>{totalVotes}</h2>
      </div>

      <div style={styles.card}>
        <h3>👥 Visitors</h3>
        <h2 style={styles.bigText}>{visitors}</h2>
      </div>

    </div>

    {/* RESULTS */}
    <div style={styles.resultsSection}>

      <h2 style={styles.sectionTitle}>Live Poll Results</h2>

      {/* WANTAM */}
      <div style={styles.resultBox}>
        <div style={styles.row}>
          <span>🇰🇪 WANTAM</span>
          <b>{wantamPercent}% ({wantam})</b>
        </div>

        <div style={styles.barBg}>
          <div style={{ ...styles.barFillGreen, width: `${wantamPercent}%` }} />
        </div>

        <button style={styles.wantamBtn} onClick={() => vote("WANTAM")}>
          Vote WANTAM
        </button>
      </div>

      {/* TUTAM */}
      <div style={styles.resultBox}>
        <div style={styles.row}>
          <span>🔵 TUTAM</span>
          <b>{tutamPercent}% ({tutam})</b>
        </div>

        <div style={styles.barBg}>
          <div style={{ ...styles.barFillBlue, width: `${tutamPercent}%` }} />
        </div>

        <button style={styles.tutamBtn} onClick={() => vote("TUTAM")}>
          Vote TUTAM
        </button>
      </div>

    </div>

<div style={styles.card}>
  <h2>📢 Share Campaign</h2>

  <button
    onClick={() => {
      navigator.clipboard.writeText(
        window.location.href
      );

      alert("Link copied");
    }}
    style={styles.payBtn}
  >
    Copy Campaign Link
  </button>
</div>
    {/* SUPPORT */}
    <div style={styles.card}>
      <h2>💰 Mass Voting</h2>
      <p>1 Vote = 1 KSh</p>

<h3>Select Candidate</h3>

<div
  style={{
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  }}
>
  <button
    onClick={() => setSelectedCandidate("WANTAM")}
    style={{
      flex: 1,
      padding: "12px",
      background:
        selectedCandidate === "WANTAM"
          ? "#1b8f3a"
          : "#ddd",
      color:
        selectedCandidate === "WANTAM"
          ? "white"
          : "black",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    🇰🇪 WANTAM
  </button>

  <button
    onClick={() => setSelectedCandidate("TUTAM")}
    style={{
      flex: 1,
      padding: "12px",
      background:
        selectedCandidate === "TUTAM"
          ? "#1e63ff"
          : "#ddd",
      color:
        selectedCandidate === "TUTAM"
          ? "white"
          : "black",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    🔵 TUTAM
  </button>
  
</div>
      <input
        type="number"
        placeholder="Enter amount"
        value={supportAmount}
        onChange={(e) => setSupportAmount(e.target.value)}
        style={styles.input}
      />
<h3>
  Estimated Votes: {supportAmount || 0}
</h3>
<button
  style={styles.payBtn}
  onClick={() => {
    if (!supportAmount || Number(supportAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!selectedCandidate) {
      alert("Select a candidate first");
      return;
    }

    setPaymentRef(
      "KEC-" +
      Math.floor(
        100000 + Math.random() * 900000
      )
    );

    setShowPayment(true);
  }}
>
  Proceed to Pay
</button>
    </div>

{showPayment && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        background: "white",
        width: "90%",
        maxWidth: "600px",
        borderRadius: "15px",
        padding: "30px",
        textAlign: "center",
        color: "#111",
      }}
    >
      <h1 style={{ color: "#0b3d2e" }}>
        🇰🇪 Kenya eCampaign
      </h1>

      <h2>Mass Voting Payment</h2>
<p>
  <strong>Reference:</strong> {paymentRef}
</p>
      <p>You are supporting:</p>

<h2>
  {selectedCandidate === "WANTAM"
    ? "🇰🇪 WANTAM"
    : "🔵 TUTAM"}
</h2>
      <h1
        style={{
          color: "#1b8f3a",
          margin: "15px 0",
        }}
      >
        KSh {supportAmount}
      </h1>

      <p>
        Complete payment using:
      </p>

      <div
        style={{
          background: "#f4f6f9",
          padding: "20px",
          borderRadius: "10px",
          marginTop: "15px",
        }}
      >
        <h3>📱 M-PESA</h3>

        <p>
          Buy Goods & Services
        </p>

        <h1
          style={{
            color: "#00a651",
          }}
        >
          Till No. 3554486
        </h1>
        <button
  onClick={() => {
    navigator.clipboard.writeText(
      "3554486"
    );

    alert("Till Number copied");
  }}
>
  Copy Till Number
</button>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#fff3cd",
          borderRadius: "10px",
          fontSize: "15px",
        }}
      >
        After payment, your votes will be
        verified and added to your selected
        campaign option.
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "25px",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setShowPayment(false)}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            background: "#ccc",
          }}
        >
          Close
        </button>

 

  <input
  type="text"
  placeholder="Enter M-Pesa Code"
  value={mpesaCode}
  onChange={(e) => setMpesaCode(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    marginTop: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  }}
/>

       <button
  onClick={submitPayment}
  style={{
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    background: "#25D366",
    color: "white",
    fontWeight: "bold",
  }}
>
  Submit Payment
</button>
      </div>
    </div>
  </div>
)}
    {/* FOOTER */}
    <div style={styles.footer}>
      <h3>❤️ Support This Platform</h3>
      <p>Lipa na M-PESA (Buy Goods & Services)</p>
      <h2>Till No. 3554486</h2>

      <p>📧 kenya.ecampaign@gmail.com</p>
      <p>© 2026 Kenya eCampaign</p>

      <small>
        Independent public opinion tracker. Not affiliated with any government institution or election authority.
      </small>
    </div>

  </div>
);
}