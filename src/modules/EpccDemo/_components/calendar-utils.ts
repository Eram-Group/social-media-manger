// Shared, DYNAMIC date logic for the Calendar tab and the home-screen "This week"
// strip — so both show the same real dates (real "today", real month grid),
// instead of a hardcoded month. Sunday-first to match the rest of the app
// (the best-time heatmap uses Sun = 0).

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayYmd = () => ymd(new Date());

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export function weekLabel(anchor: Date): string {
  const start = addDays(anchor, -anchor.getDay());
  const end = addDays(start, 6);
  return start.getMonth() === end.getMonth()
    ? `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
    : `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export interface DayCell { date: string; day: number; outside: boolean; today: boolean; weekday: number }

// 6×7 month matrix, Sunday-first, with leading/trailing days from adjacent months.
export function monthMatrix(cursor: Date, today = todayYmd()): DayCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay()); // walk back to the Sunday on/before the 1st
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    const date = ymd(d);
    return { date, day: d.getDate(), outside: d.getMonth() !== month, today: date === today, weekday: d.getDay() };
  });
}

// The Sun..Sat week containing `anchor`.
export function weekDays(anchor: Date, today = todayYmd()): DayCell[] {
  const start = addDays(anchor, -anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const date = ymd(d);
    return { date, day: d.getDate(), outside: false, today: date === today, weekday: d.getDay() };
  });
}

// Compact "12 Jun" parts for a YYYY-MM-DD string (used by the queue list).
export function dayMonth(dateStr: string): { day: string; mon: string } {
  const [, m, d] = dateStr.split('-').map(Number);
  return { day: String(d ?? ''), mon: MONTHS_SHORT[(m ?? 1) - 1] ?? '' };
}
