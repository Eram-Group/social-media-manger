// Branded, vector PDF report for the Analytics screen — built with
// @react-pdf/renderer (consistent output, full layout control, real downloadable
// PDF) instead of the browser's flaky print engine. Charts are drawn with the
// library's SVG primitives. Cairo font is bundled for Arabic + Latin support.
import {
  Document, Page, View, Text, StyleSheet, Font,
  Svg, Polyline, Line, Defs, LinearGradient, Stop, pdf,
} from '@react-pdf/renderer';

Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf' },
    { src: '/fonts/Cairo-Regular.ttf', fontWeight: 'bold' },
  ],
});
// Don't hyphenate words / URLs (react-pdf splits aggressively by default).
Font.registerHyphenationCallback((w) => [w]);

const C = {
  primary: '#025FCC', primaryDark: '#01397A', primaryLite: '#DCEAFB',
  accent: '#F0C500', green: '#00A87E', red: '#D50415', sky: '#4ED6FC',
  ink: '#1F2733', sub: '#5B6573', faint: '#9CA3AF', line: '#E5E7EB', bg: '#F6F8FB',
};
const CHART = ['#025FCC', '#4ED6FC', '#F0C500', '#00A87E', '#649DE0', '#01397A'];

// ---------- data shape ----------
export interface PdfDim { label: string; value: number }
export interface AnalyticsPdfData {
  meta: { period: string; scope: string; rangeDays: number; date: string };
  executiveSummary: string;
  kpis: { label: string; value: string }[];
  fbTotals?: { label: string; value: string }[];
  growth?: { date: string; net: number }[];
  contentMix?: PdfDim[];
  reactions?: PdfDim[];
  bestTime?: { heat: number[][]; recommended?: string | null } | null;
  platforms?: { platform: string; followers: number; stats: { k: string; v: number }[] }[];
  demographics?: { age: PdfDim[]; gender: PdfDim[]; countries: PdfDim[] } | null;
  sentiment?: { positive: number; neutral: number; negative: number; themes: { theme: string; sentiment: string; mentions: number }[] } | null;
  topPosts?: { platform: string; content: string; likes: number; comments: number; engagement: number }[];
}

const fmt = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${Math.round(n)}`;

const styles = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 54, paddingHorizontal: 36, fontFamily: 'Cairo', fontSize: 9.5, color: C.ink },
  // running header / footer
  header: { position: 'absolute', top: 24, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1.5, borderBottomColor: C.primary },
  headerBrand: { fontSize: 8, fontWeight: 'bold', color: C.primary, letterSpacing: 0.5 },
  headerRight: { fontSize: 8, color: C.faint },
  footer: { position: 'absolute', bottom: 26, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 5, fontSize: 7.5, color: C.faint },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: C.ink, marginBottom: 2 },
  sectionSub: { fontSize: 8, color: C.sub, marginBottom: 8 },

  card: { borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 10 },

  // masthead
  masthead: { borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  mastBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  logo: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  mastTitle: { fontSize: 16, fontWeight: 'bold', color: C.ink },
  mastSub: { fontSize: 9, color: C.sub, marginTop: 2 },
  badge: { backgroundColor: C.primaryLite, color: C.primaryDark, fontSize: 8, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },

  exec: { marginTop: 14, backgroundColor: C.primaryLite, borderRadius: 8, padding: 12 },
  execLabel: { fontSize: 9, fontWeight: 'bold', color: C.primaryDark, marginBottom: 4 },
  execText: { fontSize: 9.5, color: C.ink, lineHeight: 1.45 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  kpi: { flexGrow: 1, flexBasis: 90, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 9 },
  kpiLabel: { fontSize: 7.5, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 15, fontWeight: 'bold', color: C.ink, marginTop: 3 },

  twoCol: { flexDirection: 'row', gap: 12, marginTop: 12 },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  barLabel: { width: 70, fontSize: 8, color: C.sub },
  barTrack: { flex: 1, height: 9, backgroundColor: C.bg, borderRadius: 5 },
  barVal: { width: 34, textAlign: 'right', fontSize: 8, fontWeight: 'bold', color: C.ink },

  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, fontSize: 8, color: C.ink, marginRight: 5, marginBottom: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },

  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 4, marginBottom: 2 },
  th: { fontSize: 7.5, color: C.faint, textTransform: 'uppercase' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line },
  td: { fontSize: 8.5, color: C.ink },
});

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

function Bars({ data, color }: { data: PdfDim[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View>
      {data.map((d, i) => (
        <View key={d.label + i} style={styles.barRow}>
          <Text style={styles.barLabel}>{d.label}</Text>
          <View style={styles.barTrack}>
            <View style={{ height: 9, borderRadius: 5, width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: color ?? CHART[i % CHART.length] }} />
          </View>
          <Text style={styles.barVal}>{fmt(d.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function GrowthChart({ points }: { points: { date: string; net: number }[] }) {
  const W = 320, H = 90, pad = 4;
  const vals = points.map((p) => p.net);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1), span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const poly = points.map((p, i) => `${x(i).toFixed(1)},${y(p.net).toFixed(1)}`).join(' ');
  const zeroY = y(0);
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity={0.25} />
          <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke={C.line} strokeWidth={1} />
      <Polyline points={`${pad},${H - pad} ${poly} ${W - pad},${H - pad}`} fill="url(#g)" stroke="none" />
      <Polyline points={poly} fill="none" stroke={C.primary} strokeWidth={1.6} />
    </Svg>
  );
}

// Heatmap built from plain Views (no SVG text) for reliable rendering.
function Heatmap({ heat }: { heat: number[][] }) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let max = 0; for (const r of heat) for (const v of r) if (v > max) max = v;
  const startH = 7, endH = 22;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
  const heatColor = (v: number) => {
    if (!v || max <= 0) return C.bg;
    const t = Math.min(1, v / max);
    const l = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${l(220, 2)},${l(234, 95)},${l(251, 204)})`;
  };
  const cell = { width: 13, height: 13, marginRight: 2, borderRadius: 2 } as const;
  return (
    <View>
      <View style={{ flexDirection: 'row', marginLeft: 24, marginBottom: 2 }}>
        {hours.map((hh) => <Text key={hh} style={{ width: 13, marginRight: 2, fontSize: 5.5, color: C.faint, textAlign: 'center' }}>{hh}</Text>)}
      </View>
      {DAYS.map((day, d) => (
        <View key={day} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ width: 24, fontSize: 7, color: C.sub }}>{day}</Text>
          {hours.map((hh) => <View key={hh} style={{ ...cell, backgroundColor: heatColor(heat[d]?.[hh] ?? 0) }} />)}
        </View>
      ))}
    </View>
  );
}

