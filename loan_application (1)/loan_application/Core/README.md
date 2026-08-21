# Sivels Finance Web App

React + Vite application for customer, agent, RM, investor, and admin loan workflows.

## Structure

The project now follows a more scalable layout:

- `src/routes` for route composition
- `src/components/layout` for reusable application shells
- `src/components/common` for shared UI primitives
- `src/pages` for feature screens
- `src/services` for API/domain services
- `src/hooks` for reusable React logic
- `src/styles` for global styling and tokens

## Important Layouts

- `src/components/layout/AppShell/AppShell.jsx` is the shared shell for dashboard-style screens.
- `src/components/layout/DashboardLayout/DashboardLayout.jsx` wraps admin-like pages with top navigation and optional sidebar.
- `src/components/layout/CustomerLayout/CustomerLayout.jsx` uses the shared shell for customer nested routes.

## Routing

- Public auth entry routes live in `src/routes/AppRoutes.jsx`.
- Customer routes are nested under `/customer`.
- Admin and management screens stay as top-level routes for now, but their route lists are grouped so they can be moved into feature route files later.

## Recommended Next Step

The next structural improvement should be to split `src/pages` into feature modules such as:

- `src/features/auth`
- `src/features/customer`
- `src/features/admin`
- `src/features/iam`

Then each feature can own its routes, components, hooks, and service calls.
