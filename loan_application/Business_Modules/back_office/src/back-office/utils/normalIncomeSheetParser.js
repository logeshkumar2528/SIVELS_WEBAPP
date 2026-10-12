/**
 * normalIncomeSheetParser.js
 * --------------------
 * Converts the Google Sheet "Eligibility- Normal Income" grid (formatted strings from the
 * Sheets API) into the numeric summary stored by PUT /EligibilityNormalIncome.
 *
 * Rows are located by their Sr. No. (A.1, C.1, D ... K) rather than by cell address, so
 * inserting rows in the sheet does not break the mapping.
 */

const EMPTY_TOKENS = new Set(['', '-', '–', '—', 'NA', 'N/A']);

/**
 * "(10,000.00)" -> -10000, "82.90%" -> 82.9, " 1,000.00 " -> 1000, "-" / "" -> null.
 */
export function parseSheetNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let text = String(raw).trim();
  if (EMPTY_TOKENS.has(text.toUpperCase())) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  text = text.replace(/[₹,%\s]/g, '');
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  }
  if (!text || !/^\d*\.?\d+$/.test(text)) return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * "Yes" -> true, "No" -> false, anything else -> null.
 */
export function parseSheetYesNo(raw) {
  const text = String(raw ?? '').trim().toLowerCase();
  if (text === 'yes' || text === 'y' || text === 'true') return true;
  if (text === 'no' || text === 'n' || text === 'false') return false;
  return null;
}

const normalizeSrNo = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');

/**
 * Locates the header row and the column indexes for Sr. No., the two financial-year
 * columns and the "Considered for Eligibility Amount" column. Falls back to the sheet's
 * standard layout (A = Sr. No., C/D = years, E = considered).
 */
export function resolveSheetColumns(grid) {
  const fallback = { srNo: 0, fy1: 2, fy2: 3, considered: 4 };
  if (!Array.isArray(grid)) return fallback;

  for (const row of grid) {
    if (!Array.isArray(row)) continue;
    const srNo = row.findIndex((cell) => /^sr\.?\s*no\.?$/i.test(String(cell ?? '').trim()));
    if (srNo === -1) continue;

    const considered = row.findIndex((cell) => /considered/i.test(String(cell ?? '')));
    const yearCols = row
      .map((cell, idx) => ({ cell: String(cell ?? '').trim(), idx }))
      .filter(({ cell, idx }) => idx > srNo && /\d{2}/.test(cell) && !/considered/i.test(cell))
      .map(({ idx }) => idx);

    return {
      srNo,
      fy1: yearCols[0] ?? fallback.fy1,
      fy2: yearCols[1] ?? fallback.fy2,
      considered: considered !== -1 ? considered : fallback.considered,
    };
  }
  return fallback;
}

/**
 * Builds a map of Sr. No. -> row cells. The first occurrence of each Sr. No. wins.
 */
export function indexRowsBySrNo(grid, srNoCol = 0) {
  const rows = new Map();
  if (!Array.isArray(grid)) return rows;
  for (const row of grid) {
    if (!Array.isArray(row)) continue;
    const key = normalizeSrNo(row[srNoCol]);
    if (key && !rows.has(key)) rows.set(key, row);
  }
  return rows;
}

/**
 * Returns the summary object expected by PUT /EligibilityNormalIncome.
 */
export function buildNormalIncomeSummary(grid) {
  const cols = resolveSheetColumns(grid);
  const rows = indexRowsBySrNo(grid, cols.srNo);
  const cell = (srNo, col) => rows.get(srNo)?.[col];
  const considered = (srNo) => parseSheetNumber(cell(srNo, cols.considered));

  return {
    patFy1: parseSheetNumber(cell('A.1', cols.fy1)),
    patFy2: parseSheetNumber(cell('A.1', cols.fy2)),
    depreciationFy1: parseSheetNumber(cell('A.2', cols.fy1)),
    depreciationFy2: parseSheetNumber(cell('A.2', cols.fy2)),
    depreciationConsidered: considered('A.2'),
    salaryToPartnersFy1: parseSheetNumber(cell('A.3', cols.fy1)),
    salaryToPartnersFy2: parseSheetNumber(cell('A.3', cols.fy2)),
    salaryToPartnersConsidered: considered('A.3'),
    interestToRelatedFy1: parseSheetNumber(cell('A.4', cols.fy1)),
    interestToRelatedFy2: parseSheetNumber(cell('A.4', cols.fy2)),
    interestToRelatedConsidered: considered('A.4'),
    primaryIncomeFy1: parseSheetNumber(cell('A', cols.fy1)),
    primaryIncomeFy2: parseSheetNumber(cell('A', cols.fy2)),
    primaryIncome: considered('A'),
    salaryIncomeFy1: parseSheetNumber(cell('B', cols.fy1)),
    salaryIncomeFy2: parseSheetNumber(cell('B', cols.fy2)),
    salaryIncome: considered('B'),
    housePropertyIncome: considered('C.1'),
    housePropertyFy1: parseSheetNumber(cell('C.1', cols.fy1)),
    housePropertyFy2: parseSheetNumber(cell('C.1', cols.fy2)),
    agricultureIncome: considered('C.2'),
    agricultureFy1: parseSheetNumber(cell('C.2', cols.fy1)),
    agricultureFy2: parseSheetNumber(cell('C.2', cols.fy2)),
    otherSourcesIncome: considered('C.3'),
    otherSourcesFy1: parseSheetNumber(cell('C.3', cols.fy1)),
    otherSourcesFy2: parseSheetNumber(cell('C.3', cols.fy2)),
    totalOtherIncome: considered('C'),
    restrictedToBusinessIncome: parseSheetYesNo(cell('C', cols.fy2)),
    totalIncomeAnnual: considered('D'),
    eligibleMonthlyIncome: considered('E'),
    existingMonthlyObligations: considered('F'),
    netServiceableIncome: considered('G'),
    emiFactor: considered('H'),
    loanEligibilityLacs: considered('I'),
    proposedLoanAmountLacs: considered('J'),
    actualFoirPercent: considered('K'),
  };
}

/**
 * Normalizes a grid into string cells (the API stores List<List<string>>).
 */
export function normalizeSheetGrid(grid) {
  if (!Array.isArray(grid)) return [];
  return grid.map((row) => (Array.isArray(row) ? row.map((c) => (c === null || c === undefined ? '' : String(c))) : []));
}
