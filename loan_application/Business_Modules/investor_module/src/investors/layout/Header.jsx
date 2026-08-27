import React from "react";
import { Row, Col, Button, Dropdown } from "react-bootstrap";
import { Bell, User, ChevronDown } from "../icons/icons";

// TODO: replace with the logged-in investor from auth/context once available
const investor = {
  name: "Rajesh Kumar",
  id: "RN700245",
  date: "05 Jun 2025",
};

export default function Header({ onAction, activeKey }) {
  const isDashboard = activeKey === "dashboard";
  const isNewInvestment = activeKey === "new-investment";
  const isCustomerAllocation = activeKey === "customer-allocation";
  const isProfile = activeKey === "profile";
  
  let title = "Investor Dashboard";
  if (isNewInvestment) title = "New Investment";
  if (isCustomerAllocation) title = "Customer Allocations";
  if (isProfile) title = "Profile";
  
  return (
    <Row as="header" className="align-items-center justify-content-between px-4 py-4 g-3" style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", margin: 0 }}>
      <Col xs="auto" className="d-flex align-items-center gap-3">
        {/* Hamburger placeholder for desktop alignment if needed, or just left aligned title */}
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>{title}</h1>
          {isDashboard ? (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Welcome back, Investor!</p>
          ) : isNewInvestment ? (
            <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ cursor: "pointer" }} onClick={() => onAction("Dashboard")}>Dashboard</span>
              <span style={{ color: "#94a3b8" }}>{'>'}</span>
              <span>New Investment</span>
            </div>
          ) : isCustomerAllocation ? (
            <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ cursor: "pointer" }} onClick={() => onAction("Dashboard")}>Dashboard</span>
              <span style={{ color: "#94a3b8" }}>{'>'}</span>
              <span style={{ cursor: "pointer" }}>My Portfolio</span>
              <span style={{ color: "#94a3b8" }}>{'>'}</span>
              <span>Customer Allocations</span>
            </div>
          ) : isProfile ? (
            <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ cursor: "pointer" }} onClick={() => onAction("Dashboard")}>Dashboard</span>
              <span style={{ color: "#94a3b8" }}>{'>'}</span>
              <span style={{ cursor: "pointer" }}>My Profile</span>
              <span style={{ color: "#94a3b8" }}>{'>'}</span>
              <span>Profile</span>
            </div>
          ) : null}
        </div>
      </Col>
      <Col xs="auto" className="d-flex align-items-center gap-3">
        <Button
          variant="light"
          className="rounded-circle p-0 position-relative"
          onClick={() => onAction("Notifications")}
          style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", background: "#fff" }}
        >
          <Bell size={18} color="#64748b" />
          <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", background: "#ef4444", borderRadius: "50%", color: "#fff", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>8</span>
        </Button>

        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2" role="button" style={{ cursor: "pointer" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <User size={20} color="#94a3b8" />
            </div>
            <div className="lh-sm text-start d-none d-sm-block">
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0 }}>{investor.name}</p>
              <p style={{ fontSize: "11px", color: "#1e3a8a", fontWeight: 600, margin: 0 }}>{investor.id}</p>
            </div>
            <ChevronDown size={14} color="#64748b" className="ms-1" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => onAction("Profile")}>View Profile</Dropdown.Item>
            <Dropdown.Item onClick={() => onAction("Logout")}>Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {isDashboard && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-1 date-btn ms-2"
            onClick={() => onAction("Date filter")}
          >
            {investor.date}
            <ChevronDown size={14} />
          </Button>
        )}
      </Col>
    </Row>
  );
}