import React from "react";
import { Row, Col, Button, Dropdown } from "react-bootstrap";
import { Bell, User, ChevronDown } from "../icons/icons";

// TODO: replace with the logged-in investor from auth/context once available
const investor = {
  name: "Rajesh Kumar",
  id: "RN700245",
  date: "05 Jun 2025",
};

export default function Header({ onAction }) {
  return (
    <Row as="header" className="align-items-center justify-content-between px-4 py-4 g-3">
      <Col xs="auto">
        <h1 className="page-title mb-0">Investor Dashboard</h1>
        <p className="page-subtitle mb-0">Welcome back, Investor!</p>
      </Col>
      <Col xs="auto" className="d-flex align-items-center gap-3">
        <Button
          variant="light"
          className="rounded-circle p-0 header-icon-btn position-relative"
          onClick={() => onAction("Notifications")}
        >
          <Bell size={16} className="text-secondary" />
          <span className="notification-dot" />
        </Button>

        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 header-profile" role="button">
            <div className="avatar-circle d-flex align-items-center justify-content-center">
              <User size={18} className="text-secondary" />
            </div>
            <div className="lh-sm text-start">
              <p className="mb-0 small fw-medium text-dark">{investor.name}</p>
              <p className="mb-0 investor-id">ID: {investor.id}</p>
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => onAction("Profile")}>View Profile</Dropdown.Item>
            <Dropdown.Item onClick={() => onAction("Logout")}>Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        <Button
          variant="outline-secondary"
          size="sm"
          className="d-flex align-items-center gap-1 date-btn"
          onClick={() => onAction("Date filter")}
        >
          {investor.date}
          <ChevronDown size={14} />
        </Button>
      </Col>
    </Row>
  );
}