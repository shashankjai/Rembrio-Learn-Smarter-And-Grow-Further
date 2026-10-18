import { formatShortDate } from '../utils/format.js';

const W = 640;

/** Score-over-time line chart (0–100%). Pure SVG, responsive, with a text summary for screen readers. */
export function LineChart({ data, height = 240 }) {
  const padL = 40;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;
  const x = (i) => (data.length === 1 ? padL + innerW / 2 : padL + (i * innerW) / (data.length - 1));
  const y = (v) => padT + innerH - (v / 100) * innerH;
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const latest = data.at(-1)?.value;
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Quiz scores over time. ${data.length} attempts, latest ${latest}%, average ${avg}%.`}
      >
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {t}%
            </text>
          </g>
        ))}
        {data.length > 1 ? <polyline points={points} fill="none" stroke="var(--color-secondary)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r="4.5" fill="var(--color-surface)" stroke="var(--color-secondary)" strokeWidth="2.25">
            <title>{`${d.title ? `${d.title} — ` : ''}${d.value}% on ${formatShortDate(d.label)}`}</title>
          </circle>
        ))}
        {data.length ? (
          <>
            <text x={x(0)} y={height - 8} textAnchor={data.length === 1 ? 'middle' : 'start'} fontSize="11" fill="var(--color-muted)">
              {formatShortDate(data[0].label)}
            </text>
            {data.length > 1 ? (
              <text x={x(data.length - 1)} y={height - 8} textAnchor="end" fontSize="11" fill="var(--color-muted)">
                {formatShortDate(data.at(-1).label)}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
    </figure>
  );
}

/** Daily activity: stacked bars of questions asked and quizzes taken. */
export function ActivityChart({ data, height = 190 }) {
  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;
  const maxTotal = Math.max(1, ...data.map((d) => d.quizzes + d.questions));
  const slot = innerW / data.length;
  const barW = Math.max(4, slot * 0.62);
  const yScale = (v) => (v / maxTotal) * innerH;
  const totalQ = data.reduce((s, d) => s + d.questions, 0);
  const totalZ = data.reduce((s, d) => s + d.quizzes, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={`Activity over the last ${data.length} days: ${totalQ} questions asked and ${totalZ} quizzes taken.`}>
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="var(--color-line)" />
        <line x1={padL} x2={W - padR} y1={padT} y2={padT} stroke="var(--color-line)" strokeDasharray="3 4" />
        <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
          {maxTotal}
        </text>
        <text x={padL - 6} y={padT + innerH + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
          0
        </text>
        {data.map((d, i) => {
          const bx = padL + i * slot + (slot - barW) / 2;
          const hQ = yScale(d.questions);
          const hZ = yScale(d.quizzes);
          return (
            <g key={d.date}>
              <title>{`${formatShortDate(d.date)}: ${d.questions} question${d.questions === 1 ? '' : 's'}, ${d.quizzes} quiz${d.quizzes === 1 ? '' : 'zes'}`}</title>
              <rect x={bx} y={padT + innerH - hQ - hZ} width={barW} height={hZ} rx="1.5" fill="var(--color-primary)" />
              <rect x={bx} y={padT + innerH - hQ} width={barW} height={hQ} rx="1.5" fill="var(--color-secondary)" />
              <rect x={slot * i + padL} y={padT} width={slot} height={innerH} fill="transparent" />
            </g>
          );
        })}
        <text x={padL} y={height - 8} fontSize="11" fill="var(--color-muted)">
          {formatShortDate(data[0].date)}
        </text>
        <text x={W - padR} y={height - 8} textAnchor="end" fontSize="11" fill="var(--color-muted)">
          {formatShortDate(data.at(-1).date)}
        </text>
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-secondary" /> Questions asked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Quizzes taken
        </span>
      </figcaption>
    </figure>
  );
}