function SentimentBar({ s }: { s: { positive: number; neutral: number; negative: number } }) {
  const total = s.positive + s.neutral + s.negative || 1;
  const seg = (v: number) => `${(v / total) * 100}%`;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
        <View style={{ width: seg(s.positive), backgroundColor: C.green }} />
        <View style={{ width: seg(s.neutral), backgroundColor: C.faint }} />
        <View style={{ width: seg(s.negative), backgroundColor: C.red }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Text style={{ fontSize: 8, color: C.green }}>● {s.positive} positive</Text>
        <Text style={{ fontSize: 8, color: C.sub }}>● {s.neutral} neutral</Text>
        <Text style={{ fontSize: 8, color: C.red }}>● {s.negative} negative</Text>
      </View>
    </View>
  );
}

function platColor(p: string) { return p === 'instagram' ? '#DD2A7B' : p === 'facebook' ? '#1877F2' : C.primary; }

function AnalyticsDocument({ d }: { d: AnalyticsPdfData }) {
  return (
    <Document title={`EPCC Analytics — ${d.meta.scope} ${d.meta.period}`} author="Eastern Province Chamber of Commerce">
      <Page size="A4" style={styles.page} wrap>
        {/* running header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerBrand}>EASTERN PROVINCE CHAMBER OF COMMERCE</Text>
          <Text style={styles.headerRight}>Social Analytics Report</Text>
        </View>
        {/* running footer with page numbers */}
        <View style={styles.footer} fixed>
          <Text>Generated {d.meta.date} · {d.meta.period} · {d.meta.scope}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

        {/* masthead */}
        <View style={styles.masthead}>
          <View style={{ flexDirection: 'row', height: 8 }}>
            <View style={{ flex: 3, backgroundColor: C.primaryDark }} />
            <View style={{ flex: 4, backgroundColor: C.primary }} />
            <View style={{ flex: 3, backgroundColor: C.accent }} />
          </View>
          <View style={styles.mastBody}>
            <View style={styles.logo}><Text style={styles.logoText}>EP</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mastTitle}>Eastern Province Chamber of Commerce</Text>
              <Text style={styles.mastSub}>Social Analytics Report · {d.meta.period} ({d.meta.rangeDays} days) · {d.meta.scope} · {d.meta.date}</Text>
            </View>
            <Text style={styles.badge}>{d.meta.rangeDays}-DAY REPORT</Text>
          </View>
        </View>

        {/* executive summary */}
        {d.executiveSummary ? (
          <View style={styles.exec}>
            <Text style={styles.execLabel}>EXECUTIVE SUMMARY</Text>
            <Text style={styles.execText}>{d.executiveSummary}</Text>
          </View>
        ) : null}

        {/* KPIs */}
        {d.kpis.length > 0 && (
          <View style={styles.kpiRow}>
            {d.kpis.map((k) => (
              <View key={k.label} style={styles.kpi}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}
        {d.fbTotals && d.fbTotals.length > 0 && (
          <View style={styles.kpiRow}>
            {d.fbTotals.map((k) => (
              <View key={k.label} style={styles.kpi}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* growth */}
        {d.growth && d.growth.length > 1 && (
          <View style={styles.section}>
            <SectionHeader title="Follower growth" sub="Daily net follows" />
            <View style={styles.card}><GrowthChart points={d.growth} /></View>
          </View>
        )}

        {/* content mix + reactions */}
        {(d.contentMix?.length || d.reactions?.length) ? (
          <View style={styles.twoCol}>
            {d.contentMix && d.contentMix.length > 0 && (
              <View style={[styles.card, { flex: 1 }]}>
                <SectionHeader title="Content mix" />
                <Bars data={d.contentMix} />
              </View>
            )}
            {d.reactions && d.reactions.length > 0 && (
              <View style={[styles.card, { flex: 1 }]}>
                <SectionHeader title="Reactions" />
                <Bars data={d.reactions} color={C.accent} />
              </View>
            )}
          </View>
        ) : null}

        {/* best time */}
        {d.bestTime && d.bestTime.heat?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Best time to post" sub={`Engagement by day & hour (KSA)${d.bestTime.recommended ? ` · best: ${d.bestTime.recommended}` : ''}`} />
            <View style={styles.card}><Heatmap heat={d.bestTime.heat} /></View>
          </View>
        )}

        {/* per-platform */}
        {d.platforms && d.platforms.length > 0 && (
          <View style={styles.section} break>
            <SectionHeader title="By platform" sub="Followers and performance per account" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {d.platforms.map((p) => (
                <View key={p.platform} style={[styles.card, { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: platColor(p.platform), marginRight: 5 }} />
                    <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }}>{p.platform}</Text>
                    <Text style={{ marginLeft: 'auto', fontSize: 8, color: C.sub }}>{fmt(p.followers)} followers</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {p.stats.slice(0, 6).map((s) => (
                      <View key={s.k} style={{ width: '30%', backgroundColor: C.bg, borderRadius: 5, padding: 5 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{fmt(s.v)}</Text>
                        <Text style={{ fontSize: 6.5, color: C.sub, textTransform: 'capitalize' }}>{s.k.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* demographics */}
        {d.demographics && (
          <View style={styles.section}>
            <SectionHeader title="Audience demographics" sub="From Instagram followers" />
            <View style={styles.twoCol}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={{ fontSize: 8, color: C.sub, marginBottom: 6 }}>AGE</Text>
                <Bars data={d.demographics.age} />
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={{ fontSize: 8, color: C.sub, marginBottom: 6 }}>GENDER</Text>
                <Bars data={d.demographics.gender} />
              </View>
            </View>
            {d.demographics.countries.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: C.sub, marginBottom: 5 }}>TOP COUNTRIES</Text>
                <View style={styles.chipRow}>
                  {d.demographics.countries.map((c) => <Text key={c.label} style={styles.chip}>{c.label} · {fmt(c.value)}</Text>)}
                </View>
              </View>
            )}
          </View>
        )}

        {/* sentiment */}
        {d.sentiment && (d.sentiment.positive + d.sentiment.neutral + d.sentiment.negative) > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Audience sentiment" sub="AI analysis of real comments" />
            <View style={styles.card}>
              <SentimentBar s={d.sentiment} />
              {d.sentiment.themes.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {d.sentiment.themes.map((t, i) => (
                    <View key={i} style={styles.tr}>
                      <Text style={[styles.td, { flex: 1 }]}>{t.theme}</Text>
                      <Text style={{ fontSize: 8, color: t.sentiment === 'positive' ? C.green : t.sentiment === 'negative' ? C.red : C.sub, textTransform: 'capitalize', width: 60 }}>{t.sentiment}</Text>
                      <Text style={{ fontSize: 8, color: C.sub, width: 28, textAlign: 'right' }}>{t.mentions}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* top posts */}
        {d.topPosts && d.topPosts.length > 0 && (
          <View style={styles.section} break>
            <SectionHeader title="Top posts" sub="By real engagement this period" />
            <View style={styles.card}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { width: 18 }]}>#</Text>
                <Text style={[styles.th, { flex: 1 }]}>Post</Text>
                <Text style={[styles.th, { width: 44, textAlign: 'right' }]}>Eng</Text>
                <Text style={[styles.th, { width: 40, textAlign: 'right' }]}>Likes</Text>
                <Text style={[styles.th, { width: 44, textAlign: 'right' }]}>Comments</Text>
              </View>
              {d.topPosts.map((p, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { width: 18, color: C.faint }]}>{i + 1}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: platColor(p.platform) }} />
                    <Text style={[styles.td, { flex: 1 }]}>{(p.content || '(no caption)').slice(0, 90)}</Text>
                  </View>
                  <Text style={[styles.td, { width: 44, textAlign: 'right', fontWeight: 'bold' }]}>{fmt(p.engagement)}</Text>
                  <Text style={[styles.td, { width: 40, textAlign: 'right' }]}>{fmt(p.likes)}</Text>
                  <Text style={[styles.td, { width: 44, textAlign: 'right' }]}>{fmt(p.comments)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

// Build the PDF as a Blob (called from the client on Export click).
export async function buildAnalyticsPdfBlob(data: AnalyticsPdfData): Promise<Blob> {
  return pdf(<AnalyticsDocument d={data} />).toBlob();
}
