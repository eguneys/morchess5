// Today's date in YYYY-MM-DD format (UTC)
export const getTodaysUTC = () => new Date().toISOString().slice(0, 10);

// Start of current week (Sunday as first day) in UTC
export const getWeeksUTC = () => {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = now.getUTCDate() - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return weekStart.toISOString().slice(0, 10);
};

// Start of current month in UTC
export const getMonthsUTC = () => {
  const now = new Date();
  return now.toISOString().slice(0, 7) + '-01';
};

// Start of current year in UTC
export const getYearsUTC = () => {
  const now = new Date();
  return now.getUTCFullYear() + '-01-01';
};