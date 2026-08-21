import React, { useMemo, useState } from "react";
import { Row, Col, Table, Button, Form, Breadcrumb, Container, Modal } from "react-bootstrap";
import {
  Users,
  Wallet,
  CheckCircle2,
  PiggyBank,
  CreditCard,
  Percent,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "../icons/icons";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";
import StatusPill from "../components/StatusPill";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA — swap this block for real API responses later          */
/* ------------------------------------------------------------------ */

const statCards = [
  { label: "Total Customers", value: "10", delta: "Across 4 loan types", icon: Users, tint: "#2563EB", bg: "#EAF1FE" },
  { label: "Total Allocated Amount", value: "₹10,00,000", delta: "100% of investment", icon: Wallet, tint: "#16A34A", bg: "#E9F9EF" },
  { label: "Active Loans", value: "10", delta: "All loans are active", icon: CheckCircle2, tint: "#9333EA", bg: "#F4EBFE" },
  { label: "Total Interest Earned", value: "₹1,24,560", delta: "All time interest earned", icon: PiggyBank, tint: "#EA580C", bg: "#FFF1E7" },
  { label: "EMIs Received", value: "82", delta: "This month", icon: CreditCard, tint: "#0D9488", bg: "#E5FAF6" },
  { label: "Average ROI", value: "15.60%", delta: "Weighted average", icon: Percent, tint: "#DB2777", bg: "#FDEAF3" },
];

const LOAN_TYPE_STYLE = {
  "Personal Loan": { tint: "#2563EB", bg: "#EAF1FE" },
  "Business Loan": { tint: "#16A34A", bg: "#E9F9EF" },
  "Housing Loan": { tint: "#9333EA", bg: "#F4EBFE" },
  "Property Loan": { tint: "#EA580C", bg: "#FFF1E7" },
};

const customers = [
  { name: "Ramesh Kumar", loanId: "LN10231", type: "Business Loan", loanAmount: "₹1,20,000", allocation: "₹75,000", rate: "18.00%", emi: "₹4,950", disbursed: "05 Jun 2025", status: "Active" },
  { name: "Priya Sharma", loanId: "LN10232", type: "Personal Loan", loanAmount: "₹80,000", allocation: "₹50,000", rate: "16.00%", emi: "₹4,250", disbursed: "03 Jun 2025", status: "Active" },
  { name: "Suresh Babu", loanId: "LN10233", type: "Housing Loan", loanAmount: "₹1,60,000", allocation: "₹80,000", rate: "14.00%", emi: "₹10,250", disbursed: "04 Jun 2025", status: "Active" },
  { name: "Kavitha R", loanId: "LN10234", type: "Personal Loan", loanAmount: "₹1,25,000", allocation: "₹40,000", rate: "16.00%", emi: "₹3,650", disbursed: "03 Jun 2025", status: "Active" },
  { name: "Manoj Kumar", loanId: "LN10235", type: "Personal Loan", loanAmount: "₹65,000", allocation: "₹60,000", rate: "16.00%", emi: "₹4,780", disbursed: "03 Jun 2025", status: "Active" },
  { name: "Deepa Lakshmi", loanId: "LN10236", type: "Housing Loan", loanAmount: "₹2,30,000", allocation: "₹90,000", rate: "14.00%", emi: "₹15,930", disbursed: "02 Jun 2025", status: "Active" },
  { name: "Gokul V", loanId: "LN10237", type: "Property Loan", loanAmount: "₹1,10,000", allocation: "₹55,000", rate: "15.50%", emi: "₹6,790", disbursed: "02 Jun 2025", status: "Active" },
  { name: "Sangeetha M", loanId: "LN10238", type: "Personal Loan", loanAmount: "₹95,000", allocation: "₹45,000", rate: "16.00%", emi: "₹4,110", disbursed: "02 Jun 2025", status: "Active" },
  { name: "Vijayalakshmi K", loanId: "LN10239", type: "Business Loan", loanAmount: "₹1,30,000", allocation: "₹1,25,000", rate: "18.00%", emi: "₹9,320", disbursed: "01 Jun 2025", status: "Active" },
  { name: "Ragul M", loanId: "LN10240", type: "Property Loan", loanAmount: "₹85,000", allocation: "₹95,000", rate: "15.50%", emi: "₹6,470", disbursed: "01 Jun 2025", status: "Active" },
];

const LOAN_TYPE_OPTIONS = ["All Loan Types", "Personal Loan", "Business Loan", "Housing Loan", "Property Loan"];
const STATUS_OPTIONS = ["All", "Active", "Overdue", "Closed"];
const DATE_OPTIONS = ["All Time", "Last 7 Days", "Last 30 Days", "This Year"];

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  SECTIONS                                                            */
/* ------------------------------------------------------------------ */

function PageHeader() {
  return (
    <div className="px-4 pt-4 pb-2">
      <Breadcrumb className="ni-breadcrumb mb-1">
        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item>My Portfolio</Breadcrumb.Item>
        <Breadcrumb.Item active>Customer Allocations</Breadcrumb.Item>
      </Breadcrumb>
      <h1 className="page-title mb-0">Customer Allocations</h1>
    </div>
  );
}

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
              <p className="stat-delta mb-0 text-muted">{s.delta}</p>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

function FilterBar({ filters, onFilterChange, onExport }) {
  return (
    <Card className="ca-filter-bar mx-4 mt-3" bodyClassName="p-3">
      <Row className="g-2 align-items-end">
        <Col xs={6} md={2}>
          <p className="ca-filter-label mb-1">Loan Type</p>
          <Form.Select
            size="sm"
            value={filters.loanType}
            onChange={(e) => onFilterChange("loanType", e.target.value)}
          >
            {LOAN_TYPE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={6} md={2}>
          <p className="ca-filter-label mb-1">Customer Status</p>
          <Form.Select
            size="sm"
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={6} md={2}>
          <p className="ca-filter-label mb-1">Allocation Date</p>
          <Form.Select
            size="sm"
            value={filters.date}
            onChange={(e) => onFilterChange("date", e.target.value)}
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={6} md={4}>
          <p className="ca-filter-label mb-1">Search</p>
          <div className="input-icon-wrap">
            <Search size={14} className="input-icon" />
            <Form.Control
              size="sm"
              type="text"
              placeholder="Search by Customer Name / Loan ID"
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="ps-4"
            />
          </div>
        </Col>
        <Col xs={12} md={2} className="d-flex justify-content-md-end">
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-1 w-100 w-md-auto justify-content-center"
            onClick={onExport}
          >
            <Download size={14} /> Export
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

function CustomerTable({ rows, onView }) {
  return (
    <Table responsive borderless hover className="data-table align-middle mb-0">
      <thead>
        <tr>
          <th>#</th>
          <th>Customer Name</th>
          <th>Loan Type</th>
          <th>My Allocation</th>
          <th>Interest Rate (p.a.)</th>
          <th>Disbursed On</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, i) => {
          const typeStyle = LOAN_TYPE_STYLE[c.type] || { tint: "#64748B", bg: "#F1F5F9" };
          return (
            <tr key={c.loanId}>
              <td>
                <div className="d-flex align-items-center justify-content-center customer-avatar">
                  {initials(c.name)}
                </div>
              </td>
              <td>
                <p className="mb-0 small fw-medium text-dark">{c.name}</p>
                <p className="mb-0 activity-desc">{c.loanId}</p>
              </td>
              <td>
                <span
                  className="loan-type-badge"
                  style={{ color: typeStyle.tint, backgroundColor: typeStyle.bg }}
                >
                  {c.type}
                </span>
              </td>
              <td>{c.allocation}</td>
              <td>{c.rate}</td>
              <td>{c.disbursed}</td>
              <td>
                <StatusPill status={c.status} />
              </td>
              <td>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 d-flex align-items-center gap-1 view-action-btn text-decoration-none"
                  onClick={() => onView(c)}
                >
                  <Eye size={14} /> View
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function TablePagination({ page, totalPages, rowsPerPage, totalRows, onPageChange, onRowsPerPageChange }) {
  const start = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalRows);

  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-1 pt-3">
      <div className="d-flex align-items-center gap-2">
        <span className="ca-entries-label">Rows per page</span>
        <Form.Select
          size="sm"
          style={{ width: 70 }}
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        >
          {[5, 10, 20].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Form.Select>
      </div>

      <div className="d-flex align-items-center gap-1">
        <Button
          variant="outline-secondary"
          className="ca-pagination-btn d-flex align-items-center justify-content-center"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </Button>
        {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((p) => (
          <Button
            key={p}
            variant={p === page ? "success" : "outline-secondary"}
            className="ca-page-number"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline-secondary"
          className="ca-pagination-btn d-flex align-items-center justify-content-center"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={14} />
        </Button>
      </div>

      <span className="ca-entries-label">
        Showing {start} to {end} of {totalRows} entries
      </span>
    </div>
  );
}

function CustomerAllocationDetailsCard({ rows, page, totalPages, rowsPerPage, totalRows, onPageChange, onRowsPerPageChange, onView }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Customer Allocation Details" />
      <CustomerTable rows={rows} onView={onView} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Card>
  );
}

function NoteCard() {
  return (
    <div className="note-box d-flex align-items-start gap-2">
      <AlertCircle size={15} className="text-primary flex-shrink-0 mt-1" />
      <p className="mb-0 small text-secondary">
        Interest is calculated based on your allocated amount and received EMI from customers.
      </p>
    </div>
  );
}

function CustomerDetailsModal({ show, customer, onClose }) {
  if (!customer) return null;

  const details = [
    { label: "Customer Name", value: customer.name },
    { label: "Loan Type", value: customer.type },
    { label: "My Allocation", value: customer.allocation },
    { label: "Interest Rate (p.a.)", value: customer.rate },
    { label: "Disbursed On", value: customer.disbursed },
    { label: "Status", value: <StatusPill status={customer.status} /> },
  ];

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">Allocation Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <div className="d-flex align-items-center justify-content-center customer-avatar">
            {initials(customer.name)}
          </div>
          <div>
            <p className="mb-0 small fw-medium text-dark">{customer.name}</p>
            <p className="mb-0 activity-desc">{customer.loanId}</p>
          </div>
        </div>
        <Table borderless size="sm" className="mb-0">
          <tbody>
            {details.map((d) => (
              <tr key={d.label}>
                <td className="text-muted small py-2" style={{ width: "45%" }}>
                  {d.label}
                </td>
                <td className="small fw-medium text-dark py-2">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function CustomerAllocationsPage({ onToast }) {
  const [filters, setFilters] = useState({
    loanType: "All Loan Types",
    status: "All",
    date: "All Time",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleView = (c) => {
    setSelectedCustomer(c);
    setShowModal(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filteredRows = useMemo(() => {
    return customers.filter((c) => {
      const matchesType = filters.loanType === "All Loan Types" || c.type === filters.loanType;
      const matchesStatus = filters.status === "All" || c.status === filters.status;
      const q = filters.search.trim().toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.loanId.toLowerCase().includes(q);
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <>
      <PageHeader />
      <StatCards />
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onExport={() => onToast("Exporting customer allocations…")}
      />

      <Container fluid className="px-4 mt-1">
        <CustomerAllocationDetailsCard
          rows={pageRows}
          page={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          totalRows={filteredRows.length}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => {
            setRowsPerPage(n);
            setPage(1);
          }}
          onView={handleView}
        />
      </Container>

      <Container fluid className="px-4 mt-3 mb-4">
        <NoteCard />
      </Container>

      <CustomerDetailsModal
        show={showModal}
        customer={selectedCustomer}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}