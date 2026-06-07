let _mockOffset = 0;

export function setMockDateOffset(n: number) {
  _mockOffset = n;
}

export function getMockDateOffset(): number {
  return _mockOffset;
}

/** Returns a Date object at the mock-adjusted "today". */
export function todayAsDate(): Date {
  const d = new Date();
  if (_mockOffset !== 0) d.setDate(d.getDate() + _mockOffset);
  return d;
}

/** Returns today's date string YYYY-MM-DD, respecting mock offset. */
export function today(): string {
  return todayAsDate().toISOString().split('T')[0];
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Last 14 days ending at mock-adjusted today. */
export function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = todayAsDate();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/** Last 30 days ending at mock-adjusted today. */
export function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = todayAsDate();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

export function isYesterday(dateStr: string): boolean {
  const d = todayAsDate();
  d.setDate(d.getDate() - 1);
  return dateStr === d.toISOString().split('T')[0];
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T12:00:00');
  const d2 = new Date(date2 + 'T12:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours(); // intentionally real-time (for display)
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  return name ? `${greeting}, ${name} 👋` : `${greeting} 👋`;
}

/** Subtract one calendar day from a YYYY-MM-DD string. */
export function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/** Add one calendar day to a YYYY-MM-DD string. */
export function addDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/** Returns all dates from start (exclusive) up to end (inclusive). */
export function daysAfterUpTo(start: string, end: string): string[] {
  if (start >= end) return [];
  const result: string[] = [];
  let d = addDay(start);
  while (d <= end) {
    result.push(d);
    d = addDay(d);
  }
  return result;
}

export function getCalendarDaysForMonth(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    cells.push(date.toISOString().split('T')[0]);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
