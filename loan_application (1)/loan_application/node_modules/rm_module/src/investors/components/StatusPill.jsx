import React from "react";
import { Badge } from "react-bootstrap";

export default function StatusPill({ status }) {
  const isPositive = status === "Active" || status === "Up to Date";
  return (
    <Badge
      pill
      bg={isPositive ? "success-subtle" : "secondary-subtle"}
      text={isPositive ? "success" : "secondary"}
      className="fw-medium status-pill"
    >
      {status}
    </Badge>
  );
}