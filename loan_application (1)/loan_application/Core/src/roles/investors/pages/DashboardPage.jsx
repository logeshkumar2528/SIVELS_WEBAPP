import React from "react";
import { Row, Col, Table, Button, Container } from "react-bootstrap";
import {
  PlusCircle,
  Briefcase,
  Users,
  Wallet,
  TrendingUp,
  IndianRupee,
  PiggyBank,
  Landmark,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileWarning,
  Sparkles,
  ChevronDown,
} from "../icons/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";
import StatusPill from "../components/StatusPill";
import PageGrid from "../layout/PageGrid";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA — swap this block for real API responses later          */
/* ------------------------------------------------------------------ */

const statCards = [
  {
    label: "Total Investment",
    value: "₹10,00,000",
    delta: "+16.25% vs last month",
    positive: true,
    icon: Wallet,
    tint: "#2563EB",
    bg: "#EAF1FE",
  },
  {
    label: "Current Portfolio Value",
    value: "₹11,24,560",
    delta: "+11.24% vs last month",
    positive: true,
    icon: TrendingUp,
    tint: "#16A34A",
    bg: "#E9F9EF",
  },
  {
    label: "Total Interest Earned",
    value: "₹1,24,560",
    delta: "+12.18% vs last month",
    positive: true,
    icon: PiggyBank,
    tint: "#9333EA",
    bg: "#F4EBFE",
  },
  {
    label: "Available Balance",
    value: "₹45,230",
    delta: "+8.35% vs last month",
    positive: true,
    icon: IndianRupee,
    tint: "#EA580C",
    bg: "#FFF1E7",
  },
  {
    label: "Active Investments",
    value: "10",
    delta: "Across 4 loan types",
    positive: null,
    icon: Landmark,
    tint: "#0D9488",
    bg: "#E5FAF6",
  },
  {
    label: "Customers Funded",
    value: "10",
    delta: "Across 4 loan types",
    positive: null,
    icon: UserCheck,
    tint: "#DB2777",
    bg: "#FDEAF3",
  },
];

const distribution = [
  { name: "Personal Loan", value: 300000, pct: 30, color: "#2563EB" },
  { name: "Business Loan", value: 200000, pct: 20, color: "#9333EA" },
  { name: "Housing Loan", value: 450000, pct: 45, color: "#16A34A" },
  { name: "Property Loan", value: 150000, pct: 15, color: "#EA580C" },
];
// Note: pct values are as-labeled in the source screenshot; wedges render
// from `value`, so the chart stays internally consistent even if the
// source rounding doesn't sum to exactly 100.

const monthlyEarnings = [
  { month: "Jan", value: 4230 },
  { month: "Feb", value: 6890 },
  { month: "Mar", value: 9450 },
  { month: "Apr", value: 15670 },
  { month: "May", value: 18750 },
  { month: "Jun", value: 22930 },
];

const recentActivity = [
  {
    icon: ArrowUpRight,
    tint: "#16A34A",
    bg: "#E9F9EF",
    title: "Interest Credited",
    desc: "₹2,450 credited to your account",
    time: "Today, 10:45 AM",
  },
  {
    icon: PlusCircle,
    tint: "#2563EB",
    bg: "#EAF1FE",
    title: "New Allocation",
    desc: "₹75,000 allocated to Ramesh Kumar",
    time: "Today, 10:30 AM",
  },
  {
    icon: IndianRupee,
    tint: "#9333EA",
    bg: "#F4EBFE",
    title: "EMI Received",
    desc: "₹1,200 received from Priya Sharma",
    time: "Yesterday, 05:15 PM",
  },
  {
    icon: Briefcase,
    tint: "#0D9488",
    bg: "#E5FAF6",
    title: "Loan Closed",
    desc: "Loan closed for Suresh Babu",
    time: "Yesterday, 05:10 PM",
  },
  {
    icon: ArrowDownRight,
    tint: "#DC2626",
    bg: "#FDECEC",
    title: "Withdrawal Request",
    desc: "₹20,000 withdrawal requested",
    time: "Yesterday, 03:40 PM",
  },
];

const portfolioSummary = [
  {
    type: "Personal Loan",
    dot: "#2563EB",
    invested: "₹3,00,000",
    customers: 3,
    interest: "₹37,450",
    roi: "16.25%",
    status: "Active",
  },
  {
    type: "Business Loan",
    dot: "#9333EA",
    invested: "₹2,00,000",
    customers: 2,
    interest: "₹28,900",
    roi: "18.40%",
    status: "Active",
  },
  {
    type: "Housing Loan",
    dot: "#16A34A",
    invested: "₹4,50,000",
    customers: 3,
    interest: "₹52,390",
    roi: "15.10%",
    status: "Active",
  },
  {
    type: "Property Loan",
    dot: "#EA580C",
    invested: "₹1,50,000",
    customers: 2,
    interest: "₹10,970",
    roi: "15.10%",
    status: "Active",
  },
];

