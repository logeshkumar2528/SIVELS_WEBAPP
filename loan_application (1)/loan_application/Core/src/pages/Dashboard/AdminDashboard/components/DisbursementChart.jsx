import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChevronDown } from "lucide-react";

// TODO: replace with a real fetch, e.g. GET /api/portfolio/trend?range=...
const dataByRange = {
  "This Month": [
    { period: "Week 1", disbursed: 18, collected: 6, overdue: 2 },
    { period: "Week 2", disbursed: 22, collected: 14, overdue: 4 },
    { period: "Week 3", disbursed: 34, collected: 20, overdue: 6 },
    { period: "Week 4", disbursed: 30, collected: 24, overdue: 5 },
  ],
  "Last Month": [
    { period: "Week 1", disbursed: 15, collected: 9, overdue: 3 },
    { period: "Week 2", disbursed: 19, collected: 12, overdue: 3 },
    { period: "Week 3", disbursed: 26, collected: 18, overdue: 5 },
    { period: "Week 4", disbursed: 24, collected: 21, overdue: 4 },
  ],
  "This Quarter": [
    { period: "Month 1", disbursed: 74, collected: 52, overdue: 12 },
    { period: "Month 2", disbursed: 88, collected: 61, overdue: 15 },
    { period: "Month 3", disbursed: 96, collected: 79, overdue: 11 },
  ],
};

const ranges = Object.keys(dataByRange);

export default function DisbursementChart() {
  const [range, setRange] = useState("This Month");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ldash-card ldash-chart-card">
      <div className="ldash-card-head">
        <h3>Disbursement Trend</h3>
        <div className="ldash-sort-wrap">
          <button
            className="ldash-sort-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            Sort by · {range} <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <ul className="ldash-sort-menu" role="listbox">
              {ranges.map((r) => (
                <li key={r}>
                  <button
                    role="option"
                    aria-selected={r === range}
                    className={r === range ? "active" : ""}
                    onClick={() => {
                      setRange(r);
                      setMenuOpen(false);
                    }}
                  >
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={dataByRange[range]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1ee" vertical={false} />
          <XAxis dataKey="period" stroke="#9aa39a" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis stroke="#9aa39a" tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e3e8e3" }} />
          <Line type="monotone" dataKey="disbursed" stroke="#4f7fe0" strokeWidth={2.5} dot={{ r: 3 }} name="Disbursed (₹L)" animationDuration={650} />
          <Line type="monotone" dataKey="collected" stroke="#16305c" strokeWidth={2.5} dot={{ r: 3 }} name="Collected (₹L)" animationDuration={650} />
          <Line type="monotone" dataKey="overdue" stroke="#a9c0f2" strokeWidth={2} dot={{ r: 3 }} name="Overdue (₹L)" animationDuration={650} />
        </LineChart>
      </ResponsiveContainer>

      <div className="ldash-legend">
        <span><i style={{ background: "#4f7fe0" }}></i> Disbursed</span>
        <span><i style={{ background: "#16305c" }}></i> Collected</span>
        <span><i style={{ background: "#a9c0f2" }}></i> Overdue</span>
      </div>
    </div>
  );
}