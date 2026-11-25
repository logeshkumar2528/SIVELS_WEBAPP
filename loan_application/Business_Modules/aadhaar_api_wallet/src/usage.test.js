import { describe, expect, it } from 'vitest';
import { buildDailyUsageAxis, filterDailyUsage, normalizeDateKey } from './usage';

describe('buildDailyUsageAxis', () => {
  it('matches the API date without timezone conversion', () => {
    const rows = buildDailyUsageAxis([{ date: '2026-10-16', calls: 2, cost: 5.9 }], new Date(2026, 9, 16));
    expect(rows.find((row) => row.key === '2026-10-16')).toMatchObject({ calls: 2, cost: 5.9 });
    expect(rows).toHaveLength(14);
    expect(rows.reduce((total, row) => total + row.calls, 0)).toBe(2);
  });

  it('normalizes datetime API values onto the local day key', () => {
    const rows = buildDailyUsageAxis(
      [{ date: '2026-10-16T18:30:00.000Z', calls: 1, cost: 3.54 }],
      new Date(2026, 9, 16)
    );
    expect(rows.find((row) => row.key === '2026-10-16')).toMatchObject({ calls: 1, cost: 3.54 });
  });

  it('returns fourteen zero days for an empty list', () => {
    const rows = buildDailyUsageAxis([], new Date(2026, 9, 16));
    expect(rows).toHaveLength(14);
    expect(rows.every((row) => row.calls === 0 && row.cost === 0)).toBe(true);
  });
});

describe('filterDailyUsage', () => {
  it('returns the default 14-day axis when no filters are set', () => {
    const rows = filterDailyUsage([{ date: '2026-10-16', calls: 2, cost: 5.9 }], {
      today: new Date(2026, 9, 16),
    });
    expect(rows).toHaveLength(14);
    expect(rows.find((row) => row.key === '2026-10-16')?.calls).toBe(2);
  });

  it('returns a single day when date filter is set', () => {
    const rows = filterDailyUsage([{ date: '2026-10-16', calls: 2, cost: 5.9 }], {
      dateFilter: '2026-10-16',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: '2026-10-16', calls: 2, cost: 5.9 });
  });

  it('returns a zero day when the selected date has no usage', () => {
    const rows = filterDailyUsage([], { dateFilter: '2026-11-30' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: '2026-11-30', calls: 0, cost: 0 });
  });

  it('returns the selected month days when month filter is set', () => {
    const rows = filterDailyUsage(
      [
        { date: '2026-10-01', calls: 1, cost: 3.54 },
        { date: '2026-10-16', calls: 2, cost: 7.08 },
        { date: '2026-09-30', calls: 9, cost: 31.86 },
      ],
      { monthFilter: '2026-10' }
    );
    expect(rows).toHaveLength(31);
    expect(rows[0].key).toBe('2026-10-01');
    expect(rows[15].calls).toBe(2);
    expect(rows.reduce((total, row) => total + row.calls, 0)).toBe(3);
  });
});

describe('normalizeDateKey', () => {
  it('keeps only the YYYY-MM-DD prefix', () => {
    expect(normalizeDateKey('2026-10-16T00:00:00')).toBe('2026-10-16');
  });
});
