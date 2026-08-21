import React from "react";
import { Toast as BsToast, ToastContainer } from "react-bootstrap";

/**
 * Single global toast for the investor flow. InvestorApp owns the
 * message state and passes it down; every page/card just calls the
 * `onToast(message)` callback it receives as a prop.
 */
export default function Toast({ message, onClose }) {
  return (
    <ToastContainer position="bottom-center" className="p-3">
      <BsToast show={!!message} onClose={onClose} delay={2200} autohide bg="dark">
        <BsToast.Body className="text-white small">{message}</BsToast.Body>
      </BsToast>
    </ToastContainer>
  );
}