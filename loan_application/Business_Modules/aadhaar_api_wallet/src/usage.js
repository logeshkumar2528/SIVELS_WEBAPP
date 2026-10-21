function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildDailyUsageAxis(rows = [], today = new Date()) {
  const byDate = new Map((Array.isArray(rows) ? rows : []).map((item) => [String(item?.date || ''), item]));
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 + index);
    const item = byDate.get(localDateKey(date));
    return { key: localDateKey(date), date, calls: Number(item?.calls || 0), cost: Number(item?.cost || 0) };
  });
}