const portfolioTotal = {
  invested: "₹10,00,000",
  customers: 10,
  interest: "₹1,24,560",
  roi: "15.60%",
};

const quickActions = [
  {
    icon: PlusCircle,
    tint: "#2563EB",
    bg: "#EAF1FE",
    title: "New Investment",
    desc: "Invest in loans",
  },
  {
    icon: Briefcase,
    tint: "#16A34A",
    bg: "#E9F9EF",
    title: "My Portfolio",
    desc: "View all investments",
  },
  {
    icon: Users,
    tint: "#9333EA",
    bg: "#F4EBFE",
    title: "Customers",
    desc: "View funded customers",
  },
  {
    icon: Wallet,
    tint: "#EA580C",
    bg: "#FFF1E7",
    title: "Withdraw Funds",
    desc: "Request withdrawal",
    highlighted: true,
  },
];

const alerts = [
  {
    icon: Clock,
    tint: "#DC2626",
    bg: "#FDECEC",
    title: "3 EMIs are overdue",
    desc: "Total outstanding ₹4,250",
  },
  {
    icon: FileWarning,
    tint: "#D97706",
    bg: "#FEF3E2",
    title: "2 loans are pending documentation",
    desc: "Action required",
  },
  {
    icon: Sparkles,
    tint: "#2563EB",
    bg: "#EAF1FE",
    title: "New loan opportunities available",
    desc: "Invest now and earn higher returns",
  },
];

const topInvestments = [
  {
    name: "Ramesh Kumar",
    type: "Business Loan",
    invested: "₹75,000",
    interest: "₹9,800",
    roi: "19.70%",
    status: "Up to Date",
  },
  {
    name: "Priya Sharma",
    type: "Personal Loan",
    invested: "₹50,000",
    interest: "₹6,200",
    roi: "18.60%",
    status: "Up to Date",
  },
  {
    name: "Suresh Babu",
    type: "Housing Loan",
    invested: "₹80,000",
    interest: "₹8,640",
    roi: "15.20%",
    status: "Up to Date",
  },
  {
    name: "Karthik Moorthy",
    type: "Personal Loan",
    invested: "₹65,000",
    interest: "₹10,570",
    roi: "16.55%",
    status: "Up to Date",
  },
];

/* ------------------------------------------------------------------ */
/*  SECTIONS                                                            */
/* ------------------------------------------------------------------ */

