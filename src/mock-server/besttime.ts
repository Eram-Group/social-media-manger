// Best-time-to-post fixture — one day×hour engagement heatmap that powers both the
// Audience heatmap card and the composer's suggested-time chips (research: reuse
// one dataset for both). Intensity 0–100.

export const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HEAT_HOURS = ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];

// rows = days, cols = hours. Evenings + mid-week peak; weekends shift to afternoon.
export const HEATMAP: number[][] = [
  [12, 28, 40, 48, 38, 44, 72, 90, 52], // Mon
  [16, 34, 46, 52, 40, 50, 80, 96, 60], // Tue
  [14, 30, 44, 50, 42, 48, 74, 88, 54], // Wed
  [18, 36, 48, 54, 44, 52, 82, 94, 64], // Thu
  [20, 38, 50, 56, 46, 54, 70, 78, 58], // Fri
  [10, 18, 30, 52, 66, 72, 60, 50, 34], // Sat
  [8, 16, 28, 48, 62, 70, 58, 46, 30], // Sun
];

export interface ISuggestedSlot {
  date: string; // concrete demo date
  time: string; // HH:mm
  label: string; // "Tue 8 PM"
  reason: string;
  score: number; // 0-100
}

// Best time to post per content format (for the detailed Best-time section).
export interface IFormatBestTime {
  format: string;
  day: string;
  time: string;
  lift: string;
  note: string;
}
export const FORMAT_BEST_TIMES: IFormatBestTime[] = [
  { format: 'Reel / short video', day: 'Tue & Thu', time: '7–9 PM', lift: '+38% reach', note: 'Peak attention for vertical video' },
  { format: 'Video (in-feed)', day: 'Wed', time: '1–2 PM', lift: '+18% views', note: 'Lunchtime browsing on LinkedIn & Facebook' },
  { format: 'Image post', day: 'Sun', time: '10–11 AM', lift: '+12% engagement', note: 'Start-of-week feed activity' },
  { format: 'Carousel', day: 'Mon', time: '8 PM', lift: '+22% saves', note: 'Educational content saved for later' },
  { format: 'Story', day: 'Daily', time: '3–6 PM', lift: '+15% taps', note: 'Afternoon casual scrolling' },
];

// Clear, info-rich AI recommendation lines for the Best-time panel.
export const BEST_TIME_RECS = [
  'Best overall window: **Tuesday 8 PM** (96/100 activity).',
  'Lead with **Reels Tue & Thu 7–9 PM** — they reach +38% more accounts.',
  'Schedule **LinkedIn documents Sun–Mon 9–11 AM** for the investor segment.',
  'Avoid **Sunday mornings** — lowest activity of the week.',
  'Keep **Stories in the afternoon (3–6 PM)** for the youngest audience.',
];

// Top suggested slots for the composer (derived from the peaks above).
export const SUGGESTED_SLOTS: ISuggestedSlot[] = [
  { date: '2026-06-23', time: '20:00', label: 'Tue 8 PM', reason: 'Highest weeknight reach', score: 96 },
  { date: '2026-06-25', time: '20:00', label: 'Thu 8 PM', reason: 'Strong engagement window', score: 94 },
  { date: '2026-06-27', time: '16:00', label: 'Sat 4 PM', reason: 'Best weekend slot', score: 72 },
];
