# Sivels Finance - Safe Cleanup Report

This package is a conservative cleanup based on the original loan_application source plus the supplied Master module.

## Protected
- Existing UI and business flow preserved except the explicitly requested common-login consolidation.
- All 22 Master API files under Master_Module/src/api/masters are preserved byte-for-byte.
- Agent implementation preserved.
- RM in-progress implementation preserved; only its separate login gate/page was removed because the application now uses the single common login.
- Customer API/foundation preserved; customer login/OTP pages that were not used by the Customer App were removed.

## Common login
- Core/src/pages/Login is the only application login UI.
- Core/src/pages/VerifyOTP is the common OTP UI.
- Legacy RM, Customer, Investor and Company login pages were removed.
- Legacy role-specific login URLs redirect to /login.
- RM /logout redirects to /login.

## Runtime routing safety
- /client is served by Core and redirects to /login. This prevents the Customer module from recursively redirecting /client -> /login -> /client.
- Customer pages remain under /client/* (for example /client/dashboard).
- /master is mapped to the Master module and Master Router uses basename /master.

## Removed generated / confirmed unwanted content
- node_modules
- dist
- .vite
- .git metadata
- all_files.txt
- Agent standalone HTML launcher
- unused Vite starter assets
- RM MyAgents backup
- Investor archive and duplicate legacy login/page artifacts
- Company starter TypeScript files that were not referenced
- Master scratch-generate.cjs
- empty files/directories

## Install
Run from the loan_application root:

    npm install
    npm run dev

Do not copy an old node_modules folder into this package.
