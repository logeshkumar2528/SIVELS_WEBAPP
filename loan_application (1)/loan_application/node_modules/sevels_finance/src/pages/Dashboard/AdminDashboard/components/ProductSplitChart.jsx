import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// TODO: replace with GET /api/portfolio/product-split
const products = [
  { id: "micro", name: "Micro Loans", value: 38, color: "#4f7fe0" },
  { id: "housing", name: "Housing & LAP", value: 29, color: "#16305c" },
  { id: "group", name: "Unsecured Group Loans", value: 21, color: "#1e4d8f" },
  { id: "vehicle", name: "Vehicle & Asset Loans", value: 12, color: "#a9c0f2" },
];

export default function ProductSplitChart() {
  return (
    <div className="ldash-card">
      <div className="ldash-card-head">
        <h3>Loan Product Split</h3>
        <span className="ldash-queue-count">By outstanding value</span>
      </div>

      <div className="ldash-donut-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={products}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              animationDuration={700}
            >
              {products.map((p) => (
                <Cell key={p.id} fill={p.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e3e8e3" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="ldash-donut-legend">
        {products.map((p) => (
          <li key={p.id}>
            <span className="ldash-donut-dot" style={{ background: p.color }} />
            <span className="ldash-donut-name">{p.name}</span>
            <span className="ldash-donut-value">{p.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}