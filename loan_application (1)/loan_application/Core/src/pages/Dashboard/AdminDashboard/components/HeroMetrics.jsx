import useCountUp from "../../../../hooks/useCountUp";

// TODO: replace with GET /api/portfolio/summary
const heroData = {
  totalLoans: { value: 512, active: 428, closed: 84 },
  totalDisbursement: { value: 42.6, prefix: "₹", suffix: " Cr" },
  outstanding: { value: 16.2, prefix: "₹", suffix: " Cr" },
  collectionEfficiency: { value: 91 }, // %
};

function HeroNumber({ label, value, decimals = 0, prefix = "", suffix = "", sub }) {
  const animated = useCountUp(value, { decimals, duration: 900 });
  return (
    <div className="ldash-hero-metric">
      <span className="ldash-hero-label">{label}</span>
      <span className="ldash-hero-value">
        {prefix}
        {animated}
        {suffix}
      </span>
      {sub && <span className="ldash-hero-sub">{sub}</span>}
    </div>
  );
}

export default function HeroMetrics() {
  const { totalLoans, totalDisbursement, outstanding, collectionEfficiency } = heroData;
  const effAnimated = useCountUp(collectionEfficiency.value, { duration: 900 });

  return (
    <div className="ldash-hero">
      <HeroNumber
        label="Total Loans"
        value={totalLoans.value}
        sub={`${totalLoans.active} active · ${totalLoans.closed} closed`}
      />
      <div className="ldash-hero-divider" />
      <HeroNumber
        label="Total Disbursement"
        value={totalDisbursement.value}
        decimals={1}
        prefix={totalDisbursement.prefix}
        suffix={totalDisbursement.suffix}
        sub="Cumulative, all-time"
      />
      <div className="ldash-hero-divider" />
      <HeroNumber
        label="Outstanding Principal"
        value={outstanding.value}
        decimals={1}
        prefix={outstanding.prefix}
        suffix={outstanding.suffix}
        sub="Live portfolio"
      />
      <div className="ldash-hero-divider" />
      <div className="ldash-hero-metric">
        <span className="ldash-hero-label">Collection Efficiency</span>
        <div className="ldash-hero-eff">
          <div
            className="ldash-eff-ring"
            style={{ background: `conic-gradient(#4f7fe0 ${collectionEfficiency.value * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}
          >
            <span>{effAnimated}%</span>
          </div>
          <span className="ldash-hero-sub">EMIs collected vs due, MTD</span>
        </div>
      </div>
    </div>
  );
}
