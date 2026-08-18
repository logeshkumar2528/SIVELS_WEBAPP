// TODO: replace with GET /api/loan-activity?limit=5
const activity = [
  { id: 1, borrower: "R. Kumar", product: "Micro Loan", amount: "₹1,50,000", status: "current" },
  { id: 2, borrower: "S. Iyer", product: "LAP", amount: "₹8,00,000", status: "due" },
  { id: 3, borrower: "P. Devi", product: "Unsecured Group Loan", amount: "₹75,000", status: "overdue" },
];

const statusLabel = { current: "Current", due: "Due", overdue: "Overdue" };

export default function LoanActivityTable() {
  return (
    <div className="ldash-card ldash-table-card">
      <div className="ldash-card-head">
        <h3>Recent Loan Activity</h3>
        <button className="ldash-see-details">View All</button>
      </div>

      {activity.length === 0 ? (
        <div className="ldash-empty">
          <p>No loan activity yet.</p>
        </div>
      ) : (
        <table className="ldash-table">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((row) => (
              <tr key={row.id}>
                <td>{row.borrower}</td>
                <td>{row.product}</td>
                <td>{row.amount}</td>
                <td>
                  <span className={`ldash-badge ${row.status}`}>{statusLabel[row.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}