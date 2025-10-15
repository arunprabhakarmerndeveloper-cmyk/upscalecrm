"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext"; // 1. Import the useAuth hook

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 2. Get the login function, loading state, and error from the centralized context
  const { login, loading, error } = useAuth();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // 3. Call the centralized login function from the context
    login({
      variables: {
        input: { email: email.trim(), password: password.trim() },
      },
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #667eea, #764ba2)", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: "40px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", textAlign: "center", color: "#333333" }}>
          AquaPure CRM
        </h1>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.9rem", marginBottom: "10px" }}>
          Welcome back! Please login to your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", outline: "none", fontSize: "1rem" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", outline: "none", fontSize: "1rem" }}
            />
          </div>
          {error && (
            <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "12px", backgroundColor: loading ? "#a3bffa" : "#667eea", color: "#ffffff", fontWeight: "600", borderRadius: "8px", fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", border: "none" }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p style={{ fontSize: "0.8rem", textAlign: "center", color: "#6b7280" }}>
          Forgot your password? <span style={{ color: "#667eea", cursor: "pointer" }}>Reset</span>
        </p>
      </div>
    </div>
  );
}

