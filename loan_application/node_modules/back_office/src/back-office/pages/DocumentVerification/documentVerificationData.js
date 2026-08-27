/**
 * newApplicationsData.js
 * --------------------
 * Purpose:
 *   All static data for the New Applications / Document Verification page.
 *
 * Rules:
 *   - No JSX, no React imports — pure data.
 *   - In production, APPLICATION_DETAIL and VERIFICATION_CHECKLIST
 *     are replaced by API responses based on the application ID.
 */

/* ==========================================
   SHARED USER DATA
   Re-exported to avoid duplication.
   In production: sourced from auth context.
========================================== */
export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

/* ==========================================
   APPLICATION META — Info bar fields
========================================== */
export const APPLICATION_DETAIL = {
  id:            'APP25060500024',
  customerName:  'Ramesh Kumar',
  mobile:        '98765 43210',
  agentName:     'Thiru (AGT0001)',
  rmName:        'Kumar',
  branch:        'KK Nagar',
  submittedOn:   '05 Jun 2025, 10:25 AM',
};

/** Flat array — maps directly to info bar cells */
export const INFO_BAR_FIELDS = [
  { label: 'Application ID',  value: 'APP25060500024'       },
  { label: 'Customer Name',   value: 'Ramesh Kumar'         },
  { label: 'Mobile Number',   value: '98765 43210'          },
  { label: 'Agent Name',      value: 'Thiru (AGT0001)'      },
  { label: 'RM Name',         value: 'Kumar'                },
  { label: 'Branch',          value: 'KK Nagar'             },
  { label: 'Submitted On',    value: '05 Jun 2025, 10:25 AM'},
];

/* ==========================================
   CUSTOMER SUMMARY FIELDS
========================================== */
export const CUSTOMER_SUMMARY = {
  name:   'Ramesh Kumar',
  phone:  '98765 43210',
  avatar: null,       /* null → initials fallback */
  fields: [
    { label: 'Date of Birth',          value: '12/05/1993'          },
    { label: 'Loan Amount Requested',  value: '₹ 2,00,000'         },
    { label: 'Submitted By (Agent)',   value: 'Thiru (AGT0001)'     },
    { label: 'Verified By (RM)',       value: 'Kumar'               },
    { label: 'Current Status',         value: 'inReview', isStatus: true },
    { label: 'Application Type',       value: 'Personal Loan'       },
    { label: 'Branch',                 value: 'KK Nagar'            },
  ],
};

/* ==========================================
   WORKFLOW STEPS — 7 steps
========================================== */
export const VERIFICATION_STEPS = [
  { id: 'doc-verify',    label: 'Document Verification' },
  { id: 'pan-eligibility', label: 'PAN & Eligibility Check' },
  { id: 'bank-verify',   label: 'Bank Verification'     },
  { id: 'loan-docs',     label: 'Loan Documents'        },
  { id: 'final-approval',label: 'Final Approval'        },
  { id: 'disbursement',  label: 'Disbursement'          },
];

/* ==========================================
   DOCUMENT VERIFICATION TAGS
========================================== */
export const AADHAAR_TAGS = [
  { id: 'image-clear',       label: 'Image Clear'           },
  { id: 'front-back',        label: 'Front & Back Available' },
  { id: 'number-visible',    label: 'Number Visible'        },
  { id: 'details-match',     label: 'Details Match'         },
];

export const PAN_TAGS = [
  { id: 'name-match',        label: 'Name Match'            },
  { id: 'pan-visible',       label: 'PAN Number Visible'    },
  { id: 'valid-format',      label: 'Valid Format'          },
];

/* ==========================================
   VERIFICATION CHECKLIST
   status: 'verified' | 'pending'
========================================== */
export const VERIFICATION_CHECKLIST = [
  { id: 'customer-details', label: 'Customer Details Match', status: 'verified' },
  { id: 'aadhaar-front',    label: 'Aadhaar Front Verified', status: 'verified' },
  { id: 'aadhaar-back',     label: 'Aadhaar Back Verified',  status: 'verified' },
  { id: 'pan-card',         label: 'PAN Card Verified',      status: 'verified' },
  { id: 'rm-details',       label: 'RM Details Verified',    status: 'verified' },
  { id: 'docs-original',    label: 'Documents Original',     status: 'pending'  },
];

/* ==========================================
   DOCUMENT QUALITY
========================================== */
export const DOCUMENT_QUALITY = {
  label:   'Overall Quality',
  message: 'All documents are clear and readable.',
  icon:    'ShieldCheck',
};
