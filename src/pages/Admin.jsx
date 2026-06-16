import { useEffect, useState } from "react";
import { supabase } from "../supabase";


export default function Admin() {
  const [payments, setPayments] = useState([]);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payment_submissions")
      .select("*")
      .order("id", { ascending: false });

    setPayments(data || []);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const approvePayment = async (payment) => {
    if (payment.status === "approved") {
      alert("Already approved");
      return;
    }

    const votesToAdd = payment.votes;

    const voteRows = [];

    for (let i = 0; i < votesToAdd; i++) {
      voteRows.push({
        option_name: payment.candidate,
      });
    }

    const { error } = await supabase
      .from("votes")
      .insert(voteRows);

    if (error) {
      alert("Failed to add votes");
      return;
    }

    await supabase
      .from("payment_submissions")
      .update({
        status: "approved",
      })
      .eq("id", payment.id);

    alert("Payment approved");

    loadPayments();
  };

  return (
    <div
      style={{
        padding: 30,
        background: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      <h1>Admin Portal</h1>

      <h3>Payment Verification</h3>

      {payments.map((payment) => (
        <div
          key={payment.id}
          style={{
            background: "white",
            padding: 20,
            marginBottom: 15,
            borderRadius: 10,
          }}
        >
          <h3>{payment.candidate}</h3>

          <p>Amount: KSh {payment.amount}</p>

          <p>Votes: {payment.votes}</p>

          <p>Reference: {payment.payment_ref}</p>

          <p>M-Pesa Code: {payment.mpesa_code}</p>

          <p>Status: {payment.status}</p>

          <button
            onClick={() => approvePayment(payment)}
            style={{
              background: "green",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Approve Payment
          </button>
        </div>
      ))}
    </div>
  );
}