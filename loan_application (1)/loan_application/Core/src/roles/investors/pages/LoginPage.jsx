import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { IndianRupee, User, Lock, Eye, EyeOff, AlertCircle } from "../icons/icons";

/**
 * DUMMY credentials for now — replace with a real API call
 * (e.g. POST /api/investor/login) once the backend is ready.
 */
const DUMMY_CREDENTIALS = {
  username: "investor",
  password: "investor123",
};

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);

    // Simulated network delay — swap this block for a real API call later
    setTimeout(() => {
      setIsSubmitting(false);
      if (
        username.trim() === DUMMY_CREDENTIALS.username &&
        password === DUMMY_CREDENTIALS.password
      ) {
        onLoginSuccess({ username: username.trim() });
      } else {
        setError("Invalid username or password.");
      }
    }, 500);
  };

  return (
    <div className="investor-login d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={11} sm={8} md={6} lg={4}>
            <Card className="login-card">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="brand-mark d-inline-flex align-items-center justify-content-center mb-3">
                    <IndianRupee size={22} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h1 className="login-title mb-1">SIVELS FINANCE</h1>
                  <p className="login-subtitle mb-0">Investor Login</p>
                </div>

                {error && (
                  <Alert variant="danger" className="d-flex align-items-center gap-2 py-2 small">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3" controlId="investorUsername">
                    <Form.Label className="small fw-medium">Username</Form.Label>
                    <div className="input-icon-wrap">
                      <User size={16} className="input-icon" />
                      <Form.Control
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="ps-5"
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="investorPassword">
                    <Form.Label className="small fw-medium">Password</Form.Label>
                    <div className="input-icon-wrap">
                      <Lock size={16} className="input-icon" />
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ps-5 pe-5"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="input-icon-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 login-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing in…" : "Sign In"}
                  </Button>
                </Form>

                <p className="login-hint text-center mt-4 mb-0">
                  Demo credentials — username: <strong>investor</strong>, password:{" "}
                  <strong>investor123</strong>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}