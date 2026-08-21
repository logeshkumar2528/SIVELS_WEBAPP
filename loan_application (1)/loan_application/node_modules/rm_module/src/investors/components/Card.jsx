import React from "react";
import { Card as BsCard } from "react-bootstrap";

/**
 * Thin wrapper around react-bootstrap's Card so every card in the
 * investor flow shares the same padding/shell without repeating
 * <Card><Card.Body> everywhere.
 */
export default function Card({ children, className = "", bodyClassName = "", fullHeight = false }) {
  return (
    <BsCard className={`${fullHeight ? "h-100" : ""} ${className}`.trim()}>
      <BsCard.Body className={bodyClassName}>{children}</BsCard.Body>
    </BsCard>
  );
}