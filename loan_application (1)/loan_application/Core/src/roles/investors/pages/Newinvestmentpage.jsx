import React, { useMemo, useState } from "react";
import { Row, Col, Card, Form, Button, Breadcrumb } from "react-bootstrap";
import {
  User,
  Briefcase,
  Home,
  Building2,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
} from "../icons/icons";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA — swap for real API responses later                     */
/* ------------------------------------------------------------------ */

const LOAN_TYPES = [
  {
    key: "personal",
    label: "Personal Loan",
    subtitle: "Short term personal needs",
    icon: User,
    tint: "#2563EB",
    bg: "#EAF1FE",
    rate: 16.0,
    defaultAmount: 300000,
  },
  {
    key: "business",
    label: "Business Loan",
    subtitle: "For business expansion",
    icon: Briefcase,
    tint: "#16A34A",
    bg: "#E9F9EF",
    rate: 18.0,
    defaultAmount: 200000,
  },
  {
    key: "housing",
    label: "Housing Loan",
    subtitle: "Home purchase / construction",
    icon: Home,
    tint: "#9333EA",
    bg: "#F4EBFE",
    rate: 14.0,
    defaultAmount: 400000,
  },
  {
    key: "property",
    label: "Property Loan",
    subtitle: "Against property mortgage",
    icon: Building2,
    tint: "#EA580C",
    bg: "#FFF1E7",
    rate: 15.5,
    defaultAmount: 100000,
  },
];

const HOW_IT_WORKS = [
  "You choose loan types and amounts",
  "We allocate to eligible borrowers",
  "You earn interest on your investment",
  "EMI payments are credited to you",
];

const BENEFITS = [
  "Higher returns with diversified portfolio",
  "Monthly interest credited to your account",
  "Real-time tracking of your investments",
  "Secure & transparent process",
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

/* ------------------------------------------------------------------ */
/*  SECTIONS                                                            */
/* ------------------------------------------------------------------ */

function PageHeader({ onBackToDashboard }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <Breadcrumb className="ni-breadcrumb mb-1">
        <Breadcrumb.Item onClick={onBackToDashboard}>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item active>New Investment</Breadcrumb.Item>
      </Breadcrumb>
      <h1 className="page-title mb-0">New Investment</h1>
    </div>
  );
}

function ReservedSpaceCard() {
  // Investment Amount + Available Balance intentionally removed.
  // Left empty on purpose — content to be added later.
  return (
    <Card className="h-100 reserved-space-card">
      <Card.Body className="d-flex align-items-center justify-content-center">
        <p className="text-muted small mb-0">Reserved for future content</p>
      </Card.Body>
    </Card>
  );
}

