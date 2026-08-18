import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './DonutChart.css';

const DonutChart = memo(function DonutChart({ data = [], total = 0 }) {
  return (
    <div className="donut-chart-container">
      <div className="donut-chart-wrapper">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} Apps`, name]}
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-chart-center">
          <span className="donut-chart-total">{total}</span>
          <span className="donut-chart-label">Total</span>
        </div>
      </div>
    </div>
  );
});

export default DonutChart;
