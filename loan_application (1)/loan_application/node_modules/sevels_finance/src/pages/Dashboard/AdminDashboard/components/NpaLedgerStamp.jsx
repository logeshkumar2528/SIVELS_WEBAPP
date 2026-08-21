import { ShieldCheck } from "lucide-react";

// TODO: replace with GET /api/portfolio/dpd-buckets
const buckets = [
  { id: "current", label: "Current · 0 DPD", value: 91.2, color: "#4f7fe0" },
  { id: "b1", label: "1–30 DPD", value: 5.1, color: "#c9a35c" },
  { id: "b2", label: "31–60 DPD", value: 2.0, color: "#d3924f" },
  { id: "b3", label: "61–90 DPD", value: 1.0, color: "#c76b4a" },
  { id: "b4", label: "90+ DPD · NPA", value: 0.7, color: "#b23b3b" },
];

const npaPct = buckets.find((b) => b.id === "b4").value;

// Build a conic-gradient string so the ring reflects the bucket values exactly.
function buildGradient() {
  let cursor = 0;
  const stops = buckets.map((b) => {
    const start = cursor;
    cursor += b.value * 3.6;
    return `${b.color} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function NpaLedgerStamp() {
  return (
    <div className="ldash-card">
      <div className="ldash-card-head">
        <h3>NPA / DPD Status</h3>
        <span className="ldash-queue-count">Portfolio-wide</span>
      </div>

      <div className="ldash-stamp-row">
        <div className="ldash-stamp" style={{ background: buildGradient() }}>
          <div className="ldash-stamp-inner">
            <ShieldCheck size={16} strokeWidth={1.8} />
            <span className="ldash-stamp-pct">{npaPct}%</span>
            <span className="ldash-stamp-caption">NPA</span>
          </div>
        </div>

        <ul className="ldash-bucket-list">
          {buckets.map((b) => (
            <li key={b.id}>
              <span className="ldash-donut-dot" style={{ background: b.color }} />
              <span className="ldash-bucket-label">{b.label}</span>
              <span className="ldash-bucket-value">{b.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}