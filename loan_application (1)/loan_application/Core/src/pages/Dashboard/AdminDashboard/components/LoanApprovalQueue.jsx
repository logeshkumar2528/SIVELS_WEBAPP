import { useState } from "react";
import { Check, X, Clock } from "lucide-react";

// TODO: replace with GET /api/loan-applications?status=pending
const initialQueue = [
  { id: "LA-2291", borrower: "V. Nair", product: "Micro Loan", amount: "₹1,20,000", risk: "Low", appliedAgo: "2h ago" },
  { id: "LA-2290", borrower: "T. Bose", product: "LAP", amount: "₹6,50,000", risk: "Medium", appliedAgo: "5h ago" },
  { id: "LA-2288", borrower: "M. Farooqui", product: "Unsecured Group Loan", amount: "₹40,000", risk: "High", appliedAgo: "1d ago" },
];

export default function LoanApprovalQueue() {
  const [queue, setQueue] = useState(initialQueue);
  const [leavingId, setLeavingId] = useState(null);

  function resolve(id) {
    setLeavingId(id);
    // TODO: replace with POST /api/loan-applications/:id/decision
    setTimeout(() => {
      setQueue((q) => q.filter((item) => item.id !== id));
      setLeavingId(null);
    }, 220);
  }

  return (
    <div className="ldash-card">
      <div className="ldash-card-head">
        <h3>Pending Loan Approvals</h3>
        <span className="ldash-queue-count">{queue.length} waiting</span>
      </div>

      {queue.length === 0 ? (
        <div className="ldash-empty">
          <Clock size={18} strokeWidth={1.8} />
          <p>All caught up — no applications waiting on you.</p>
        </div>
      ) : (
        <ul className="ldash-queue">
          {queue.map((item) => (
            <li key={item.id} className={item.id === leavingId ? "ldash-queue-row leaving" : "ldash-queue-row"}>
              <div className="ldash-mini-avatar">
                {item.borrower.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="ldash-queue-main">
                <p className="ldash-queue-borrower">{item.borrower}</p>
                <p className="ldash-queue-meta">
                  {item.product} · {item.amount} · {item.appliedAgo}
                </p>
              </div>
              <span className={`ldash-risk ${item.risk.toLowerCase()}`}>{item.risk} risk</span>
              <div className="ldash-queue-actions">
                <button
                  className="ldash-icon-btn approve"
                  aria-label={`Approve ${item.borrower}'s application`}
                  onClick={() => resolve(item.id)}
                >
                  <Check size={14} strokeWidth={2.4} />
                </button>
                <button
                  className="ldash-icon-btn reject"
                  aria-label={`Reject ${item.borrower}'s application`}
                  onClick={() => resolve(item.id)}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}