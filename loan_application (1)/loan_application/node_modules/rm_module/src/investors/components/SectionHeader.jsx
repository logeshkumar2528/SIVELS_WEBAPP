import React from "react";
import { Button } from "react-bootstrap";

export default function SectionHeader({ title, action, onAction }) {
  return (
    <div className="d-flex align-items-center justify-content-between px-1 pt-1 pb-2">
      <h3 className="section-title mb-0">{title}</h3>
      {action && (
        <Button
          variant="link"
          size="sm"
          className="p-0 text-decoration-none section-action"
          onClick={() => onAction && onAction(`${title} — ${action}`)}
        >
          {action}
        </Button>
      )}
    </div>
  );
}