/**
 * Pure loan calculations for the Key Facts Statement (KFS).
 * Amounts are in rupees; rates are annual percentages.
 */

export const GST_RATE = 0.18;
export const EMI_DUE_DAY = 10;

export function calcEmi(principal, annualRate, months) {
  if (!(principal > 0) || !(months > 0)) return null;
  const r = (annualRate || 0) / 12 / 100;
  if (r === 0) return principal / months;
  const factor = (1 + r) ** months;
  return (principal * r * factor) / (factor - 1);
}

/** First EMI falls on the due day of the month after `startDate`. */
export function firstDueDate(startDate, dueDay = EMI_DUE_DAY) {
  const base = startDate ? new Date(startDate) : new Date();
  const valid = Number.isNaN(base.getTime()) ? new Date() : base;
  return new Date(valid.getFullYear(), valid.getMonth() + 1, dueDay);
}

export function buildSchedule(principal, annualRate, months, startDate) {
  const emi = calcEmi(principal, annualRate, months);
  if (emi == null) return [];
  const r = (annualRate || 0) / 12 / 100;
  const first = firstDueDate(startDate);
  const rows = [];
  let balance = principal;

  for (let i = 1; i <= months; i += 1) {
    const interest = balance * r;
    const isLast = i === months;
    const principalPart = isLast ? balance : emi - interest;
    const instalment = isLast ? interest + principalPart : emi;
    balance = isLast ? 0 : balance - principalPart;
    rows.push({
      installment: i,
      date: new Date(first.getFullYear(), first.getMonth() + i - 1, first.getDate()),
      interest: Math.round(interest),
      principal: Math.round(principalPart),
      emi: Math.round(instalment),
      closing: Math.max(0, Math.round(balance)),
    });
  }
  return rows;
}

/** Annualised rate at which the net amount received equals the present value of all EMIs. */
export function calcApr(netDisbursed, emi, months) {
  if (!(netDisbursed > 0) || !(emi > 0) || !(months > 0)) return null;
  const presentValue = (rate) => {
    if (rate === 0) return emi * months;
    return (emi * (1 - (1 + rate) ** -months)) / rate;
  };
  let low = 0;
  let high = 1;
  if (presentValue(low) < netDisbursed) return 0;
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    if (presentValue(mid) > netDisbursed) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 12 * 100;
}

export function calcKfsTotals({ principal, annualRate, months, processingFeePct, startDate }) {
  const emi = calcEmi(principal, annualRate, months);
  const schedule = buildSchedule(principal, annualRate, months, startDate);
  const processingFee = principal > 0 && processingFeePct > 0 ? principal * (processingFeePct / 100) : 0;
  const processingFeeWithGst = processingFee * (1 + GST_RATE);
  const totalPayable = schedule.reduce((sum, row) => sum + row.emi, 0);
  const totalInterest = schedule.length ? totalPayable - principal : null;
  const netDisbursed = principal > 0 ? principal - processingFeeWithGst : null;

  return {
    emi: emi == null ? null : Math.round(emi),
    schedule,
    processingFee: processingFeeWithGst,
    totalInterest,
    totalPayable: schedule.length ? totalPayable : null,
    netDisbursed,
    apr: emi == null ? null : calcApr(netDisbursed, emi, months),
    firstDueDate: schedule[0]?.date ?? null,
  };
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
}

/** Indian numbering (Crore / Lakh / Thousand), e.g. 11500000 -> "One Crore Fifteen Lakh Rupees Only". */
export function amountInWords(amount) {
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return '';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${crore >= 100 ? belowThousand(crore) : belowHundred(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return `${parts.join(' ')} Rupees Only`;
}