function StatCards() {
  return (
    <Row className="g-3 px-4" xs={2} md={3} xl={6}>
      {statCards.map((s) => {
        const Icon = s.icon;
        return (
          <Col key={s.label}>
            <Card fullHeight className="stat-card" bodyClassName="p-3">
              <div
                className="stat-icon d-flex align-items-center justify-content-center mb-3"
                style={{ backgroundColor: s.bg }}
              >
                <Icon size={17} style={{ color: s.tint }} strokeWidth={2.2} />
              </div>
              <p className="stat-label mb-1">{s.label}</p>
              <p className="stat-value mb-1">{s.value}</p>
              <p
                className={`stat-delta mb-0 ${
                  s.positive === null
                    ? "text-muted"
                    : s.positive
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {s.delta}
              </p>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

function DistributionCard() {
  return (
    <Card fullHeight>
      <SectionHeader title="Investment Distribution" />
      <div className="d-flex align-items-center gap-4">
        <div className="donut-wrap position-relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                stroke="none"
              >
                {distribution.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center position-absolute d-flex flex-column align-items-center justify-content-center">
            <p className="mb-0 fw-semibold small">₹10,00,000</p>
            <p className="mb-0 donut-caption">Total Invested</p>
          </div>
        </div>
        <div className="flex-grow-1">
          {distribution.map((d) => (
            <div key={d.name} className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="legend-dot" style={{ backgroundColor: d.color }} />
                <span className="legend-label">{d.name}</span>
              </div>
              <div className="text-end">
                <p className="mb-0 small fw-medium text-dark">
                  ₹{d.value.toLocaleString("en-IN")}
                </p>
                <p className="mb-0 legend-pct">{d.pct}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EarningsCard() {
  return (
    <Card fullHeight>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="section-title mb-0">Monthly Interest Earnings</h3>
        <Button variant="outline-secondary" size="sm" className="d-flex align-items-center gap-1 range-btn">
          This Year <ChevronDown size={13} />
        </Button>
      </div>
      <div className="earnings-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyEarnings} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip
              formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Interest Earned"]}
              contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E2E8F0" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#16A34A"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#16A34A", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RecentActivityCard({ onToast }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Recent Activity" action="View All" onAction={onToast} />
      {recentActivity.map((a, i) => {
        const Icon = a.icon;
        return (
          <Button
            key={i}
            variant="light"
            onClick={() => onToast(`${a.title}: ${a.desc}`)}
            className="w-100 d-flex align-items-start gap-2 text-start activity-row mb-1"
          >
            <div
              className="activity-icon d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ backgroundColor: a.bg }}
            >
              <Icon size={15} style={{ color: a.tint }} strokeWidth={2.2} />
            </div>
            <div className="flex-grow-1 text-truncate-wrap">
              <p className="mb-0 small fw-medium text-dark">{a.title}</p>
              <p className="mb-0 activity-desc text-truncate">{a.desc}</p>
            </div>
            <p className="mb-0 activity-time flex-shrink-0">{a.time}</p>
          </Button>
        );
      })}
    </Card>
  );
}

function PortfolioSummaryCard({ onToast }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Portfolio Summary by Loan Type" />
      <Table responsive borderless hover className="data-table align-middle mb-0">
        <thead>
          <tr>
            <th>Loan Type</th>
            <th>Invested Amount</th>
            <th>Active Customers</th>
            <th>Total Interest Earned</th>
            <th>Avg ROI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {portfolioSummary.map((row) => (
            <tr
              key={row.type}
              onClick={() => onToast(`${row.type}: ${row.invested} invested · ${row.roi} ROI`)}
              role="button"
            >
              <td>
                <span className="d-flex align-items-center gap-2">
                  <span className="legend-dot" style={{ backgroundColor: row.dot }} />
                  {row.type}
                </span>
              </td>
              <td>{row.invested}</td>
              <td>{row.customers}</td>
              <td>{row.interest}</td>
              <td className="text-success fw-medium">{row.roi}</td>
              <td>
                <StatusPill status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fw-semibold">
            <td>Total</td>
            <td>{portfolioTotal.invested}</td>
            <td>{portfolioTotal.customers}</td>
            <td>{portfolioTotal.interest}</td>
            <td className="text-success">{portfolioTotal.roi}</td>
            <td />
          </tr>
        </tfoot>
      </Table>
    </Card>
  );
}

function QuickActionsCard({ onNavigate }) {
  return (
    <Card>
      <SectionHeader title="Quick Actions" />
      <Row className="g-2" xs={2}>
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Col key={a.title}>
              <Button
                variant="light"
                onClick={() => onNavigate(a.title)}
                className={`w-100 h-100 text-start quick-action-btn ${
                  a.highlighted ? "quick-action-highlighted" : ""
                }`}
              >
                <div
                  className="stat-icon d-flex align-items-center justify-content-center mb-2"
                  style={{ backgroundColor: a.bg }}
                >
                  <Icon size={15} style={{ color: a.tint }} strokeWidth={2.2} />
                </div>
                <p className="mb-0 small fw-medium text-dark">{a.title}</p>
                <p className="mb-0 quick-action-desc">{a.desc}</p>
              </Button>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

function AlertsCard({ onToast }) {
  return (
    <Card>
      <SectionHeader title="Important Alerts" action="View All" onAction={onToast} />
      {alerts.map((a, i) => {
        const Icon = a.icon;
        return (
          <Button
            key={i}
            variant="light"
            onClick={() => onToast(`${a.title} — ${a.desc}`)}
            className="w-100 d-flex align-items-start gap-2 text-start alert-row mb-2"
            style={{ backgroundColor: a.bg }}
          >
            <Icon size={16} style={{ color: a.tint }} className="mt-1 flex-shrink-0" />
            <div>
              <p className="mb-0 alert-title">{a.title}</p>
              <p className="mb-0 alert-desc">{a.desc}</p>
            </div>
          </Button>
        );
      })}
    </Card>
  );
}

function TopInvestmentsCard({ onToast }) {
  return (
    <Card>
      <SectionHeader title="Top Performing Investments" action="View All" onAction={onToast} />
      <Table responsive borderless hover className="data-table align-middle mb-0">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Loan Type</th>
            <th>Invested Amount</th>
            <th>Interest Earned</th>
            <th>ROI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {topInvestments.map((row) => (
            <tr
              key={row.name}
              onClick={() => onToast(`${row.name} · ${row.type} · ${row.roi} ROI`)}
              role="button"
            >
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.invested}</td>
              <td>{row.interest}</td>
              <td className="text-success fw-medium">{row.roi}</td>
              <td>
                <StatusPill status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage({ onToast }) {
  return (
    <>
      <StatCards />

      <PageGrid xs={1} lg={3} className="items-start">
        <Col>
          <DistributionCard />
        </Col>
        <Col>
          <EarningsCard />
        </Col>
        <Col>
          <RecentActivityCard onToast={onToast} />
        </Col>
      </PageGrid>

      <PageGrid>
        <Col lg={8}>
          <PortfolioSummaryCard onToast={onToast} />
        </Col>
        <Col lg={4} className="d-flex flex-column gap-3">
          <QuickActionsCard onNavigate={onToast} />
          <AlertsCard onToast={onToast} />
        </Col>
      </PageGrid>

      <Container fluid className="px-4 mt-3 mb-4">
        <TopInvestmentsCard onToast={onToast} />
      </Container>
    </>
  );
}