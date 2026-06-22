import { ReactNode } from 'react';

// Lightweight markdown-ish renderer for AI replies — handles **bold**, bullet and
// numbered lists, headings and paragraphs, so responses read cleanly instead of
// showing raw markdown characters.
const inline = (s: string): ReactNode[] =>
  s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-text-dark">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

export default function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items;
    if (list.type === 'ul') {
      blocks.push(<ul key={blocks.length} className="ml-1 list-disc space-y-1 pl-4">{items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ul>);
    } else {
      blocks.push(<ol key={blocks.length} className="ml-1 list-decimal space-y-1 pl-4">{items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ol>);
    }
    list = null;
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const ul = line.match(/^[-*•]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    if (ul) { if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; } list.items.push(ul[1]); return; }
    if (ol) { if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; } list.items.push(ol[1]); return; }
    flush();
    const h = line.match(/^#{1,6}\s+(.*)/);
    blocks.push(<p key={blocks.length} className={h ? 'font-semibold text-text-dark' : ''}>{inline(h ? h[1] : line)}</p>);
  });
  flush();

  return <div className="space-y-2">{blocks}</div>;
}
