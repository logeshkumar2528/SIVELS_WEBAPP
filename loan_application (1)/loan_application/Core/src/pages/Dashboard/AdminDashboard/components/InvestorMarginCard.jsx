import { Landmark, PiggyBank } from "lucide-react";

// TODO: replace with GET /api/portfolio/investor-margin
const items = [
  {
    id: "investor",
    label: "Investor Payable",
    value: "₹ 4.8 Cr",
    note: "Due to investors this payout cycle.",
    icon: Landmark,
    dark: true,
  },
  {
    id: "spread",
    label: "Spread Income",
    value: "₹ 62.4 L",
    note: "Sivels Finance net margin earned, MTD.",
    icon: PiggyBank,
  },
];

export default function InvestorMarginCard() {
  return (
    <div className="ldash-card ldash-earnings-card">
      <div className="ldash-card-head">
        <h3>Investor &amp; Margin</h3>
        <button className="ldash-see-details">See Details</button>
      </div>

      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.id} className={s.dark ? "ldash-stat dark" : "ldash-stat"}>
            <div className="ldash-stat-head">
              <span>{s.label}</span>
              <Icon size={15} strokeWidth={1.8} />
            </div>
            <p className="ldash-stat-value">{s.value}</p>
            <p className="ldash-stat-note">{s.note}</p>
          </div>
        );
      })}
    </div>
  );
}