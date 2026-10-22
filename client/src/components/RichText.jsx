import { parseBlocks } from '../utils/richText.js';

function Inline({ nodes }) {
  return nodes.map((n, i) => {
    if (n.type === 'bold') return <strong key={i}>{n.value}</strong>;
    if (n.type === 'italic') return <em key={i}>{n.value}</em>;
    if (n.type === 'code') {
      return (
        <code key={i} className="rounded bg-tint px-1 py-0.5 font-mono text-[0.9em]">
          {n.value}
        </code>
      );
    }
    return <span key={i}>{n.value}</span>;
  });
}

/** Renders model output as React elements only — never as raw HTML. */
export default function RichText({ text, className = '' }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline nodes={it} />
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline nodes={it} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            <Inline nodes={b.inline} />
          </p>
        );
      })}
    </div>
  );
}
