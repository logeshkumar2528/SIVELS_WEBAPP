import React, { useState } from "react";
import { Lock, User } from "lucide-react";

export default function RmLoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "rm" && password === "rm123") {
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ background: "#fff", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", background: "#eff6ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Lock size={24} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>RM Portal Login</h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Please enter your credentials to access the back office.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && (
            <div style={{ background: "#fef2f2", color: "#ef4444", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textAlign: "center", border: "1px solid #fee2e2" }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>Username</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "12px", top: "10px" }}>
                <User size={18} color="#94a3b8" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", color: "#0f172a" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "12px", top: "10px" }}>
                <Lock size={18} color="#94a3b8" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", color: "#0f172a" }}
              />
            </div>
          </div>

          <button 
            type="submit"
            style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", marginTop: "8px", boxShadow: "0 1px 2px rgba(37,99,235,0.1)" }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
