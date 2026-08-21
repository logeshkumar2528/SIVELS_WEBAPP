/**
 * DonutChart
 * --------------------
 * Purpose:
 *   Reusable donut chart with an inline legend for all analytics displays.
 *
 * Responsibilities:
 *   - Render a Recharts PieChart in donut style.
 *   - Display a center value and label inside the donut hole.
 *   - Render a vertical legend list with colour dots, labels, counts, percentages.
 *   - Never contain business logic — all data via props.
 *
 * Props:
 *   data         {ChartItem[]} — Array of chart segments (see typedef)
 *   centerValue  {string|number} — Large text in the donut centre (e.g. 95)
 *   centerLabel  {string}        — Small label below centre value (e.g. "Total")
 *
 * ChartItem shape:
 *   label       {string} — Legend label (e.g. "New")
 *   value       {number} — Segment value (used for arc size and legend count)
 *   percentage  {string} — Pre-formatted percentage string (e.g. "25.26%")
 *   color       {string} — Hex color for this segment
 *                          NOTE: Recharts Cell.fill cannot read CSS custom properties.
 *                          Use actual hex values matching the --color-chart-* tokens.
 */

import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
} from 'recharts';
import './DonutChart.css';

/* ==========================================
   CHART DIMENSIONS
   These are Recharts API numeric values,
   not CSS — they cannot use CSS variables.
========================================== */
const CHART_HEIGHT         = 150;
const DONUT_INNER_RADIUS   = 42;
const DONUT_OUTER_RADIUS   = 65;
const DONUT_PADDING_ANGLE  = 2;

/* ==========================================
   CENTRE LABEL RENDERER
   SVG text rendered inside the donut hole.
   Uses className for typography — SVG text
   supports CSS font properties via fill, etc.
========================================== */
function CenterLabel({ viewBox, centerValue, centerLabel }) {
  const { cx = 70, cy = 75 } = viewBox || {};
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="donut-chart-center-value"
      >
        {centerValue}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        className="donut-chart-center-label"
      >
        {centerLabel}
      </text>
    </g>
  );
}

/* ==========================================
   DONUT CHART
========================================== */
const DonutChart = memo(function DonutChart({
  data        = [],
  centerValue = '',
  centerLabel = '',
}) {
  return (
    <div className="donut-chart">

      {/* ---- Chart ---- */}
      <div className="donut-chart-canvas">
        <PieChart width={140} height={CHART_HEIGHT}>
          <Pie
            data={data}
            cx={70}
            cy={75}
            innerRadius={DONUT_INNER_RADIUS}
            outerRadius={DONUT_OUTER_RADIUS}
            paddingAngle={DONUT_PADDING_ANGLE}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.label}`} fill={entry.color} />
            ))}

            <Label
              content={({ viewBox }) => (
                <CenterLabel
                  viewBox={viewBox}
                  centerValue={centerValue}
                  centerLabel={centerLabel}
                />
              )}
              position="center"
            />
          </Pie>
        </PieChart>
      </div>

      {/* ---- Legend ---- */}
      <ul className="donut-chart-legend" role="list" aria-label="Chart legend">
        {data.map((item) => (
          <li key={item.label} className="donut-chart-legend-item">
            {/*
              Dynamic background colour is data-driven — each segment has a unique
              hex value. CSS custom property bridge avoids direct inline style usage.
            */}
            <span
              className="donut-chart-legend-dot"
              style={{ '--dot-color': item.color }}
              aria-hidden="true"
            />
            <span className="donut-chart-legend-label">{item.label}</span>
            <span className="donut-chart-legend-stats">
              {item.value}
              <span className="donut-chart-legend-pct">({item.percentage})</span>
            </span>
          </li>
        ))}
      </ul>

    </div>
  );
});

export default DonutChart;
