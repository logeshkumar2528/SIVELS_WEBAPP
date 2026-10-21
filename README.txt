================================================================================
                SIVELS FINANCE - LOAN ORIGINATION WEB APPLICATION
                FULL PROJECT ANALYSIS AND ROLE-WISE FLOW
================================================================================

Repository : SIVELS_WEBAPP
App folder : loan_application/
Analysed   : 19 Oct 2026 (branch state at commit f04b9c6f "Merge pull request #116")
Size       : about 158,000 lines of JavaScript/JSX across 9 front-end modules

This document explains:
  - what the project is and how it is built, run and deployed
  - every user role, how each one logs in, and every screen they use
  - the complete life of a loan application from lead to credit decision
  - every status code and which role moves it
  - the backend API endpoints each module calls
  - what is real, what is still mock/dummy, and the known bugs and gaps

All paths below are relative to loan_application/ unless written in full.


--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------
  1.  Project overview
  2.  Technology stack
  3.  Architecture (multi-module app, URL routing, API layer)
  4.  Folder structure
  5.  How to install, run, build, test and deploy
  6.  Roles at a glance
  7.  Common login flow (all roles)
  8.  Application status codes and the workflow state machine
  9.  End-to-end flow (big picture)
  10. ROLE 1  - Master Admin              (/master)
  11. ROLE 2  - AMS (Area Manager)        (/master/ams-dashboard)
  12. ROLE 3  - Agent                     (/Agent)
  13. ROLE 4  - Relationship Manager (RM) (/rm)
  14. ROLE 5  - Back Office               (/backoffice)
  15. ROLE 6  - Credit Manager            (/credit)
  16. ROLE 7  - Customer                  (/dashboard, /my-loan, ...)
  17. ROLE 8  - Investor                  (/investors)       [demo only]
  18. Company details page                (/company)         [static]
  19. Core management pages (Users/Roles/Groups, KYC demo)   [mock]
  20. Rework loops (Back Office -> RM, Credit Manager -> Back Office)
  21. Master data reference (which master feeds which screen)
  22. API endpoint catalogue
  23. Browser storage keys
  24. Known issues, gaps and mock features (prioritised)
  25. Dead / unused code
  26. Glossary


================================================================================
1. PROJECT OVERVIEW
================================================================================

Sivels Finance is a loan origination system (LOS) for an NBFC. It covers the
journey of a loan from the first lead to the credit decision:

  Agent creates a lead
     -> Relationship Manager (RM) completes the full 11-step loan application
     -> RM "logs" it to Head Office (HO)
     -> Back Office verifies documents, runs credit assessment (CIBIL, PD,
        RTR, banking, eligibility/FOIR, deviations) and builds CAM + KFS
     -> Back Office sends it to the Credit Manager
     -> Credit Manager reviews section by section and Approves / Rejects /
        Returns it to Back Office

An Admin ("Master") manages staff and all master/lookup data. An AMS (area
manager) monitors RMs and agents in their districts. Customer and Investor
portals exist but currently show mostly hardcoded demo data.

There is NO backend code in this repository. The backend is an external REST
API (ASP.NET style) at:
    https://fusiontecsoftware.com/sivels/api
configured through VITE_API_BASE_URL in loan_application/.env and
loan_application/.env.production.


