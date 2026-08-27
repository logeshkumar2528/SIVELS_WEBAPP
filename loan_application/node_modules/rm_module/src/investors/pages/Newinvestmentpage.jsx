import React, { useState, useMemo } from "react";
import { User, Briefcase, Home, Building2, HelpCircle, CheckCircle2, RotateCcw, ArrowLeft, ArrowRight, AlertTriangle, Wallet, Info } from "lucide-react";

const LOAN_TYPES = [
  { key: "personal", label: "Personal Loan", subtitle: "Short term personal needs", icon: User, tint: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", rate: 16.0 },
  { key: "business", label: "Business Loan", subtitle: "For business expansion", icon: Briefcase, tint: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", rate: 18.0 },
  { key: "housing", label: "Housing Loan", subtitle: "Home purchase / construction", icon: Home, tint: "#9333ea", bg: "#faf5ff", border: "#e9d5ff", rate: 14.0 },
  { key: "property", label: "Property Loan", subtitle: "Against property mortgage", icon: Building2, tint: "#ea580c", bg: "#fff7ed", border: "#fed7aa", rate: 15.5 },
];

const HOW_IT_WORKS = [
  "You choose loan types and amounts",
  "We allocate to eligible borrowers",
  "You earn interest on your investment",
  "EMI payments are credited to you",
];

const BENEFITS = [
  "Higher returns with diversified portfolio",
  "Monthly interest credited to your account",
  "Real-time tracking of your investments",
  "Secure & transparent process",
];

function formatINR(n) {
  if (!n) return "₹ 0";
  return `₹ ${Number(n).toLocaleString("en-IN")}`;
}

export default function NewInvestmentPage({ onToast, onBackToDashboard, onGoToCustomerAllocation }) {
  const [globalInvestment, setGlobalInvestment] = useState("");
  
  const [allocations, setAllocations] = useState({
    personal: { amount: "", included: true },
    business: { amount: "", included: true },
    housing: { amount: "", included: true },
    property: { amount: "", included: true },
  });

  const handleToggle = (key) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], included: !prev[key].included },
    }));
  };

  const handleAmountChange = (key, value) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], amount: value },
    }));
  };

  const handleReset = () => {
    setGlobalInvestment("");
    setAllocations({
      personal: { amount: "", included: true },
      business: { amount: "", included: true },
      housing: { amount: "", included: true },
      property: { amount: "", included: true },
    });
    onToast && onToast("Reset to empty");
  };

  const handleConfirm = () => {
    onGoToCustomerAllocation && onGoToCustomerAllocation();
  };

  const totalAmount = useMemo(() => {
    return LOAN_TYPES.reduce((sum, loan) => {
      const val = parseFloat(allocations[loan.key].amount) || 0;
      return sum + (allocations[loan.key].included ? val : 0);
    }, 0);
  }, [allocations]);

  const breakdown = useMemo(() => {
    return LOAN_TYPES.map((loan) => {
      const amount = allocations[loan.key].included ? (parseFloat(allocations[loan.key].amount) || 0) : 0;
      const percent = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      return { key: loan.key, label: loan.label, amount, percent, rate: loan.rate, tint: loan.tint };
    });
  }, [allocations, totalAmount]);

  const totalPercent = breakdown.reduce((sum, b) => sum + b.percent, 0);
  const avgRate = totalAmount > 0 ? breakdown.reduce((sum, b) => sum + b.rate * (b.amount / totalAmount), 0) : 0;
  const monthlyInterest = (totalAmount * avgRate) / 100 / 12;

  return (
    <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100%", paddingBottom: "100px" }}>
      
      {/* Header removed as it is now part of the dynamic global Header.jsx */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", marginBottom: "24px", marginTop: "24px" }}>
        
        {/* Top Left: Success Message Card */}
        <div style={{ background: "#f8fcf9", borderRadius: "12px", border: "1px solid #dcfce7", padding: "24px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "24px" }}>
            
            {/* Left Checkmark Graphic */}
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
              <CheckCircle2 size={32} color="#fff" />
              {/* Confetti dots */}
              <div style={{ position: "absolute", top: "-5px", left: "10px", width: "6px", height: "6px", background: "#f59e0b", borderRadius: "50%" }}></div>
              <div style={{ position: "absolute", bottom: "5px", left: "-8px", width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></div>
              <div style={{ position: "absolute", top: "20px", right: "-12px", width: "6px", height: "6px", background: "#fde047", borderRadius: "50%" }}></div>
              <div style={{ position: "absolute", bottom: "10px", right: "-5px", width: "5px", height: "5px", background: "#f59e0b", borderRadius: "50%" }}></div>
            </div>

            {/* Text Content */}
            <div style={{ flex: 1, position: "relative", zIndex: 2 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#16a34a", margin: "0 0 8px 0" }}>Your investment has been successfully placed!</h2>
              <p style={{ fontSize: "14px", color: "#0f172a", margin: "0 0 4px 0", fontWeight: 600 }}>Thank you for investing with Sivels Finance.</p>
              <p style={{ fontSize: "13px", color: "#475569", margin: 0, fontWeight: 500 }}>Your amount is now allocated to eligible loans as per your preference.</p>
            </div>
            
            {/* Right Illustration Composition (Wallet, Shield, Coins) */}
            <div style={{ width: "120px", height: "100px", position: "relative", flexShrink: 0, opacity: 0.9 }}>
              {/* Wallet body */}
              <div style={{ position: "absolute", bottom: "10px", right: "20px", width: "80px", height: "60px", background: "#16a34a", borderRadius: "8px", border: "2px solid #14532d" }}></div>
              {/* Document sticking out */}
              <div style={{ position: "absolute", top: "10px", right: "35px", width: "50px", height: "40px", background: "#f8fafc", border: "2px solid #cbd5e1", borderBottom: "none", borderRadius: "4px 4px 0 0" }}>
                <div style={{ width: "30px", height: "3px", background: "#cbd5e1", margin: "8px auto 4px auto" }}></div>
                <div style={{ width: "20px", height: "3px", background: "#cbd5e1", margin: "0 auto" }}></div>
              </div>
              {/* Shield */}
              <div style={{ position: "absolute", bottom: "5px", left: "10px", width: "32px", height: "36px", background: "#10b981", borderRadius: "4px", border: "2px solid #065f46", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={16} color="#fff" />
              </div>
              {/* Coins stack */}
              <div style={{ position: "absolute", bottom: "5px", right: "5px", display: "flex", flexDirection: "column" }}>
                <div style={{ width: "32px", height: "12px", background: "#fbbf24", borderRadius: "50%", border: "2px solid #d97706", marginBottom: "-4px", position: "relative", zIndex: 3 }}></div>
                <div style={{ width: "32px", height: "12px", background: "#f59e0b", borderRadius: "50%", border: "2px solid #b45309", marginBottom: "-4px", position: "relative", zIndex: 2 }}></div>
                <div style={{ width: "32px", height: "12px", background: "#d97706", borderRadius: "50%", border: "2px solid #92400e", position: "relative", zIndex: 1 }}></div>
              </div>
            </div>
            
          </div>

          {/* Details Row */}
          <div style={{ display: "flex", alignItems: "center", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "16px 0", marginBottom: "20px" }}>
            <div style={{ flex: 1, borderRight: "1px solid #e2e8f0", paddingRight: "16px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Investment ID</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>INV25060500056</div>
            </div>
            <div style={{ flex: 1, borderRight: "1px solid #e2e8f0", padding: "0 16px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Investment Date & Time</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>05 Jun 2025, 11:45 AM</div>
            </div>
            <div style={{ flex: 1, borderRight: "1px solid #e2e8f0", padding: "0 16px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Total Investment Amount</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a" }}>₹ 10,00,000</div>
            </div>
            <div style={{ flex: 1, paddingLeft: "16px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Transaction ID</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>TXN4587963210</div>
            </div>
          </div>

          {/* Bottom Note */}
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} color="#059669" />
            <span style={{ fontSize: "12.5px", color: "#065f46", fontWeight: 500 }}>You will start receiving interest as per the loan disbursement and EMI collection.</span>
          </div>

        </div>

        {/* Top Right: How it works */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Info size={18} color="#3b82f6" />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>How it works?</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={12} color="#3b82f6" />
                </div>
                <div style={{ fontSize: "12.5px", color: "#1e293b", fontWeight: 600 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
        
        {/* Main Left Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Choose Loan Types & Allocate Amount</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px 0", fontWeight: 500 }}>Select loan types and specify how much you want to invest in each</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              {LOAN_TYPES.map((loan) => {
                const Icon = loan.icon;
                const isInc = allocations[loan.key].included;
                const amt = allocations[loan.key].amount;
                const pct = breakdown.find(b => b.key === loan.key)?.percent || 0;
                
                return (
                  <div key={loan.key} style={{ background: "#fff", borderRadius: "12px", border: `1px solid ${isInc ? loan.border : '#e2e8f0'}`, padding: "20px", position: "relative", opacity: isInc ? 1 : 0.6, transition: "all 0.2s" }}>
                    <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                      <input 
                        type="checkbox" 
                        checked={isInc} 
                        onChange={() => handleToggle(loan.key)} 
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }} 
                      />
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: loan.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={20} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>{loan.label}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{loan.subtitle}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600, marginBottom: "6px" }}>Allocate Amount (₹)</div>
                      <input 
                        type="number"
                        value={amt}
                        onChange={(e) => handleAmountChange(loan.key, e.target.value)}
                        disabled={!isInc}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Interest Rate (p.a.)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: loan.tint }}>{loan.rate.toFixed(2)}%</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "10px", color: loan.tint, fontWeight: 700, background: loan.bg, padding: "4px 12px", borderRadius: "99px" }}>
                        {pct.toFixed(0)}% of total
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation Summary */}
          <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Total Allocation Summary</div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total Amount</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a" }}>{formatINR(totalAmount)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total Percentage</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#3b82f6" }}>{totalPercent.toFixed(0)}%</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Expected Avg. Interest Rate (p.a.)</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#9333ea" }}>{avgRate.toFixed(2)}%</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Expected Monthly Interest</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#ea580c" }}>{formatINR(monthlyInterest)} <span style={{ fontSize: "10px", color: "#64748b" }}>(Approx.)</span></div>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={14} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>Important Note</div>
              <div style={{ fontSize: "12px", color: "#92400e", fontWeight: 500 }}>Investment will be allocated to eligible loans based on your preferences and borrower availability.</div>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 20px 0" }}>Investment Preview</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {breakdown.map((b) => (
                <div key={b.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "12.5px", color: "#1e293b", fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: b.tint }}>{formatINR(b.amount)} <span style={{ opacity: 0.8 }}>({b.percent.toFixed(0)}%)</span></div>
                </div>
              ))}
              
              <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }}></div>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 700 }}>Total Investment</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a" }}>{formatINR(totalAmount)}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 16px 0" }}>Benefits You Get</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Footer Fixed Bar */}
      <div style={{ position: "fixed", bottom: 0, left: "260px", right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
        <div 
          onClick={onBackToDashboard}
          style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div 
            onClick={handleReset}
            style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
            <RotateCcw size={16} /> Reset
          </div>
          <div 
            onClick={handleConfirm}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0f7a4c", borderRadius: "8px", padding: "10px 24px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#fff" }}>
            Review & Confirm Investment <ArrowRight size={16} />
          </div>
        </div>
      </div>

    </div>
  );
}