import { describe, expect, it } from 'vitest';
import { buildDailyUsageAxis } from './usage';

describe('buildDailyUsageAxis', () => {
  it('matches the API date without timezone conversion', () => {
    const rows = buildDailyUsageAxis([{ date: '2026-10-16', calls: 2, cost: 5.9 }], new Date(2026, 9, 16));
    expect(rows.find((row) => row.key === '2026-10-16')).toMatchObject({ calls: 2, cost: 5.9 });
    expect(rows).toHaveLength(14);
    expect(rows.reduce((total, row) => total + row.calls, 0)).toBe(2);
  });

  it('returns fourteen zero days for an empty list', () => {
    const rows = buildDailyUsageAxis([], new Date(2026, 9, 16));
    expect(rows).toHaveLength(14);
    expect(rows.every((row) => row.calls === 0 && row.cost === 0)).toBe(true);
  });
});