================================================================================
2. TECHNOLOGY STACK
================================================================================

  Framework      : React 19, React Router DOM 7
  Build tool     : Vite 8 (single root vite.config.js, multi-page build)
  Styling        : Plain CSS per component, CSS variables, Tailwind 4 (Core),
                   Bootstrap 5 / react-bootstrap (Core only)
  HTTP           : axios (shared instance in Core/src/api/axiosInstance.js)
                   plus many raw fetch() calls in RM / Back Office pages
  Forms          : react-hook-form + zod (Core customer profile only)
  Icons          : lucide-react, react-icons
  Charts         : recharts
  PDF            : jspdf, html2canvas, html2pdf.js (RM PdfView, CAM, KFS,
                   verification report)
  Toasts         : react-hot-toast (Master module)
  Tests          : vitest + @testing-library/react + jsdom
  Lint           : oxlint
  Hosting        : Cloudflare Workers (worker.js + wrangler.jsonc, static
                   assets in dist/)
  Package layout : npm workspaces (Core, Business_Modules/*, Master_Module)


================================================================================
3. ARCHITECTURE
================================================================================

3.1 One repository, nine separate single-page apps
--------------------------------------------------
Each module has its own index.html, main.jsx and router. They share code by
importing directly from each other's folders (for example Back Office imports
the RM PdfView, Credit Manager embeds the whole Back Office verification
workspace, Agent imports RM status helpers).

  Module             Folder                                URL prefix(es)
  -----------------  ------------------------------------  -----------------------------
  Core (login)       Core/                                 /, /login, /verify, /signup, /otp
  Master / Admin     Master_Module/                        /master, /Master_Module
  Agent              Business_Modules/agent_module/        /Agent
  RM                 Business_Modules/rm_modules/          /rm
  Back Office        Business_Modules/back_office/         /backoffice
  Credit Manager     Business_Modules/credit_manager/      /credit
  Customer           Business_Modules/customer_module/     /client, /dashboard, /my-loan,
                                                           /emi-history, /profile
  Investor           Business_Modules/investor_module/     /investors
  Company details    Business_Modules/company details/     /company   (folder name has a space)

3.2 How a URL reaches the right module
--------------------------------------
Development  : loan_application/vite.config.js contains a "multi-module-router"
               plugin. For each request it matches the URL prefix (table above),
               reads that module's index.html, rewrites /src/ paths to the
               module folder and serves it. Any unmatched URL falls back to Core.

Production   : loan_application/worker.js (Cloudflare Worker) has the same prefix
               table and serves the matching built index.html from dist/.
               "/" goes to Core. IMPORTANT: unlike dev, there is no Core
               fallback, so unlisted paths (/users, /roles, /groups,
               /customer/*, /employment-type-document-mapping) return 404.

Build        : "vite build" at the root produces one multi-page build with nine
               inputs (core, agent, backoffice, investors, rm, customer, credit,
               company, master) into loan_application/dist/.

3.3 API layer
-------------
Core/src/api/axiosInstance.js (and a copy in Master_Module/src/api):
  - baseURL = VITE_API_BASE_URL (fallback https://fusiontecsoftware.com/sivels/api)
  - adds "Authorization: Bearer <localStorage.authToken>" if present
  - removes Content-Type for FormData uploads
  - 30 s timeout
  - on 401/403 it only logs to console (no redirect to login)

Many RM and Back Office pages also call fetch() directly with the same
hardcoded base URL; several of these do not send the auth header.

3.4 The central data record
---------------------------
  AgentAddCustomer        The lead/customer record. Its numeric "status" field
                          is the workflow status for the whole application
                          (see section 8). Its id (agentCustomerId) is the
                          "customer id" used in almost every URL.
  ApplicationProductDetails  The application header (product, amount, tenure,
                          ROI, agent/RM owner). Its id (applicationProductDetailsId,
                          "appProdId") keys all application child tables and
                          Back Office data.
  Child tables chain:     ApplicationProductDetails
                            -> ApplicationKYCDocuments (one per person,
                               ApplicantSequence 0 = applicant, 1..n = co-applicants)
                            -> ApplicationPersonalInformation
                            -> ApplicationAddressDetails
                            -> ApplicationEmploymentIncomeDetails
                            -> ApplicationBankExistingLoanDetails
                               (+ ApplicationBankActiveLoanDetails,
                                  ApplicationBankCreditCardDetails)
                          plus ApplicationReferenceDetails and
                          ApplicationCollateralDetails (keyed by appProdId).
  ApplicationFullDetails/{agentCustomerId}  Aggregated read of everything above.


================================================================================
4. FOLDER STRUCTURE
================================================================================

SIVELS_WEBAPP/
  README.md                  (one line)
  README.txt                 (this file)
  loan_application/
    package.json             workspace root, scripts dev/build/preview/test/lint
    vite.config.js           multi-module dev router + multi-page build
    vitest.config.js         tests: Business_Modules/**/src/**/*.test.{js,jsx}
    worker.js, wrangler.jsonc  Cloudflare deployment
    .env, .env.production    VITE_API_BASE_URL
    CLEANUP_REPORT.md        notes from an earlier cleanup (partly outdated)
    dist/                    committed build output (changes on every build)

    Core/src/
      api/axiosInstance.js
      context/AuthContext.jsx, LoadingContext.jsx
      pages/Login, VerifyOTP            <- the only login for every role
      pages/Users, Roles, Groups        <- RBAC screens (mock services)
      pages/CustomerProfile, CustomerVerification, CustomerRegistration,
            CustomerLoanOffer           <- customer KYC demo (mock)
      pages/EmploymentTypeDocumentMapping  (duplicate of Master's page)
      services/moduleDetectionService.js   <- detects role from mobile number
      services/authService.js              <- send/verify OTP
      services/agentCustomerService.js, customerDocumentService.js,
               masterService.js            <- real shared services
      services/userService, roleService, permissionService,
               userRoleService             <- mock (API calls commented out)
      utils/constants.js (STATIC_LOGIN_OTP), ownershipHelper.js,
            profileImageHelper.js, documentTypeHelper.js, dateHelper.js ...

    Master_Module/src/
      App.jsx (all routes), components/navbar/Navbar.jsx (mega menu)
      pages/Dashboard, AMSDashboard, CreateUser, Agent, RelationshipManager,
            AMS, BackOffice, CreditManager, PeopleDirectory, Customer,
            Application360, masters/* (42 master screens)
      features/company/*     company configuration (15 entities)
      api/*, api/masters/*   42 master API files
      *.cjs                  one-off code-rewrite scripts (do not re-run)

    Business_Modules/
      agent_module/src/agent/      pages: Dashboard, AddCustomer,
                                   SubmissionHistory, Profile
      rm_modules/src/              pages: Dashboard, AddCustomer,
                                   NewApplications, 11 wizard steps, PdfView,
                                   FieldVerification, MyAgents, histories,
                                   RmProfile; state/ApplicationDraftContext.jsx
      back_office/src/back-office/ pages: Dashboard, monitoring pages,
                                   CustomerMonitoring, CustomerVerification
                                   (19,281 lines - the 15-step workspace),
                                   SubmitToCredit, ReturnedByCredit, Profile;
                                   components: CamReport, KfsReport,
                                   RtrCommonSheet, AssetBase, DeviationAssessment,
                                   CreditReturnPanel, VerificationReportPdf ...
      credit_manager/src/          pages: Dashboard, Received/Pending/Approved/
                                   Rejected queues, ApplicationReview, Reports,
                                   MyProfile; CreditDecisionModal, SectionReviewBar
      customer_module/src/         pages: Dashboard, MyLoan, EMIHistory, Profile,
                                   PendingApproval
      investor_module/src/investors/  pages: Dashboard, NewInvestment,
                                   CustomerAllocations, Profile
      company details/src/         Companyinfo/CompanyInfo.jsx


================================================================================
5. HOW TO INSTALL, RUN, BUILD, TEST AND DEPLOY
================================================================================

  cd loan_application
  npm install            # installs all workspaces at the root
  npm run dev            # http://localhost:5173  (opens Core login)
  npm run build          # builds all 9 modules into dist/
  npm run preview        # serve the build locally
  npm test               # vitest (7 test files, see below)
  npm run lint           # oxlint for back_office workspace

Deploy (Cloudflare): build, then "npx wrangler deploy" using wrangler.jsonc
(assets directory ./dist, worker.js handles routing).

Test files present:
  back_office: CreditReturnPanel.test.jsx, creditReturnMapper.test.js,
               normalIncomeSheetParser.test.js, ReturnedByCredit.test.jsx
  credit_manager: CreditDecisionModal.test.jsx, SectionReviewBar.test.jsx
  rm_modules: kycDocumentState.test.js

Local login for testing: any mobile number that exists in one of the staff
masters / customer table, OTP "123456" (static OTP, see section 24).
Mobile 9345638126 always logs in as Master Admin.


================================================================================
6. ROLES AT A GLANCE
================================================================================

 Role            Login table (matched     Landing page             Main job
                 by mobile number)
 --------------  -----------------------  -----------------------  --------------------------------
 Master Admin    hardcoded 9345638126     /master/dashboard        Staff + master data + company
 AMS             /AMSMaster               /master/ams-dashboard    View-only monitoring of districts
 Back Office     /BackOfficeMaster        /backoffice/dashboard    Verification + underwriting
 Credit Manager  /CreditManagerMaster     /credit (dashboard)      Final credit decision
 RM              /RMMaster                /rm/dashboard            Full loan application
 Agent           /AgentMaster             /Agent/dashboard         Lead creation
 Customer        /AgentAddCustomer        /dashboard               View own loan (demo data)
 Investor        (no login role exists)   /investors/dashboard     Demo only
 Company page    (public, no login)       /company                 Static "about" page

Detection priority when one mobile exists in several tables:
  BackOffice > CreditManager > AMS > RM > Agent > Customer


================================================================================
7. COMMON LOGIN FLOW (ALL ROLES)
================================================================================

Files: Core/src/pages/Login/Login.jsx, Core/src/pages/VerifyOTP/VerifyOTP.jsx,
       Core/src/services/moduleDetectionService.js, Core/src/services/authService.js

There is one login screen for every role. There are no usernames/passwords;
a person can log in if their mobile number is on a staff/customer record.

 STEP 1  /login - user types a 10-digit mobile number (+91 shown).
 STEP 2  detectAccountModule(mobile) calls in parallel:
           GET /AgentMaster, /RMMaster, /AMSMaster, /AgentAddCustomer,
               /BackOfficeMaster, /CreditManagerMaster
         The number is normalised (strip +91, 91, 0, spaces) and compared with
         each record's mobile field in the priority order above.
         - Not found  -> "No account found with this mobile number"
         - 9345638126 -> Master Admin (even if not in any table, and even if
                         every API call fails)
 STEP 3  POST /MobileOtp/send-mobile-otp  { phoneNumber, purpose: 'Login' }
 STEP 4  Navigate to /verify with { mobileNumber, module, destination,
         accountData } in router state (refreshing /verify returns to /login).
 STEP 5  User enters 6-digit OTP (resend timer 45 s).
         - If OTP == "123456" (CONSTANTS.STATIC_LOGIN_OTP) -> accepted without API
         - else POST /MobileOtp/verify-mobile-otp { mobileNumber, otp }
           success if success/isSuccess true or message "login successful"
 STEP 6  Session saved in localStorage:
           authToken            (if backend returned token)
           sivels_currentUser   {...account, mobileNumber, role}
           sivels_permissions, sivels_roles (from response menus/roles, via AuthContext)
         plus per role:
           Agent         agentData, agentId
           RM            rmData, rmId
           AMS           amsData, amsId
           Customer      customerData, customerId
           Master        masterData
           BackOffice    backOfficeData, backOfficeId, backOfficeAuth
           CreditManager creditManagerData, creditManagerId, creditManagerAuth
 STEP 7  window.location.href = role landing page (section 6).

Legacy URLs /rm/login, /Agent/login, /investors/login, /company/login,
/signup redirect to /login; /otp redirects to /verify.

Route protection after login:
  - Back Office  : ProtectedRoute (redirects to /login if no back-office session)
  - Credit Mgr   : ProtectedRoute (redirects to /login if no credit-manager session)
  - Master, AMS, Agent, RM, Customer, Investor : NO guard. Pages open for
    anyone who knows the URL; they just show empty or fallback data.

Logout: each module clears its own keys and goes to /login. None of them
removes authToken.


================================================================================
8. APPLICATION STATUS CODES AND WORKFLOW STATE MACHINE
================================================================================

The status lives in AgentAddCustomer.status.

  Code  Meaning                         Shown as (RM/Agent)  Who is working on it
  ----  ------------------------------  -------------------  ----------------------
   0    New / Draft lead                New                  Agent (or RM for own lead)
   1    RM Pending (RM opened it)       RM Pending           RM
   2    Logged to HO                    Logged to HO         Back Office
   3    Under Credit review             CM Pending           Credit Manager
   4    Approved (sanctioned)           (raw "4")            nobody - end of system
   5    Rejected                        (raw "5")            nobody - end
   6    Returned to RM                  BO Returned          RM

Transitions and the API that performs each one:

  0 -> 1   RM clicks "Verify Now" or opens Step 1 Application Details
           PUT /AgentAddCustomer/{id}  {status: 1}
  1 -> 2   RM submits Step 11 Declaration
           PUT /AgentAddCustomer/{id}  {status: 2, modifiedBy: rmId}
  2 -> 6   Back Office "Return to RM" (Final Action step)
           POST /ApplicationWorkflow/{id}/return-to-rm               (ReturnedToRM)
  6 -> 2   RM "Resubmit to Back Office" (on the PDF review page)
           POST /ApplicationWorkflow/{id}/resubmit-to-back-office    (ResubmittedToBackOffice)
  2 -> 3   Back Office "Send to Credit Manager"
           POST /ApplicationWorkflow/{id}/send-to-credit-manager     (SentToCreditManager /
                                                                      ResubmittedToCreditManager)
  3 -> 2   Credit Manager "Return to Back Office"
           POST /ApplicationWorkflow/{id}/return-to-backoffice       (ReturnedToBackOffice)
  3 -> 4   Credit Manager "Approve"
           POST /ApplicationWorkflow/{id}/credit-approve             (CreditApproved)
  3 -> 5   Credit Manager "Reject"
           POST /ApplicationWorkflow/{id}/credit-reject              (CreditRejected)

History of every transition: GET /ApplicationWorkflow/{id}/history

Diagram:

                 Agent / RM creates lead
                          |
                          v
                     [0] NEW
                          |  RM opens (Verify Now)
                          v
                  [1] RM PENDING  <------------------------------+
                          |  RM Declaration submit               |
                          v                                      |
   +------------>  [2] LOGGED TO HO  ----- return-to-rm ----> [6] RETURNED TO RM
   |                      |              <- resubmit-to-back-office -+
   | return-to-           |  send-to-credit-manager
   | backoffice           v
   +--------------  [3] CM PENDING
                     |          |
          credit-approve     credit-reject
                     v          v
             [4] APPROVED   [5] REJECTED

Smaller per-item loops that do NOT change the main status:
  - Document rejection (Back Office -> RM for one document):
      BackOfficeDocumentRejection: ReturnedToRM -> Resubmitted -> Verified
  - Credit return items (Credit Manager -> Back Office, per field):
      ApplicationCreditReturnItem: Open -> Resolved -> Resubmitted ->
                                   Accepted (or Reopened)

WARNING: status labels are NOT consistent across screens (section 24).


================================================================================
9. END-TO-END FLOW (BIG PICTURE)
================================================================================

 [MASTER ADMIN]  sets up masters (products, ROI, FOIR, RTR norms, deviations,
                 documents...), company settings, and creates AMS, RM, Agent,
                 Back Office and Credit Manager records (mobile = login).
        |
        v
 [AGENT]  /Agent/add-customer
          name, mobile, email, employment type, loan product, expected amount,
          remarks + mandatory documents for that employment type
          -> POST /AgentAddCustomer (status 0) + POST /AgentCustomerDocument/upload
        |
        |   (or the RM creates a lead directly: /rm/add-customer, then
        |    "Promote to Application" -> POST /RMAddCustomer/{id}/promote)
        v
 [RM]  /rm/applications/new -> "Verify Now" (status 0 -> 1)
       11-step wizard:
         1 Application details  2 KYC documents (Aadhaar OTP)  3 Personal
         4 Address  5 Employment & income  6 Banking & existing loans
         7 References  8 Collateral  -> PDF review of whole form
         9 Schedule of charges  10 Document checklist  11 Declaration
       Declaration submit -> status 2 "Logged to HO"
        |
        v
 [BACK OFFICE]  /backoffice/customers (queue of status >= 2) -> "Verify Now"
       15-step verification workspace:
         1 View form  2 KYC document verification  3 Field/legal/technical
         4 CIBIL  5 Health check  6 PD sheet  7 Asset base  8 RTR common sheet
         9 Banking  10 Eligibility (Salaried / Normal Income Excel / RTR /
         Banking)  11 Deviations  12 Recommendation  13 CAM  14 KFS
         15 Final action
       - documents with problems -> returned to RM one by one
       - whole application wrong -> "Return to RM" (status 6)
       - all ready -> "Send to Credit Manager" (status 3)
        |
        v
 [CREDIT MANAGER]  /credit/pending -> "Review"
       must read CAM first, then reviews the same 15 steps,
       approves each of 16 review sections or flags them
       -> Approve (amount, ROI, tenure, conditions)   status 4
       -> Reject (reason)                              status 5
       -> Return to Back Office (list of field issues) status 2
             Back Office fixes items, resolves them, resubmits (status 3)
        |
        v
 [END]  Nothing in this codebase handles status 4 further (no disbursement,
        no loan account, no EMI schedule). The Customer portal shows
        hardcoded loan/EMI data.

 [AMS]  watches RMs / agents / pipeline in their districts (read only).


================================================================================
10. ROLE 1 - MASTER ADMIN   (Master_Module, URL prefix /master)
================================================================================

Login   : mobile 9345638126 (hardcoded) + OTP. Lands on /master/dashboard.
Guard   : none inside /master. Every createdBy/modifiedBy sent = 1
          (Master_Module/src/utils/authHelper.js is a mock).
Layout  : top Navbar only (no sidebar).

10.1 Navbar (left to right)
  Sivels Finance brand | Back button | Dashboard | Application 360 |
  Masters mega-menu (searchable) | Logout (confirm)

  Masters mega-menu groups:
    DOCUMENTS            Document Type, Customer Document Type, Proof Master,
                         Employment Doc Mapping
    LOANS & FINANCE      Loan Type, Loan Product, Loan Purpose, Loan Transaction
                         Type, Loan Product Variation, Loan Product Tenure, Loan
                         Product Collateral, Interest Type, Rate Of Interest,
                         FOIR, RTR Norm Master, RTR Loan Status
    CUSTOMER DETAILS     Title, Gender, Marital Status, Relationship, Education,
                         Religion, Caste
    BANKING & LOCATION   Bank, Bank Branch, Country, State, District, City,
                         Property, Property Usage
    VERIFICATION         Verification, PD Verification Type, Health Check Type,
                         Mortgage Status, Deviation List, CIR Deviations,
                         Negative FI Deviations
    OTHER MASTERS        Sourcing Channel, Employment Type, Industry Type,
                         Assessment Method
    COMPANY CONFIGURATION  -> /master/company
  (Status and Status Role masters have routes but are NOT in the menu.)

10.2 Routes
  /master/dashboard                      Admin dashboard
  /master/create-user                    Create any staff user (5 role forms)
  /master/agents                         People directory - agents
  /master/relationship-managers          People directory - RMs
  /master/back-office                    People directory - back office
  /master/ams                            People directory - AMS
  /master/credit-managers                People directory - credit managers
  /master/customers                      People directory - customers/leads
  /master/add-agent, /edit-agent/:id     Agent form
  /master/create-relationship-manager, /edit-relationship-manager/:id
  /master/create-credit-manager, /edit-credit-manager/:id
  /master/edit-ams/:id                   (create only via /create-user)
  /master/edit-back-office/:id           (create only via /create-user)
  /master/edit-customer/:id              Edit lead (only when status 0)
  /master/application-360                Full application viewer by PAN
  /master/ams-dashboard                  AMS console (section 11)
  /master/company                        Company configuration
  /master/masters/<name>                 44 master tables (default interest-type)

10.3 Admin Dashboard flow
  - Header "MASTER WORKSPACE / Admin Dashboard" + "Create User" button.
  - Six directory cards with live counts: Agents, Relationship Managers,
    Back Office, AMS, Credit Managers, Customers (applications).
  - Data: GET /AgentMaster, /AgentAddCustomer, /RMMaster, /AMSMaster,
    /BackOfficeMaster, /CreditManagerMaster.
  - Click a card -> People Directory for that role.

10.4 Create staff flow (/master/create-user)
  Choose role card (Agent / RM / AMS / Back Office / Credit Manager) -> form
  renders on the same page -> Save. Saving the record with a mobile number is
  what gives the person login access. Staff codes are generated by backend.

  AMS  (AMSCreate.jsx)
    Fields: full name*, DOB, gender (/gender), address, state (/State),
      city (/City filtered by state), pincode (6 digits), mobile*
      (^[6-9]\d{9}$), email*, branch (Bank Branch list), date joined (today),
      account number (9-18 digits), IFSC (^[A-Z]{4}0[A-Z0-9]{6}$),
      DISTRICTS (multi-select, at least 1), Aadhaar/PAN (PDF/JPG/PNG <=10 MB),
      profile image (<=5 MB), active.
    Save: POST /AMSMaster (or PUT /AMSMaster/{id})
          -> POST /AMSDistrictMapping {amsId, districtIds}
          -> POST /AMSMaster/upload-aadhar/{id}, /upload-pan/{id},
             /upload-profile-image/{id}

  AGENT  (AgentCreate.jsx)
    Fields: full name, DOB, gender (hardcoded 1/2/3), Relationship Manager
      (dropdown from /RMMaster - sets the agent's rmId and branch), branch,
      mobile (10 digits), address, email, state (free text), pincode,
      date joined, bank account, IFSC, Aadhaar, PAN (required on create),
      profile image.
    Hierarchy: Agent -> RM via rmId (falls back silently to 1 if none).
    Save: POST /AgentMaster (or PUT) -> POST /AgentMaster/{id}/upload-aadhaar,
          /upload-pan -> PUT /AgentMaster/{id}/profile-image

  RELATIONSHIP MANAGER  (RelationshipManagerCreate.jsx)
    Fields: same personal/bank fields, state & city dropdowns, branch, email*.
    GAP: no AMS or district field, but the AMS dashboard needs rm.districtId
    or rm.amsId to know which RMs belong to an AMS.
    Save: POST /RMMaster (or PUT) -> POST /RMMaster/upload-aadhar/{id},
          /upload-pan/{id} -> PUT /RMMaster/replace-profile-image/{id}

  BACK OFFICE  (BackOfficeCreate.jsx)
    Fields: as RM + single district (filtered by state), email optional.
    Save: POST /BackOfficeMaster (or PUT) -> POST /BackOfficeMaster/{id}/aadhar,
          /pan, /profile-image

  CREDIT MANAGER  (CreditManagerCreate.jsx)
    Fields: as Back Office. Toggle "Allow this credit manager to log in,
      evaluate, and sanction loans."
    Save: POST /CreditManagerMaster (or PUT) -> upload-aadhar/pan/profile-image
          on create, replace-aadhar/pan/profile-image on edit.

10.5 People Directory (/master/<role list>)
  Search, 10 rows per page, "Add user" button, view-details modal (with
  Aadhaar/PAN/photo preview) and edit button per row.
  Customers tab: App/Customer ID, customer, loan purpose, expected amount,
  agent/RM, status; Edit only when status = 0.

10.6 Customer edit (/master/edit-customer/:id)
  GET /AgentAddCustomer/{id}; edit full name, mobile, email, remarks only if
  status 0; PUT /AgentAddCustomer/{id} with changed fields.

10.7 Application 360 (/master/application-360)
  Search by PAN (^[A-Z]{5}[0-9]{4}[A-Z]$) -> GET /ApplicationFullDetails/search?panNumber=
  Header: App ID, PAN, mobile, applied date, status label, loan amount,
  tenure, ROI, channel, assigned RM. Tabs:
    1 Overview          application summary, loan/product, agent -> RM chain
    2 Applicants        personal, address, employment, bank per person
    3 KYC & Documents   photo, masked Aadhaar, PAN, uploaded docs (download)
    4 Financials & Collateral  income totals, bank accounts, collateral, references
    5 Verifications & Checks   health checks, field verification
    6 Eligibility & Underwriting  eligibility assessments, FOIR, RTR assessment

10.8 Company configuration (/master/company)
  15 entities in four groups, each with list/search/add/edit/delete via
  /company/<entity> (GET, GET/{id}, POST, PUT/{id}, DELETE/{id}):
    Company Foundation    : companytypemaster, companymaster, companyaddresstypemaster,
                            companyaddressmaster
    Finance & Lending     : companybankaccountmaster, companynumberseries,
                            companyfinancialsetting, companyloansetting,
                            companyaccountingdetail
    Communication         : companycontactpersonmaster, companyemailconfiguration,
                            companysmsconfiguration, companydigitalsignature
    Compliance & Calendar : companydocument, companyholidaycalendar
  companyloansetting (processing fee %, insurance %, limits) and
  companymaster/address/contact are used by Back Office CAM and KFS reports.

10.9 Masters (/master/masters/<name>)
  Every master screen: list with search, Active/Inactive filter, pagination
  (5/10/25/50/100), add/edit modal, delete confirm. Full list in section 21.


================================================================================
11. ROLE 2 - AMS (AREA MANAGER)   (/master/ams-dashboard)
================================================================================

Login   : mobile found in /AMSMaster -> /master/ams-dashboard.
Access  : view-only; Navbar hides everything except Logout.
File    : Master_Module/src/pages/AMSDashboard/AMSDashboard.jsx

Sidebar (MONITORING): Overview, Loan Pipeline (pending count), RM monitoring,
Agent monitoring, Application status, "View-only access" note, Logout.

Flow:
  1. Identify AMS from amsData / amsId / sivels_currentUser.
  2. GET /AMSDistrictMapping/ams/{amsId}   -> districts the AMS covers
     GET /RMMaster, /AgentMaster, /AgentAddCustomer, /AMSMaster/{id}
  3. Scope:
       RMs       whose districtId/districtName is in the AMS districts OR rm.amsId = AMS
       Agents    whose RM is in scope OR who are in the districts
       Customers whose agent or RM is in scope
  4. Shows: counts (districts, RMs, agents, pending applications), district
     cards with progress, pipeline total (sum of expected amount), RM table
     with "On track"/"Needs review" (needs review = more than 5 pending),
     agent cards -> modal with that agent's customers, "What needs attention".
  5. AMS can upload own profile photo: PUT /AMSMaster/profile-image/{id}.

Note: because the RM form has no district/AMS field, RMs may not appear for an
AMS unless the backend fills districtId/amsId. AMS dashboard labels status 3
as "Rejected" (wrong - 3 is CM Pending).


================================================================================
12. ROLE 3 - AGENT   (Business_Modules/agent_module, URL prefix /Agent)
================================================================================

Login   : mobile found in /AgentMaster -> /Agent/dashboard.
Guard   : none (unauthenticated users see empty screens).
Identity: hooks/useAgentIdentity.js -> agentId from sivels_currentUser, then
          GET /AgentMaster/{agentId} (fallback GET /AgentMaster matched by mobile).
Ownership: every list loads ALL leads (GET /AgentAddCustomer) and filters in the
          browser by AgentId / CreatedByUserId.

12.1 Routes and sidebar
  /Agent/dashboard            Dashboard
  /Agent/add-customer         Create lead  (?id=<id>&mode=edit to edit)
  /Agent/submission-history   My leads (view / edit / delete)
  /Agent/profile              Profile + photo upload
  (/Agent and /Agent/customers/new redirect)

  Sidebar: Dashboard | Submission History (badge = total leads) |
           Profile | Logout | "Need Help?" mailto:support@sivelsfinance.com
  "Add New Customer" button is on the Submission History page.

12.2 Dashboard
  Info cards: Agent ID, branch, today's date, "Last Login" (fake = now).
  Stat cards: Today's Customers, Pending to RM, Total Submitted,
    EMI Pending (hardcoded 30), Pending to Backoffice.
  Table toggles: "Pending Loans (Collection)" (8 hardcoded dummy rows) or
    "Submitted Customers" (real, with photo and status badge).

12.3 LEAD CREATION FLOW (/Agent/add-customer)  - the agent's main job
  On open: GET /EmploymentType, /LoanProductMaster (active),
           /CustomerDocumentTypeMaster
  Section 1 Basic Information
    Full name*      letters and spaces only
    Mobile*         ^[6-9][0-9]{9}$
    Email           optional
  Section 2 Loan Requirement
    Employment type*, Loan product*, Expected loan amount* (> 0), Remarks*
  Section 3 Required Documents (appears after employment type chosen)
    GET /EmploymentTypeDocumentMapping/byemploymenttype/{employmentTypeId}
    One card per mapped document; mandatory ones marked *.
    PDF/JPG/JPEG/PNG, max 10 MB; "Other" type allows many files.
  Submit:
    1. Validate -> "Confirm Customer Creation" dialog
    2. POST /AgentAddCustomer
         {agentId, fullName, mobileNumber, email, employmentTypeId,
          loanProductId, expectedLoanAmount, remarks, status: 0,
          isActive: true, createdBy: agentId}
    3. For each file: POST /AgentCustomerDocument/upload
         (file, agentCustomerId, customerDocumentTypeId, createdBy)
       Failed uploads can be retried without creating a duplicate lead.
    4. Success overlay: Reference REF<agentCustomerId>, "Pending RM Review",
       auto-redirect to Submission History in 5 s.
  Result: lead in status 0 "New". It appears for the RM the agent is mapped
  to (AgentMaster.rmId) in RM "New Applications".

  Edit mode (only while status New/Draft):
    GET /AgentAddCustomer/{id} + GET /AgentCustomerDocument/bycustomer/{id}
    PUT /AgentAddCustomer/{id} + upload new files.

12.4 Submission History
  Filters (applied on Search): name/mobile, from/to date, status
    (All, New, RM Pending, CM Pending, BO Returned, Logged to HO).
  Columns: S.No, photo, name, mobile, expected amount, submitted on, status,
    actions. Page size 5/7/10.
  Actions: View Details (drawer) always; Edit + Delete only when New/Draft.
    Delete: DELETE /AgentAddCustomer/{id}?modifiedBy={agentId}
  View drawer: basic info, loan requirement, documents in two tabs:
    "Original Documents" (/AgentCustomerDocument/bycustomer/{id}) and
    "Updated Documents" (replacements found in /BackOfficeDocumentRejection).

12.5 Profile
  Read-only details from AgentMaster; only the photo can change:
  PUT /AgentMaster/{agentId}/profile-image. Commission section is hardcoded.


================================================================================
13. ROLE 4 - RELATIONSHIP MANAGER (RM)  (Business_Modules/rm_modules, /rm)
================================================================================

Login   : mobile found in /RMMaster -> /rm/dashboard.
Guard   : none (isAuthenticated is hardcoded true; pages show
          "No RM context found in session" if rmId missing).
Identity: utils/rmContext.js getCurrentRMContext() -> rmId from
          sivels_currentUser / rmData.
"My" data: agents with AgentMaster.rmId = me; applications created by my
          agents OR owned by me directly (ApplicationProductDetails.rmId).

13.1 Sidebar (navConfig.js) and routes
  Dashboard                          /rm/dashboard
  APPLICATIONS
    Add Customer                     /rm/add-customer
    New Applications       (badge)   /rm/applications/new
    Pending Applications   (badge)   /rm/applications/pending
    Logged to HO           (badge)   /rm/applications/approved
    Returned Applications  (badge)   /rm/applications/returned
    RM's Customer Submission History /rm/applications/customer-submission-history
  MANAGEMENT
    My Agents              (badge)   /rm/agents
  BOTTOM: My Profile (/rm/profile), Logout (confirm -> /login)

  Not in sidebar: /rm/applications/submission-history (from dashboard card),
  /rm/applications/field-verification[/:id][/step-2] (URL only).

  Wizard routes: /rm/applications/new/:applicationId/<step>
    application-details, kyc-documents, personal, address, employment,
    banking, reference, collateral, charges, checklist, declaration, pdf-view

13.2 Dashboard
  Data (also loaded on every page by the layout for badges):
    GET /AgentMaster, /AgentAddCustomer, /RMMaster,
        /BackOfficeDocumentRejection/rm/{rmId}/returned, /ApplicationProductDetails
  8 cards: Total, New, Pending, In Progress (local drafts), Logged to HO,
    Active Agents, My Profile, Submission History.
  "Recent Applications Requiring Action" (Verify button), Application Status
  donut, Field Agent Performance table (pending collection value is fake).

13.3 My Agents
  GET /RMMaster, /AgentMaster, /AgentAddCustomer. KPIs, search/area/status
  filter, agent table with View modal (GET /AgentMaster/{id}).
  The RM cannot create agents in the UI (AddAgent page exists but is not
  routed) - agents are created by Master Admin.

13.4 RM's OWN LEAD FLOW
  A) /rm/add-customer  (same form as Agent)
     full name, mobile (^[6-9]\d{9}$), email, employment type, loan product,
     expected amount, remarks, mapped mandatory documents.
     POST /AgentAddCustomer {rmId, ..., status: 0, createdBy: rmId}
     POST /AgentCustomerDocument/upload per document
     -> goes to Customer Submission History.
  B) /rm/applications/customer-submission-history
     Shows leads with createdByRole = 'rm', no agent, owned by me.
     "Promote to Application" -> POST /RMAddCustomer/{id}/promote with
       defaults (first sourcing channel, product from loan purpose, "New"
       transaction type, tenure 60, "Fixed" interest type, ROI from
       RateOfInterestMaster or 10, distance 5, 0 co-applicants, "Verified"
       verification id). Then -> New Applications.

13.5 APPLICATION QUEUES (NewApplications.jsx - one component, 4 filters)
  Data: same 5 calls as dashboard. Filters: search, from/to date, status.
  Columns: S.No, customer code, name, mobile, loan purpose, amount, field
  agent, date, status, actions.
  Actions:
    New / Pending  -> "Verify Now" (if status 0: PUT status 1) -> Step 1
    Logged to HO   -> "View Form" (PDF), "View Details" (?mode=view),
                      "Edit" only if status 2 AND Back Office has not yet
                      verified any step (GET /BackOfficeStepVerification/application/{id})
    Returned       -> see 13.9

13.6 THE 11-STEP LOAN APPLICATION WIZARD
  Common behaviour:
    - Header "Step X of 11" + application summary; footer Back / Continue.
    - Draft copy kept in localStorage "sivels-rm-onboarding-drafts-v9"
      (ApplicationDraftContext). Each step ALSO saves to the backend on
      Continue.
    - On open the draft is (re)loaded from GET /ApplicationFullDetails/{id}
      (fallback: individual Application* tables filtered in browser).
    - ?mode=view = read-only (fieldset disabled, nothing saved).
    - No clickable stepper and no step locking: move with Next/Back only,
      but any step can be opened by URL.
    - Applicant + co-applicants: ApplicantSequence 0 = applicant, 1..n.

  STEP 1  APPLICATION DETAILS   (/application-details)
    Loads: SourcingChannelMaster, LoanProductMaster, LoanTransactionTypeMaster,
      InterestTypeMaster, LoanPurposeMaster, LoanProductVariationMaster,
      RateOfInterestMaster, /masters/LoanProductTenureMaster/product/{id},
      agent (/AgentMaster/{id}) and RM (/RMMaster/{id}).
    Sets status 0 -> 1 if still New.
    Fields: sourcing channel (not needed if RM-sourced), purpose of loan,
      loan product (auto from purpose), variation (required for HL/LAP),
      transaction type, loan amount > 0, tenure (months), interest type,
      ROI, number of co-applicants (>= 0), distance from branch (km).
    Save: POST/PUT /ApplicationProductDetails
      {AgentCustomerId, AgentId|RmId, SourcingChannelId, LoanProductId,
       LoanProductVariationId, LoanTransactionTypeId, LoanPurposeId,
       LoanAmount, LoanTenure, InterestTypeId, ROI, DistanceFromBranch,
       NoOfCoApplicants, CreatedBy}
    -> applicationProductDetailsId is stored and used by all later steps.

  STEP 2  KYC DOCUMENTS   (/kyc-documents)   [per applicant and co-applicant]
    Loads: DocumentTypeMaster, VerificationMaster, EmploymentTypeDocumentMapping.
    Per person: profile photo, Aadhaar (12 digits) + Aadhaar file, PAN
      (10 chars) + PAN file, salary slip, bank statement, identity document
      type/number, verification status, extra manual documents (count + files),
      customer proofs (CustomerProofModal).
    Aadhaar OTP: POST /ApplicationKYCDocuments (create row if needed)
      -> POST /AadhaarKyc/initiate {kycDocumentId, aadhaarNumber}
      -> POST /AadhaarKyc/verify   {kycDocumentId, otp} -> "Verified"
    Save per person:
      POST/PUT /ApplicationKYCDocuments  (PAN, Aadhaar last 4, doc no, paths)
      POST /ApplicationKYCDocuments/{id}/profile-image | /aadhar | /pan
      POST /ApplicationKYCDocuments/{id}/upload, PUT .../manual/{slot}
      POST /ApplicationKYCDocuments/applicant-document/upload (salary slip,
           bank statement)
      Customer proofs: GET/POST/PUT/DELETE /customerdocumentproof,
           categories /DocumentTypeMaster, proofs /proofmaster?documentTypeId=
    Also shows previously returned documents (BackOfficeDocumentRejection).

  STEP 3  PERSONAL INFORMATION   (/personal)
    Loads: TitleMaster, masters/CasteMaster, gender, marital-status,
      RelationshipMaster, masters/ReligionMaster; Aadhaar prefill
      GET /ApplicationPersonalInformation/aadhaar-prefill/{kycId}.
    Fields per person: relationship (co-applicants), title, first/middle/last
      name, father or spouse name, mother's maiden name, DOB, religion,
      category (caste), gender, marital status, mobile (10 digits), email.
    Save: POST/PUT /ApplicationPersonalInformation (linked by KYC id).

  STEP 4  ADDRESS DETAILS   (/address)
    Loads: /State, /City; Aadhaar prefill
      GET /ApplicationAddressDetails/aadhaar-prefill/{kycId}.
    Fields: address line 1, line 2, landmark, city, state, pincode (6),
      mailing same as current (Yes/No). "View Aadhaar" button.
    Save: POST/PUT /ApplicationAddressDetails (linked by PersonalInformationId).

  STEP 5  EMPLOYMENT & INCOME   (/employment)
    Loads: EducationMaster, EmploymentType, masters/IndustryTypeMaster,
      DocumentTypeMaster.
    Fields: employer/business name, designation/nature of business,
      employment type, qualification, industry type, total experience (yrs),
      gross monthly income (> 0), other monthly income. "View Salary Slip".
    Save: POST/PUT /ApplicationEmploymentIncomeDetails (linked by address id).

  STEP 6  BANKING & EXISTING LOANS   (/banking)
    Loads: /masters/bank/active, /BankBranch, DocumentTypeMaster.
    Per person, one or more bank accounts: bank, branch, account number,
      primary flag; for primary bank: number of active loans and active
      credit cards (>= 0), then each active loan (bank, type, total amount,
      outstanding, EMI, total tenure, balance tenure, status) and each credit
      card (name, number, status). "View Bank Statement".
    Save: POST/PUT/DELETE /ApplicationBankExistingLoanDetails
          POST/PUT/DELETE /ApplicationBankActiveLoanDetails
          POST/PUT/DELETE /ApplicationBankCreditCardDetails

  STEP 7  REFERENCES   (/reference)
    Two references: full name, relationship (RelationshipMaster), mobile (10),
    address - all required.
    Save: POST/PUT /ApplicationReferenceDetails.

  STEP 8  COLLATERAL   (/collateral)
    Loads: PropertyMaster, PropertyUsageMaster, LoanProductCollateralMaster
      (decides whether the product needs collateral).
    Property 1 (required if product needs collateral): type of property,
      usage, location address, estimated value > 0. Property 2 optional.
    Save: POST/PUT/DELETE /ApplicationCollateralDetails.
    Continue -> PDF REVIEW of the whole form (/pdf-view, review mode)
      -> "Confirm & Continue to Charges".

  PDF VIEW / REVIEW   (/pdf-view)
    Printable full application (applicant, co-applicants, address,
    employment, bank, collateral, references, documents). Download/share
    as PDF (jsPDF + html2canvas). Also used by Back Office "View Form" and
    for returned-application resubmission (13.9).

  STEP 9  SCHEDULE OF CHARGES   (/charges)
    Read-only fee table (Admin fee, processing fee, penal charges, default
    charges, conversion charges) for PL/ML, BL, HL, LAP.
    "Pay" admin fee is SIMULATED (3-second timer, saved only in local draft).
    No API call.

  STEP 10 DOCUMENT CHECKLIST   (/checklist)
    Six items: Application Form, Admin Fee, KYC Documents, Income Proof,
    Bank Statements, Property Title Documents. Items are auto-ticked
    (Admin Fee and Property Title are always ticked). Local draft only.

  STEP 11 DECLARATION & SUBMIT   (/declaration)
    Loads: GET /AgentAddCustomer/{id}, GET /RMMaster.
    Fields: applicant signature + date, each co-applicant signature + date,
      acknowledgement (applicant name, product, received by, date).
    Submit:
      1. Confirm dialog.
      2. Per-person OTP list - SIMULATED (any non-empty OTP accepted).
      3. GET /AgentAddCustomer/{id}:
           status 2 -> already logged, show success
           status 0 -> error "still with the agent"
           not 1    -> error "already moved past RM review"
      4. PUT /AgentAddCustomer/{id} {agentCustomerId, status: 2, modifiedBy: rmId}
      5. Draft marked "Logged to HO" -> success -> /rm/applications/approved
    THE APPLICATION NOW BELONGS TO BACK OFFICE.

13.7 Field Verification (/rm/applications/field-verification) - NOT WIRED
  Step 1 Address (address fields, geo-tag, images) and Step 2 Collateral
  (property count, type, usage, location, value, geo-tag). Geo-tag returns
  fixed coordinates 13.0827, 80.2707; nothing is validated or saved to the
  API; success modal says "submitted to back office" but nothing is sent.
  Opens the first application in the system if no id is given.

13.8 Submission History (/rm/applications/submission-history)
  All my applications (agent-created + direct). Search + date filter
  (no status filter). Actions: open PDF view or Application Details.

13.9 Returned applications (/rm/applications/returned)
  Case A - only document rejections (status not 6):
    "Review Return" -> modal "Returned Application - Document Correction"
    For each rejected document: remarks, view rejected file, choose new file,
    "Upload & Resubmit to Back Office":
      upload via /customerdocumentproof or /AgentCustomerDocument/upload or
      /ApplicationKYCDocuments/... (depends on document kind)
      then PUT /BackOfficeDocumentRejection/{rejectionId}/resubmit {rmId}
  Case B - whole application returned (status 6):
    "Correct Application" -> open wizard and fix data; then go to the PDF
    view and click "Resubmit to Back Office" (mandatory remarks):
      POST /ApplicationWorkflow/{id}/resubmit-to-back-office
           {performedByUserId: rmId, performedByRole: 'RM', remarks}
      status 6 -> 2. The PDF view also shows the latest return remark
      (GET /ApplicationWorkflow/{id}/history).
    IMPORTANT: Declaration (Step 11) cannot be used to resubmit a status-6
    application - it only accepts status 1. Use the PDF view button.
  Case C - status 6 and document rejections: both buttons.

13.10 My Profile (/rm/profile)
  GET /RMMaster (matched by rmId/mobile). Shows details; stats are hardcoded
  0. Photo: PUT /RMMaster/replace-profile-image/{rmId}.


================================================================================
14. ROLE 5 - BACK OFFICE   (Business_Modules/back_office, /backoffice)
================================================================================

Login   : mobile found in /BackOfficeMaster -> /backoffice/dashboard.
Guard   : ProtectedRoute (auth/ProtectedRoute.jsx) - redirects to /login if
          no backOfficeData / backOfficeAuth / back-office sivels_currentUser.
Identity: auth/authStorage.js getBackOfficeAuth().

14.1 Sidebar and routes
  Dashboard                       /backoffice/dashboard
  OPERATIONS
    District Overview   (badge)   /backoffice/districts, /districts/:id
    RM Monitoring       (badge)   /backoffice/rms, /rms/:id
    Agent Monitoring    (badge)   /backoffice/agents, /agents/:id
    Customer Monitoring (badge)   /backoffice/customers          <- work queue
    Submit to Credit Manager      /backoffice/submit-to-credit, /:customerId
    Returned by Credit Manager    /backoffice/returned-by-credit
  BOTTOM: Profile (/backoffice/profile), Logout
  Full-page: /backoffice/customers/:customerId/verify    (15-step workspace)
             /backoffice/customers/:customerId/view-form (RM PdfView, read only)

14.2 Dashboard
  GET /District, /RMMaster, /AgentMaster, /AgentAddCustomer
  KPI cards: Total Districts, Total RMs, Total Agents, Total Customers.
  District Operations Preview cards, Total Portfolio Allocation, quick links.
  (Status counts here use a wrong mapping - see section 24.)

14.3 Monitoring pages (read only)
  District Overview -> District Detail (RMs in district)
  RM Monitoring     -> RM Detail (agents under RM)
  Agent Monitoring  -> Agent Detail (customers sourced by agent -> Verify)
  All load full /District, /RMMaster, /AgentMaster, /AgentAddCustomer lists
  and aggregate counts, portfolio, conversion in the browser.

14.4 CUSTOMER MONITORING - THE WORK QUEUE (/backoffice/customers)
  1. Load /AgentAddCustomer, /RMMaster, /AgentMaster,
     /ApplicationProductDetails, /District.
  2. Keep only status >= 2 (logged to HO and later).
  3. For each application also load step verifications, back-office
     documents, eligibility assessments and document rejections (to compute
     readiness).
  Filters: search, district, RM, agent, status; date range defaults to the
  last 30 days (IST). Page size 6/10/20/50.
  Columns: customer code & date, name/mobile, loan product, amount,
  agent & RM, KYC status, status, "Verify Now".

14.5 THE 15-STEP VERIFICATION WORKSPACE (/backoffice/customers/:id/verify)
  File: pages/CustomerVerification/CustomerVerification.jsx
  Loads GET /ApplicationFullDetails/{id}, /AgentCustomerDocument/bycustomer/{id}
  and any Credit Manager return items.
  Navigation: left sidebar grouped FORM REVIEW / DOCUMENT VERIFICATION /
  FIELD INVESTIGATION / CREDIT & ASSESSMENT / FINAL ACTION; URL ?step=1..15.
  Header: customer name, code, product, amount, "All Documents" panel,
  status pill, PAN, bureau status.

  STEP 01  VIEW FORM
    The RM application form (PdfView) read-only.

  STEP 02  KYC DOCUMENT VERIFICATION
    Applicant and each co-applicant: Profile photo, Aadhaar, PAN, Salary
    slip, Bank statement, ZIP/manual documents + Customer Proofs section.
    For each document: preview, View, Download, tick "Verified", or
    "Return to RM" with remarks.
      Verify        PUT  /BackOfficeStepVerification
                         {applicationProductDetailsId, applicantSequence,
                          stepCode, isVerified, remarks, verifiedByBackOfficeId}
      Return to RM  POST /BackOfficeDocumentRejection
                         {backOfficeId, rmId, agentCustomerId,
                          applicationProductDetailsId, applicantSequence,
                          documentTypeId, kycDocumentId, rejectedDocumentType,
                          rejectionRemarks, createdBy}
      Accept RM's resubmitted file  PUT /BackOfficeDocumentRejection/{id}/verify
      Customer proofs  PUT /customerdocumentproof/{id}/verify
    The "All Documents" header panel lists every document with version
    history and the same return/verify actions.

  STEP 03  DOCUMENT VERIFICATIONS (dropdown)
    Property FI, Office FI, Residence FI  -> placeholders ("pending implementation")
    Legal Report      upload/replace/delete/view LEGAL_OPINION document
    Technical Report  same for TECHNICAL_VALUATION
      POST /BackOfficeApplicationDocuments/upload, PUT /{id}/upload,
      GET /{id}/download, PUT /{id} (remarks), DELETE /{id},
      GET /BackOfficeApplicationDocuments/application/{appProdId}
    (max 150 MB; pdf, doc, docx, jpg, png, webp)

  STEP 04  CIBIL CHECK
    Upload manual CIBIL / PAN document (type CIBIL_REPORT).
    "Fetch Credit Report" is SIMULATED (always score 748, fake HDFC/ICICI loans).

  STEP 05  HEALTH CHECK
    Rows from GET /health-check-types (Google, Reference, FI, Crimecheck,
    Hunter, RCU, Dedupe, PAN, Aadhaar, CERSAI...). Per row: Pending/Yes/No,
    date, findings. NOT SAVED to backend (only passed to CAM on screen).

  STEP 06  PD SHEET (Personal Discussion)
    PD mode from /PDVerificationTypeMaster. Fields: date of PD visit, PD done
    by, address, personal discussion/site visit notes, end use, disbursement
    tranche, applicant profile, co-applicant profile, bureau notes, proposed
    collateral + legal/technical review, strengths, concerns,
    recommendation*, case-specific sanction conditions (list).
    Save ("Send to Credit Officer" button - only saves):
      POST /ApplicationPdAssessment  or PUT /ApplicationPdAssessment/{id}
      load GET /ApplicationPdAssessment/byapplication/{id}

  STEP 07  ASSET BASE
    Applicant's existing assets: type of property (/PropertyMaster), address,
    owner, usage, market value, mortgage status (/MortgageStatusMaster),
    mortgaged to whom. Add / edit inline / delete.
      GET /ApplicationAssetDetails/by-application/{id}, POST, PUT /{id},
      DELETE /{id}

  STEP 08  RTR COMMON SHEET (existing loan obligations)
    Summaries: total obligations (live loans), total incl. Sivels, personal
    obligations not considered, proposed loan (amount, tenure, ROI, EMI auto).
    Obligation table per loan: borrower, bank/FI, EMI account, product,
    loan status (/rtr-loan-status-master), amount, EMI, POS, start/end date,
    EMI due day, tenor, paid/outstanding tenor, reflected in CIBIL, FOR (Y/N),
    bounces (12 m), DPD, comment, plus 12 monthly payment columns.
      GET/POST/PUT/DELETE /calculation/loan-obligations...
      GET/PUT /calculation/loan-obligations/{id}/monthly
      GET /calculation/loan-obligations/summary/{appProdId}/{seq}
      POST /calculation/loan-obligations/proposed

  STEP 09  BANKING
    Up to N banks (max 3 selected for eligibility): bank, account type,
    account number; 12 months per bank (only latest editable): credits,
    non-business credits, debits, counts, inward/outward bounces, balances
    on day 5/15/25; "EMI started in last 3 months".
    Calculated: ABB (average bank balance), ABB/EMI, average receipts,
    bounce %, Loan eligibility @ 2 x ABB.
    Save: POST /application/{appProdId}/banking
          POST /application/banking/{bankingId}/monthly (per bank)
          POST /application/{appProdId}/eligibility
          GET  /application/{appProdId}/banking/analysis
          GET  /application/{appProdId}/eligibility/analysis

  STEP 10  ELIGIBILITY ASSESSMENT
    Choose method + applicant. Snapshot ribbon shows PAN, employment,
    product, requested amount, ROI, tenure, policy FOIR (from /FOIRMaster by
    employment type), RM-declared income.
    Methods (GET /calculation/methods):
      INCOME (Salaried, id 1)
        3+ months salary breakdown (basic, HRA, CCA, TA, incentive,
        deductions) + other income ->
        total monthly income, eligible EMI (FOIR, default 60%), existing
        obligations, net serviceable income, EMI factor, loan eligibility,
        actual FOIR.
        /calculation/salary-income..., /calculation/other-income...
      NORMAL_INCOME (Excel Desktop, id 4)
        GET  /EligibilityNormalIncome/{appProdId}/{custId}/save-status
        POST .../desktop-session  -> opens the workbook in Excel desktop
        page polls save-status every 5 s until saved; then shows
        A PAT, depreciation, partner salary, interest ... D total income,
        E eligible monthly income (A + B*70% + C*60%)/12, F obligations,
        G net serviceable, H EMI factor, I loan eligibility, J proposed,
        K actual FOIR. Download: .../download
      RTR (id 3)
        /calculation/rtr/loans, POST /calculation/rtr/calculate,
        RTR norms from /rtr-norm-master (MOB, OD count, bounce count,
        EMI multiplier, max top-up %)
      BANKING_ELIGIBILITY (id 5)  results of Step 09
    Calculate: POST /calculation/calculate {... assessmentMethodId,
      manualROI, manualTenureMonths, manualFOIR, ...}
    Company recommendation: PATCH /calculation/assessments/{id}/recommendation
      {recommendedLoanAmount} (cannot exceed max eligible).

  STEP 11  DEVIATIONS
    Three tables from masters, each row Yes/No:
      Deviation List (/DeviationMaster: product, program, norm, description,
                      approving authority)
      CIR Deviations (/CIRDeviationMaster)
      Negative FI Approval Matrix (/NegativeFIDeviationMaster)
    Save Decisions -> POST/PUT /ApplicationDeviationDecision,
      /ApplicationCIRDeviationDecision, /ApplicationNegativeFIDecision

  STEP 12  RECOMMENDATION SHEET   -> placeholder only

  STEP 13  CAM (Credit Approval Memorandum)
    Read-only multi-page report built from everything above + company and
    master data: sourcing & key loan terms, co-applicants, security, FOIR,
    applicant/co-applicant profile, PD/site visit, end use, bureau, collateral,
    eligibility, banking conduct, repayment details, asset base, health
    checks, risk/credit rating, sanction conditions, strengths/concerns,
    deviations, recommendation & approval, application chain (history).
    Print / Download PDF (CAM_<appId>.pdf).

  STEP 14  KFS (Key Facts Statement)
    Uses sanctioned terms if approved, else proposed terms. Calculates EMI
    (reducing balance), first EMI on 10th of next month, repayment schedule,
    processing fee + 18% GST, net disbursed, APR (bisection), insurance,
    +0.25% rate-shock, amount in words. Parts 1 & 2, APR computation sheet,
    repayment schedule, grievance annexure. Print / PDF (KFS-<acc>.pdf).

  STEP 15  FINAL ACTION
    Readiness card "Underwriting & Verification Readiness Assessment".
    READY only when ALL are true:
      - status is 2 or 3
      - active LEGAL_OPINION document
      - active TECHNICAL_VALUATION document
      - active CIBIL_REPORT or MANUAL_CIBIL_PAN document
      - an eligibility assessment with a result
      - a recommended loan amount > 0
      - no open (unresolved) document rejections
    Actions:
      Return to RM  (remarks*, choose applicant if co-applicants)
        POST /ApplicationWorkflow/{id}/return-to-rm  -> status 6
      Send / Resubmit to Credit Manager (enabled only if READY and no open
        credit return items; "underwriter recommendation remarks"*)
        POST /ApplicationWorkflow/{id}/send-to-credit-manager -> status 3
    Workflow history: GET /ApplicationWorkflow/{id}/history

14.6 Submit to Credit (/backoffice/submit-to-credit)
  Lists applications that are credit-ready (status 2, and status 3 shown as
  "CM Pending"). Date filter default last 7 days. "Review & Submit" opens a
  detail page with the Loan Application Form and the Back Office
  Verification Report (PDF). Its "Submit to Credit Manager" button is
  permanently disabled - real sending is done from Step 15 or from
  Returned by Credit.

14.7 Returned by Credit Manager (/backoffice/returned-by-credit)
  Lists status-2 applications whose latest credit decision is
  "ReturnedToBackOffice" (GET /ApplicationCreditDecision/by-customer/{id}/latest
  + /ApplicationCreditReturnItem/by-customer/{id}).
  Columns: app no, customer, product, amount, RM & agent, returned on/by,
  "Fields to Correct" chips, actions.
  Flow:
    1. "Correct Entries" -> open the workspace at the flagged section and fix.
    2. In each section the red CreditReturnSectionPanel shows the Credit
       Manager's remark; enter resolution remarks:
         PUT /ApplicationCreditReturnItem/{itemId}/resolve
    3. "Resolve Items / Resubmit to Credit Manager" (all items resolved and
       application credit-ready):
         POST /ApplicationWorkflow/{id}/send-to-credit-manager -> status 3

14.8 Profile
  GET /BackOfficeMaster/{id}; photo change via profileImageHelper.


================================================================================
15. ROLE 6 - CREDIT MANAGER   (Business_Modules/credit_manager, /credit)
================================================================================

Login   : mobile found in /CreditManagerMaster -> /credit.
Guard   : ProtectedRoute -> /login if no creditManagerData / creditManagerAuth.
Router  : basename /credit.

15.1 Sidebar and routes
  Dashboard                                 /credit/dashboard
  APPLICATIONS
    Received Applications  (badge)          /credit/received   (status 3,4,5)
    Pending Review         (badge)          /credit/pending    (status 3)
    Approved Applications  (badge)          /credit/approved   (status 4)
    Rejected Applications  (badge)          /credit/rejected   (status 5)
  REPORTS
    Reports                                 /credit/reports
  BOTTOM: Profile (/credit/profile), Logout (/credit/logout)
  Full-page review: /credit/applications/:customerId

15.2 How applications arrive
  Back Office "Send to Credit Manager" -> status 3. The Credit Manager
  context loads GET /AgentAddCustomer, /RMMaster, /AgentMaster once and keeps
  status 3/4/5 rows (every Credit Manager sees every application - no
  per-manager assignment).

15.3 Dashboard
  KPI cards (count + amount): Received, Pending Review, Approved, Rejected.
  Credit Portfolio Summary, quick links, 5 most recent applications.

15.4 Queues (ApplicationQueue)
  Filters: search, district, RM, status (Received only), from/to date.
  Columns: application no & date, customer, loan product, amount, RM & agent
  (+ received date & days pending / approved date / rejected date & reason).
  Button "Review" (status 3) or "View" -> /credit/applications/{id}.

15.5 APPLICATION REVIEW FLOW (/credit/applications/:customerId)
  The screen embeds the Back Office 15-step workspace in Credit Manager mode
  (Back Office actions hidden; any save is attributed to the Credit Manager).

  1. CAM GATE - at first only Step 13 CAM is open. Click
     "I have reviewed the CAM - Continue" to unlock all steps
     (remembered in localStorage cm-cam-reviewed:{customerId}).
  2. Go through steps 1-15 (same content as section 14.5).
  3. Each review section has a SectionReviewBar (only while status 3):
       Edit          - unlock editing in that section
       Approve       - mark section approved
       Reject / Flag - add a flag with remarks (what is wrong)
       Clear Flags
     There are 16 review sections (all steps except CAM, KFS, Final Action,
     with Step 3 split into Property FI, Office FI, Residence FI, Legal,
     Technical). State kept in sessionStorage until a decision is sent.
  4. If the application came back from Back Office, a "Resubmitted to Credit
     Manager" strip lists the fixed items. Accept each fix:
       PUT /ApplicationCreditReturnItem/{itemId}/accept
           {reviewedByUserId, reviewedByRole: 'CreditManager', reviewRemarks}
     (or flag it again -> Reopened).
  5. Step 15 FINAL ACTION panel: checklist "X of 16 approved", flagged items,
     history of earlier returns, and the decision buttons:

     APPROVE  (enabled only when all 16 sections approved, no unsent flags,
               no fixes waiting for acceptance)
       Sanctioned loan amount* (> 0, prefilled with requested)
       Sanctioned ROI % p.a.* (> 0 and <= 100)
       Sanctioned tenure months* (1-480)
       Conditions (optional)
       Approval remarks*
       -> POST /ApplicationWorkflow/{id}/credit-approve     status 3 -> 4

     REJECT
       Rejection reason*
       -> POST /ApplicationWorkflow/{id}/credit-reject      status 3 -> 5

     RETURN TO BACK OFFICE
       One or more issues: Section (27 options), Field (or "Other" + name),
       What is wrong (max 1000 chars); optional note (auto-built if empty)
       -> POST /ApplicationWorkflow/{id}/return-to-backoffice
            {performedByUserId, performedByRole, remarks,
             returnItems: [{sectionCode, sectionName, fieldKey, fieldLabel, issue}]}
          status 3 -> 2, items appear in Back Office "Returned by Credit Manager"

     409 response = "already been actioned" by someone else.
  6. When status is not 3 the panel shows the latest decision (decision,
     date, sanctioned amount/ROI/tenure, conditions, remarks) from
     GET /ApplicationCreditDecision/by-customer/{id}.

15.6 Reports
  Date filter; cards Total Received, Pending, Approved, Rejected; table by
  status with count, value, % share (calculated in browser, no export).

15.7 Profile
  GET /CreditManagerMaster/{id}; read-only.


================================================================================
16. ROLE 7 - CUSTOMER   (Business_Modules/customer_module)
================================================================================

Login   : mobile found in /AgentAddCustomer (the lead record) -> /dashboard.
Guard   : none.
Identity: hooks/useCustomerIdentity.js -> customerData / customerId ->
          GET /AgentAddCustomer/{id} (fallback list matched by mobile).

Routes and sidebar:
  /dashboard     Dashboard
  /my-loan       My Loan
  /emi-history   EMI History
  /profile       Profile
  /client/pending-approval  (never navigated to)
  Logout (confirm), "Need Help?" card

What is real vs demo:
  REAL : name, mobile, email, expected loan amount, loan purpose,
         employment type, customer code (from AgentAddCustomer).
  DEMO : everything else - outstanding, EMI, ROI, tenure, EMI paid,
         credit score 750, EMI schedule rows, payment history, address,
         employer, bank, references, "Active" loan status.
  The customer does NOT see their real application status (0-6); every
  customer sees an "Active" loan. There is no loan/EMI/payment API.
  Buttons Pay Now, Download Loan Summary, Export CSV do nothing.

Risk: "/client" redirects to "/login" inside the customer app, which has no
/login route and falls back to "/client" -> possible redirect loop.


================================================================================
17. ROLE 8 - INVESTOR   (Business_Modules/investor_module, /investors)  DEMO
================================================================================

No login role, no API calls, user hardcoded as "Rajesh Kumar".
  /investors/dashboard            portfolio cards, pie & line charts (static)
  /investors/new-investment       allocate amount across Personal 16%,
                                  Business 18%, Housing 14%, Property 15.5%;
                                  computes totals locally; nothing is saved
  /investors/customer-allocation  10 hardcoded funded customers, filter/search
  /investors/profile              static profile
  /investors/logout               just returns to dashboard


================================================================================
18. COMPANY DETAILS PAGE   (Business_Modules/company details, /company)
================================================================================

A static "About Sivels Finance" page: company info (placeholder CIN and
phone), services, 6-step loan process, trust badges, documents list (not
links), help items. No login, no API. The real company configuration is
in Master: /master/company.


================================================================================
19. CORE MANAGEMENT PAGES (USERS / ROLES / GROUPS, CUSTOMER KYC)   MOCK
================================================================================

Routed in Core (reachable only in dev, 404 in production):
  /users, /users/create, /users/groups/:id, /users/permissions/:id
  /roles, /roles/create, /roles/edit/:id
  /groups, /groups/create, /groups/edit/:id, /groups/permissions/:id
  /employment-type-document-mapping     (REAL API, duplicate of Master page)
  /customer/profile, /customer/verification, /customer/loan-offer

RBAC services (userService, roleService, permissionService,
userRoleService) have their API calls commented out and return hardcoded
data; saves never persist. HasPermission depends on sivels_permissions
which is only set if the OTP response contains "menus".

Customer KYC demo (/customer/verification): Aadhaar via DigiLocker, PAN,
credit score - all simulated with timers and mock data (Rahul Sharma,
score 782). Face camera component exists but is not used.
CustomerRegistration (7-step form) is not routed.


================================================================================
20. REWORK LOOPS IN DETAIL
================================================================================

20.1 Back Office -> RM: single document
  BO Step 02 "Return to RM" on a document
    POST /BackOfficeDocumentRejection          (status ReturnedToRM)
  RM sees it in Returned Applications (badge) -> "Review Return"
    uploads new file -> PUT /BackOfficeDocumentRejection/{id}/resubmit (Resubmitted)
  BO sees "Resubmitted" on the document -> accept
    PUT /BackOfficeDocumentRejection/{id}/verify (Verified)
  Application status stays 2 throughout. Open rejections block readiness.

20.2 Back Office -> RM: whole application
  BO Step 15 "Return to RM" (remarks, applicant)
    POST /ApplicationWorkflow/{id}/return-to-rm          2 -> 6
  RM: Returned Applications -> "Correct Application" -> fix wizard steps ->
  PDF view -> "Resubmit to Back Office" (remarks)
    POST /ApplicationWorkflow/{id}/resubmit-to-back-office  6 -> 2
  Application re-enters the Back Office queue.

20.3 Credit Manager -> Back Office
  CM flags sections / builds issue list -> "Return to Back Office"
    POST /ApplicationWorkflow/{id}/return-to-backoffice  3 -> 2
    creates ApplicationCreditReturnItem rows (status Open)
  BO: "Returned by Credit Manager" -> correct data -> resolve each item
    PUT /ApplicationCreditReturnItem/{id}/resolve  (Resolved)
  BO resubmits
    POST /ApplicationWorkflow/{id}/send-to-credit-manager  2 -> 3
    items become Resubmitted
  CM accepts each fix  PUT /ApplicationCreditReturnItem/{id}/accept (Accepted)
  or flags again (Reopened) -> another return cycle.
  CM can only Approve when every item is accepted and all 16 sections approved.


================================================================================
21. MASTER DATA REFERENCE  (42 API files, 44 tables, managed in /master/masters)
================================================================================

 Group / Master              Endpoint                          Used by
 --------------------------  --------------------------------  ---------------------------------
 GEOGRAPHY
 Country                     /Country                          Core masterService
 State                       /State                            staff forms, RM address, CAM/KFS
 District                    /District                         AMS mapping, BO/CM staff, BO monitoring
 City                        /City                             staff forms, RM address, CAM/KFS
 BANKING
 Bank                        /masters/bank (+/active)          RM banking, BO eligibility
 Bank Branch                 /BankBranch                       staff branch, RM banking
 PERSONAL
 Title                       /TitleMaster                      RM personal
 Gender                      /gender                           staff forms, RM personal
 Marital Status              /marital-status                   RM personal
 Relationship                /RelationshipMaster               RM personal/references, CAM
 Education                   /EducationMaster                  RM employment
 Religion                    /masters/ReligionMaster           RM personal
 Caste                       /masters/CasteMaster              RM personal
 EMPLOYMENT & SOURCING
 Employment Type             /EmploymentType                   Agent/RM lead, RM employment, FOIR
 Industry Type               /masters/IndustryTypeMaster       RM employment
 Sourcing Channel            /SourcingChannelMaster            RM step 1, promote, CAM
 LOAN PRODUCT
 Loan Type                   /LoanTypeMaster                   parent of Loan Product
 Loan Product                /LoanProductMaster                Agent/RM lead, RM step 1, deviations
 Loan Purpose                /LoanPurposeMaster                RM step 1
 Loan Product Variation      /LoanProductVariationMaster       RM step 1 (HL/LAP)
 Loan Product Tenure         /masters/LoanProductTenureMaster  RM step 1 tenure list
 Loan Product Collateral     /LoanProductCollateralMaster      RM step 8 (collateral required?)
 Loan Transaction Type       /LoanTransactionTypeMaster        RM step 1, KFS, CAM
 Interest Type               /InterestTypeMaster               RM step 1
 CREDIT POLICY
 Rate Of Interest            /RateOfInterestMaster             RM step 1 ROI, promote
 FOIR                        /FOIRMaster                       BO eligibility (policy FOIR)
 RTR Norm                    /rtr-norm-master                  BO RTR eligibility
 RTR Loan Status             /rtr-loan-status-master           BO RTR common sheet
 Assessment Method           /AssessmentMethodMaster           Application 360 labels
 Deviation List              /DeviationMaster                  BO deviations, CAM
 CIR Deviations              /CIRDeviationMaster               BO deviations
 Negative FI Deviations      /NegativeFIDeviationMaster        BO deviations
 PROPERTY
 Property                    /PropertyMaster                   RM collateral, BO asset base, CAM
 Property Usage              /PropertyUsageMaster              RM collateral
 Mortgage Status             /MortgageStatusMaster             BO asset base, CAM
 VERIFICATION
 Verification                /VerificationMaster               RM KYC, promote
 PD Verification Type        /PDVerificationTypeMaster         BO PD sheet
 Health Check Type           /health-check-types               BO health check, CAM
 DOCUMENTS
 Document Type               /DocumentTypeMaster               RM KYC, BO, proofs
 Customer Document Type      /CustomerDocumentTypeMaster       Agent/RM lead documents
 Employment Type Doc Mapping /EmploymentTypeDocumentMapping    which documents are mandatory
 Proof Master                /proofmaster                      customer proofs
 STATUS
 Status                      /StatusMaster                     not used by any screen
 Status Role                 /StatusRoleMaster                 only feeds Status form


================================================================================
22. API ENDPOINT CATALOGUE  (base https://fusiontecsoftware.com/sivels/api)
================================================================================

AUTH
  POST /MobileOtp/send-mobile-otp
  POST /MobileOtp/verify-mobile-otp

STAFF / PEOPLE
  /AgentMaster            GET, POST, GET/PUT {id}, {id}/upload-aadhaar,
                          {id}/upload-pan, {id}/profile-image (GET/PUT)
  /RMMaster               GET, POST, GET/PUT {id}, upload-aadhar/{id},
                          upload-pan/{id}, replace-profile-image/{id},
                          {id}/profile-image
  /AMSMaster              GET, POST, GET/PUT {id}, upload-*/{id},
                          profile-image/{id}
  /AMSDistrictMapping     POST, GET ams/{amsId}
  /BackOfficeMaster       GET, POST, GET/PUT {id}, {id}/aadhar|pan|profile-image
  /CreditManagerMaster    GET, POST, GET/PUT {id}, upload-*/{id}, replace-*/{id}

LEADS / CUSTOMERS
  /AgentAddCustomer       GET, POST, GET/PUT/DELETE {id}  (status field = workflow)
  /AgentCustomerDocument  upload, bycustomer/{id}, download/{id}
  /RMCustomerDocument     upload, bycustomer/{id}, download/{id}
  /RMAddCustomer/{id}/promote   POST
  /customerdocumentproof  GET, POST, PUT {id}, {id}/download, {id}/verify, DELETE {id}

APPLICATION (RM WIZARD)
  /ApplicationFullDetails/{id}, /ApplicationFullDetails/search?panNumber=
  /ApplicationProductDetails            GET, POST, PUT {id}, bycustomer/{id}
  /ApplicationKYCDocuments              GET, POST, GET/PUT {id}, {id}/upload,
                                        {id}/manual/{slot}, {id}/profile-image|aadhar|pan,
                                        by-application/{id}, applicant-document,
                                        applicant-document/upload, download?path=
  /AadhaarKyc/initiate, /AadhaarKyc/verify
  /ApplicationPersonalInformation       GET, POST, GET/PUT {id}, aadhaar-prefill/{kycId}
  /ApplicationAddressDetails            GET, POST, PUT {id}, aadhaar-prefill/{kycId}
  /ApplicationEmploymentIncomeDetails   GET, POST, PUT {id}
  /ApplicationBankExistingLoanDetails   GET, POST, PUT/DELETE {id}, by-application/{id}/{seq}
  /ApplicationBankActiveLoanDetails     GET, POST, PUT/DELETE {id}
  /ApplicationBankCreditCardDetails     POST, PUT/DELETE {id}, by-bank/{bankId}
  /ApplicationReferenceDetails          POST, PUT {id}
  /ApplicationCollateralDetails         GET, POST, PUT/DELETE {id}

WORKFLOW
  /ApplicationWorkflow/{id}/return-to-rm               POST  (BO)
  /ApplicationWorkflow/{id}/resubmit-to-back-office    POST  (RM)
  /ApplicationWorkflow/{id}/send-to-credit-manager     POST  (BO)
  /ApplicationWorkflow/{id}/return-to-backoffice       POST  (CM)
  /ApplicationWorkflow/{id}/credit-approve             POST  (CM)
  /ApplicationWorkflow/{id}/credit-reject              POST  (CM)
  /ApplicationWorkflow/{id}/history                    GET
  /ApplicationCreditDecision/by-customer/{id}[/latest] GET
  /ApplicationCreditReturnItem/by-customer/{id}        GET
  /ApplicationCreditReturnItem/{id}/resolve            PUT   (BO)
  /ApplicationCreditReturnItem/{id}/accept             PUT   (CM)

BACK OFFICE VERIFICATION
  /BackOfficeStepVerification            PUT, application/{appProdId}
  /BackOfficeDocumentRejection           GET, POST, {id}, application/{id},
                                         rm/{rmId}/returned, {id}/resubmit, {id}/verify
  /BackOfficeApplicationDocuments        upload, application/{id}, {id}/download,
                                         {id}/upload, PUT/DELETE {id}
  /ApplicationPdAssessment               POST, PUT {id}, byapplication/{id}, bycustomer/{id}
  /ApplicationAssetDetails               POST, GET/PUT/DELETE {id}, by-application/{id}
  /calculation/loan-obligations          GET {appProdId}/{seq}, POST, PUT/DELETE {id},
                                         {id}/monthly, summary/..., proposed
  /application/{appProdId}/banking, /application/banking/{id}/monthly,
  /application/{appProdId}/banking/analysis, /application/{appProdId}/eligibility,
  /application/{appProdId}/eligibility/analysis
  /calculation/methods, /calculation/calculate,
  /calculation/assessments/by-application/{id}, /calculation/assessments/{id}/recommendation
  /calculation/salary-income..., /calculation/other-income...,
  /calculation/normal-income..., /calculation/rtr/..., /calculation/abb-accounts...,
  /calculation/abb-balances...
  /EligibilityNormalIncome/{appProdId}/{custId}[/save-status|/desktop-session|/download]
  /FOIREligibilityCalculation[...]
  /ApplicationDeviationDecision, /ApplicationCIRDeviationDecision,
  /ApplicationNegativeFIDecision           POST, PUT {id}, by-application/{id}

COMPANY
  /company/<15 entities>                  GET, GET/{id}, POST, PUT/{id}, DELETE/{id}

MASTERS
  See section 21 (each supports GET, GET/{id}, POST, PUT/{id}, DELETE/{id}).


================================================================================
23. BROWSER STORAGE KEYS
================================================================================

localStorage
  authToken                      bearer token (never cleared on logout)
  sivels_currentUser             logged-in user + role
  sivels_permissions, sivels_roles
  agentData, agentId             Agent
  rmData, rmId                   RM
  amsData, amsId                 AMS
  customerData, customerId       Customer
  masterData                     Master Admin
  backOfficeData, backOfficeId, backOfficeAuth
  creditManagerData, creditManagerId, creditManagerAuth
  sivels-rm-onboarding-drafts-v9 RM wizard drafts (seeded with mock records)
  cm-cam-reviewed:{customerId}   Credit Manager CAM gate

sessionStorage
  cm-pending-flags:{customerId}      Credit Manager unsent flags
  cm-approved-sections:{customerId}  Credit Manager approved sections
  customerProfileDraft, customerDashboardState (Core demo pages)


================================================================================
24. KNOWN ISSUES, GAPS AND MOCK FEATURES  (prioritised)
================================================================================

HIGH - SECURITY
  1. Static OTP "123456" logs in ANY account (Core/src/utils/constants.js,
     comment says remove before production).
  2. Mobile 9345638126 is a hardcoded Master Admin, even when all APIs fail.
  3. No route guard in Master, AMS, Agent, RM, Customer, Investor modules.
  4. No 401 handling; logout never removes authToken.
  5. Many raw fetch() calls send no Authorization header (RM Declaration
     status update, all RM Banking saves, RM profile, master lookups).
  6. Audit fields hardcoded: CreatedBy 1 in most RM steps and every Master
     save (mock getCurrentUserId()); RM document resubmit falls back to rmId 20.
  7. Login detection downloads full staff and customer lists to the browser.

HIGH - WORKFLOW BUGS
  8. Back Office "Returned by Credit Manager" chips open the wrong step for
     most sections (old numbering - e.g. Legal Report opens PD Verification);
     ReturnedByCredit.test.jsx asserts the wrong link.
  9. Credit Manager section checklist links have the same bug (CIBIL "08"
     opens RTR Common Sheet). Only Final Action maps correctly.
 10. RM cannot resubmit a status-6 application from Declaration (accepts only
     status 1); must use "Resubmit to Back Office" on the PDF view.
 11. Status labels disagree between screens:
       Back Office Dashboard : 2 = Rejected, 5 = Disbursed   (wrong)
       Master Dashboard      : 2 = Approved                  (wrong)
       AMS Dashboard         : 3 = Rejected                  (wrong)
       Agent / RM            : 3, 4, 5 shown as raw numbers
     Correct mapping is section 8.
 12. Nothing handles status 4 (Approved): no disbursement, loan account or
     EMI schedule; Customer portal shows fake loan data.
 13. RM form in Master has no AMS/district link, so AMS scoping may not work.
 14. Every Credit Manager sees every application (no assignment).

MEDIUM - SIMULATED / NOT SAVED
 15. CIBIL "Fetch Credit Report" returns fixed score 748 and fake loans.
 16. Health Check answers are not saved.
 17. Property FI, Office FI, Residence FI and Recommendation Sheet are placeholders.
 18. RM Field Verification saves nothing, fixed GPS, false success message.
 19. RM Declaration OTP accepts anything; admin-fee payment is a timer;
     checklist items auto-ticked.
 20. Submit-to-Credit detail page button permanently disabled.
 21. Agent dashboard: pending loans, EMI pending 30, last login, commission
     are dummy. Notification badges hardcoded.
 22. Customer and Investor portals mostly hardcoded; Core RBAC and KYC mock.

MEDIUM - DATA QUALITY / UX
 23. Master Status form saves a Status Role id as "displayOrder".
 24. State form asks for raw Country ID, Bank Branch form for raw City ID.
 25. Status and Status Role masters missing from Navbar.
 26. Agent form: state/branch free text, gender hardcoded, rmId may fall back to 1.
 27. Customer Submission History filter depends on createdByRole='rm', which
     Add Customer never sends (works only if backend fills it).
 28. RM Profile falls back to the first RM in the list if no match.

LOW - PERFORMANCE / HOUSEKEEPING
 29. Whole tables downloaded and filtered in browser (dashboards, lists,
     checklist, draft loading, Back Office queue makes 4 calls per row).
 30. RM layout reruns 5 dashboard API calls on every page.
 31. API base URL hardcoded in many files besides .env.
 32. Mock seed records (APP-2024-001..030) written into every RM user's
     localStorage drafts.
 33. Production worker has no fallback route; /client may redirect-loop.
 34. dist/ is committed and changes on every build (see git status);
     rm_modules/dist and credit_manager/dist are stale builds.
 35. Master *.cjs scripts rewrite source; create_roi.cjs would overwrite the
     current Rate Of Interest code.
 36. console.log of full payloads (KYC data) in several RM/Master files and
     in login detection.


================================================================================
25. DEAD / UNUSED CODE
================================================================================

RM         AddAgent, CreateLogin, CustomerVerification, AadhaarEkyc,
           ReviewSubmit, SourcingDetails (not routed), RmLogin (unreachable),
           WizardProgress/InfoBar (imported, not rendered),
           dashboardData.js, myAgentsData.js, profileData.js,
           config/onboardingFlow.js (stale order)
Agent      CustomerOnboarding 4-step wizard + steps, DatePicker, icons/index.jsx
Back Office VerificationStepModal.jsx (1,015 lines), config/verificationSteps.js,
           StatusBadge + statusConfig.js, DataTable, data/backOfficeDummyData.js,
           data/verificationDummyData.js, public/excel-templates/Normal_Income.xlsx,
           update_steps.cjs, ROUTES.CUSTOMER_DETAIL
Credit Mgr VerificationReportPdf dialog in ApplicationReview, unused service
           methods getWorkflowHistory/getLatestCreditDecision, recharts dep
Master     unused Dashboard computations and modals, utils/codeGenerator.js,
           helper *.cjs scripts
Investor   DashboardPage.jsx, Newinvestmentpage.jsx, Customerallocationspage.jsx,
           Profilepage.jsx, layout/*, Card, SectionHeader, StatusPill, icons
Core       CustomerRegistration (not routed), CustomerLoanOffer (empty),
           useCountUp, useCustomerDashboard, FaceVerificationCard,
           placeholder routes (/admin, /agent, /investor, /customer/dashboard ...)


================================================================================
26. GLOSSARY
================================================================================

  ABB      Average Bank Balance (average of balances on day 5, 15, 25)
  AMS      Area Management Specialist / Area Manager (district-level monitor)
  APR      Annual Percentage Rate (all-in cost of loan, shown in KFS)
  BL       Business Loan
  BO       Back Office
  CAM      Credit Approval Memorandum (credit report for sanction)
  CIBIL    Indian credit bureau; CIBIL score/report
  CIR      Credit Information Report (bureau report) - CIR deviations
  CM       Credit Manager
  DPD      Days Past Due
  EMI      Equated Monthly Instalment
  FI       Field Investigation (residence / office / property visit)
  FOIR     Fixed Obligation to Income Ratio (max % of income for EMIs)
  HL       Home Loan
  HO       Head Office ("Logged to HO" = submitted by RM to Back Office)
  KFS      Key Facts Statement (RBI-mandated borrower disclosure)
  KYC      Know Your Customer (Aadhaar, PAN, photo ...)
  LAP      Loan Against Property
  MOB      Months On Book
  PD       Personal Discussion (credit interview / site visit)
  PL / ML  Personal Loan / (Micro/Mortgage) Loan - unsecured column in charges
  POS      Principal Outstanding
  RM       Relationship Manager
  ROI      Rate Of Interest
  RTR      Repayment Track Record (existing loans' repayment history, used
           for obligations and RTR-based eligibility / top-up)

================================================================================
END OF DOCUMENT
================================================================================
