export const LOAN_TYPES = [
  {
    key: "personal",
    label: "Personal Loan",
    subtitle: "Short term personal needs",
    icon: "User",
    tint: "#0284c7",
    bg: "#e0f2fe",
    border: "#93c5fd",
    rate: 16.0,
    defaultAmount: 300000,
  },
  {
    key: "business",
    label: "Business Loan",
    subtitle: "For business expansion",
    icon: "Briefcase",
    tint: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    rate: 18.0,
    defaultAmount: 200000,
  },
  {
    key: "housing",
    label: "Housing Loan",
    subtitle: "Home purchase / construction",
    icon: "Home",
    tint: "#7c3aed",
    bg: "#f3e8ff",
    border: "#c084fc",
    rate: 14.0,
    defaultAmount: 400000,
  },
  {
    key: "property",
    label: "Property Loan",
    subtitle: "Against property mortgage",
    icon: "Building2",
    tint: "#ea580c",
    bg: "#ffedd5",
    border: "#fdba74",
    rate: 15.5,
    defaultAmount: 100000,
  },
];

export const HOW_IT_WORKS = [
  "You choose loan types and amounts",
  "We allocate to eligible borrowers",
  "You earn interest on your investment",
  "EMI payments are credited to you",
];

export const BENEFITS = [
  "Higher returns with diversified portfolio",
  "Monthly interest credited to your account",
  "Real-time tracking of your investments",
  "Secure & transparent process",
];

export function formatINR(n) {
  if (n === undefined || n === null || isNaN(n)) return "₹ 0";
  return `₹ ${Number(n).toLocaleString("en-IN")}`;
}
