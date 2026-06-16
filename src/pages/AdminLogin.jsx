import { useState } from "react";
import { supabase } from "../supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/admin/dashboard";
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        background: "white",
        padding: 30,
        borderRadius: 12,
      }}
    >
      <h2>Admin Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        style={{width:"100%",padding:12,marginBottom:10}}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        style={{width:"100%",padding:12}}
      />

      <button
        onClick={login}
        style={{
          width:"100%",
          padding:12,
          marginTop:15,
          background:"#0b3d2e",
          color:"white",
          border:"none"
        }}
      >
        Login
      </button>
    </div>
  );
}