function HowItWorksCard() {
  return (
    <Card className="h-100 how-it-works-card">
      <Card.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <HelpCircle size={16} className="text-primary" />
          <h3 className="section-title mb-0">How it works?</h3>
        </div>
        {HOW_IT_WORKS.map((step, i) => (
          <div key={i} className="d-flex align-items-start gap-2 mb-2">
            <span className="how-it-works-dot flex-shrink-0" />
            <p className="mb-0 small text-secondary">{step}</p>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}

function LoanTypeCard({ loan, amount, included, onToggle, onAmountChange, percentOfTotal }) {
  const Icon = loan.icon;
  return (
    <Card
      className={`loan-type-card h-100 ${included ? "loan-type-card-active" : "loan-type-card-inactive"}`}
    >
      <Card.Body>
        <div
          className="d-flex align-items-center justify-content-between mb-3"
          role="button"
          onClick={() => onToggle(loan.key)}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="loan-type-icon d-flex align-items-center justify-content-center"
              style={{ backgroundColor: loan.bg }}
            >
              <Icon size={16} style={{ color: loan.tint }} strokeWidth={2.2} />
            </div>
            <div>
              <p className="mb-0 small fw-semibold text-dark">{loan.label}</p>
              <p className="mb-0 loan-type-subtitle">{loan.subtitle}</p>
            </div>
          </div>
          <CheckCircle2
            size={18}
            className={included ? "text-success" : "text-secondary opacity-50"}
          />
        </div>

        <Form.Group className="mb-2">
          <Form.Label className="loan-field-label mb-1">Allocate Amount (₹)</Form.Label>
          <Form.Control
            type="number"
            min={0}
            value={amount}
            disabled={!included}
            onChange={(e) => onAmountChange(loan.key, e.target.value)}
            className="loan-amount-input"
          />
        </Form.Group>

        <div className="d-flex align-items-center justify-content-between">
          <span className="loan-field-label">Interest Rate (p.a.)</span>
          <span className="loan-rate-value">{loan.rate.toFixed(2)}%</span>
        </div>

        <div className="loan-progress-track mt-2">
          <div
            className="loan-progress-fill"
            style={{ width: `${percentOfTotal}%`, backgroundColor: loan.tint }}
          />
        </div>
        <p className="mb-0 loan-progress-label mt-1">{percentOfTotal.toFixed(0)}% of total</p>
      </Card.Body>
    </Card>
  );
}

function TotalAllocationSummary({ totalAmount, totalPercent, avgRate, monthlyInterest }) {
  return (
    <Card className="mt-3">
      <Card.Body>
        <h3 className="section-title mb-3">Total Allocation Summary</h3>
        <Row className="g-3 text-center">
          <Col xs={6} md={3}>
            <p className="mb-0 summary-label">Total Amount</p>
            <p className="mb-0 summary-value">{formatINR(totalAmount)}</p>
          </Col>
          <Col xs={6} md={3}>
            <p className="mb-0 summary-label">Total Percentage</p>
            <p className="mb-0 summary-value">{totalPercent.toFixed(0)}%</p>
          </Col>
          <Col xs={6} md={3}>
            <p className="mb-0 summary-label">Expected Avg. Interest Rate</p>
            <p className="mb-0 summary-value text-success">{avgRate.toFixed(2)}%</p>
          </Col>
          <Col xs={6} md={3}>
            <p className="mb-0 summary-label">Expected Monthly Interest</p>
            <p className="mb-0 summary-value text-success">{formatINR(monthlyInterest)}</p>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function InvestmentPreviewCard({ breakdown, totalAmount }) {
  return (
    <Card>
      <Card.Body>
        <h3 className="section-title mb-3">Investment Preview</h3>
        {breakdown.map((b) => (
          <div key={b.key} className="d-flex align-items-center justify-content-between mb-2">
            <span className="preview-label">{b.label}</span>
            <span className="preview-value">
              {formatINR(b.amount)} <span className="preview-pct">({b.percent.toFixed(0)}%)</span>
            </span>
          </div>
        ))}
        <hr className="my-3" />
        <div className="d-flex align-items-center justify-content-between">
          <span className="preview-label fw-semibold text-dark">Total Investment</span>
          <span className="preview-value fw-semibold text-dark">{formatINR(totalAmount)}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

function BenefitsCard() {
  return (
    <Card className="mt-3">
      <Card.Body>
        <h3 className="section-title mb-3">Benefits You Get</h3>
        {BENEFITS.map((b, i) => (
          <div key={i} className="d-flex align-items-start gap-2 mb-2">
            <CheckCircle2 size={15} className="text-success flex-shrink-0 mt-1" />
            <p className="mb-0 small text-secondary">{b}</p>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}

function ImportantNote() {
  return (
    <div className="important-note d-flex align-items-start gap-2 px-4 mt-3">
      <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-1" />
      <p className="mb-0 small text-secondary">
        <strong className="text-dark">Important Note:</strong> Investment will be allocated
        to eligible loans based on your preferences and borrower availability.
      </p>
    </div>
  );
}

function FooterActions({ onBackToDashboard, onReset, onConfirm }) {
  return (
    <div className="d-flex align-items-center justify-content-between px-4 py-4 gap-2 flex-wrap">
      <Button variant="outline-secondary" className="d-flex align-items-center gap-2" onClick={onBackToDashboard}>
        <ArrowLeft size={15} /> Back to Dashboard
      </Button>
      <div className="d-flex align-items-center gap-2">
        <Button variant="outline-secondary" className="d-flex align-items-center gap-2" onClick={onReset}>
          <RotateCcw size={15} /> Reset
        </Button>
        <Button variant="success" className="d-flex align-items-center gap-2 confirm-btn" onClick={onConfirm}>
          Review &amp; Confirm Investment <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

const initialState = () =>
  LOAN_TYPES.reduce((acc, loan) => {
    acc[loan.key] = { amount: loan.defaultAmount, included: true };
    return acc;
  }, {});

export default function NewInvestmentPage({ onToast, onBackToDashboard, onGoToCustomerAllocation }) {
  const [allocations, setAllocations] = useState(initialState);

  const handleToggle = (key) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], included: !prev[key].included },
    }));
  };

  const handleAmountChange = (key, value) => {
    const num = Math.max(0, Number(value) || 0);
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], amount: num },
    }));
  };

  const handleReset = () => {
    setAllocations(initialState());
    onToast && onToast("Allocation reset to defaults");
  };

  const handleConfirm = () => {
    onToast && onToast(`Reviewing investment of ${formatINR(totalAmount)}`);
    onGoToCustomerAllocation && onGoToCustomerAllocation();
  };

  const totalAmount = useMemo(
    () =>
      LOAN_TYPES.reduce(
        (sum, loan) => sum + (allocations[loan.key].included ? allocations[loan.key].amount : 0),
        0
      ),
    [allocations]
  );

  const breakdown = useMemo(
    () =>
      LOAN_TYPES.map((loan) => {
        const amount = allocations[loan.key].included ? allocations[loan.key].amount : 0;
        const percent = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
        return { key: loan.key, label: loan.label, amount, percent, rate: loan.rate };
      }),
    [allocations, totalAmount]
  );

  const totalPercent = breakdown.reduce((sum, b) => sum + b.percent, 0);

  const avgRate =
    totalAmount > 0
      ? breakdown.reduce((sum, b) => sum + b.rate * (b.amount / totalAmount), 0)
      : 0;

  const monthlyInterest = (totalAmount * avgRate) / 100 / 12;

  return (
    <>
      <PageHeader onBackToDashboard={onBackToDashboard} />

      <Row className="g-3 px-4" xs={1} lg={3}>
        <Col lg={8}>
          <ReservedSpaceCard />
        </Col>
        <Col lg={4}>
          <HowItWorksCard />
        </Col>
      </Row>

      <div className="px-4 mt-4 mb-2">
        <h3 className="section-title mb-1">Choose Loan Types &amp; Allocate Amount</h3>
        <p className="text-muted small mb-0">
          Select loan types and specify how much you want to invest in each
        </p>
      </div>

      <Row className="g-3 px-4">
        <Col lg={8}>
          <Row className="g-3" xs={1} sm={2} xl={2}>
            {LOAN_TYPES.map((loan) => (
              <Col key={loan.key}>
                <LoanTypeCard
                  loan={loan}
                  amount={allocations[loan.key].amount}
                  included={allocations[loan.key].included}
                  onToggle={handleToggle}
                  onAmountChange={handleAmountChange}
                  percentOfTotal={breakdown.find((b) => b.key === loan.key)?.percent || 0}
                />
              </Col>
            ))}
          </Row>

          <TotalAllocationSummary
            totalAmount={totalAmount}
            totalPercent={totalPercent}
            avgRate={avgRate}
            monthlyInterest={monthlyInterest}
          />
        </Col>

        <Col lg={4}>
          <InvestmentPreviewCard breakdown={breakdown} totalAmount={totalAmount} />
          <BenefitsCard />
        </Col>
      </Row>

      <ImportantNote />
      <FooterActions
        onBackToDashboard={onBackToDashboard}
        onReset={handleReset}
        onConfirm={handleConfirm}
      />
    </>
  );
}