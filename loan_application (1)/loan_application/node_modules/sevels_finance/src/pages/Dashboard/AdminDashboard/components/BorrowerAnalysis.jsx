// 7 of 10 sampled borrowers are salaried — drives both the dot row and the ring.
const sample = Array.from({ length: 10 }, (_, i) => (i < 7 ? "salaried" : "self-employed"));

export default function BorrowerAnalysis() {
  return (
    <div className="ldash-card">
      <div className="ldash-card-head">
        <h3>Borrower Analysis</h3>
        <button className="ldash-see-details">Read More</button>
      </div>

      <div className="ldash-borrower-analysis">
        <div className="ldash-people-row">
          {sample.map((type, i) => (
            <div
              key={i}
              className={`ldash-person ${type}`}
              title={type === "salaried" ? "Salaried borrower" : "Self-employed borrower"}
            />
          ))}
        </div>
        <div className="ldash-ring">
          <span className="ldash-ring-value">70%</span>
        </div>
      </div>

      <p className="ldash-ring-caption">70% of active borrowers are salaried employees</p>

      <div className="ldash-legend" style={{ marginTop: 12 }}>
        <span><i style={{ background: "#4f7fe0" }}></i> Salaried Borrowers</span>
        <span><i style={{ background: "#16305c" }}></i> Self-Employed Borrowers</span>
      </div>
    </div>
  );
}