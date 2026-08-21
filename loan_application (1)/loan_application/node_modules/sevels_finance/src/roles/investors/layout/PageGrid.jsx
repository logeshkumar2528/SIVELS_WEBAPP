import React from "react";
import { Row } from "react-bootstrap";

/**
 * Shared grid wrapper so every dashboard/page section uses the same
 * gutter + horizontal padding instead of repeating className strings.
 *
 * Usage: <PageGrid xs={1} lg={3}><Col>...</Col></PageGrid>
 */
export default function PageGrid({ xs = 1, md, lg, xl, className = "", children }) {
  return (
    <Row className={`g-3 px-4 mt-1 ${className}`.trim()} xs={xs} md={md} lg={lg} xl={xl}>
      {children}
    </Row>
  );
}