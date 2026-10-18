/** Original illustration: a question answered with a citation that points to a highlighted PDF passage. */
export default function HeroIllustration({ className = '' }) {
  const font = { fontFamily: 'var(--font-sans)' };
  return (
    <svg
      viewBox="0 0 560 430"
      className={className}
      role="img"
      aria-label="Illustration: a question is answered, and the citation points to the highlighted passage on page 12 of a PDF."
    >
      {/* Document */}
      <rect x="14" y="20" width="318" height="372" rx="10" fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="1.5" />
      <rect x="14" y="20" width="318" height="40" rx="10" fill="var(--color-canvas)" />
      <rect x="14" y="50" width="318" height="10" fill="var(--color-canvas)" />
      <line x1="14" y1="60" x2="332" y2="60" stroke="var(--color-line)" strokeWidth="1.5" />
      <circle cx="34" cy="40" r="4" fill="var(--color-line)" />
      <circle cx="48" cy="40" r="4" fill="var(--color-line)" />
      <text x="70" y="44" fontSize="12" fill="var(--color-muted)" style={font}>
        biology-notes.pdf
      </text>

      <rect x="36" y="84" width="150" height="9" rx="4.5" fill="var(--color-primary)" opacity="0.85" />
      {[112, 128, 144].map((y, i) => (
        <rect key={y} x="36" y={y} width={[270, 258, 190][i]} height="7" rx="3.5" fill="var(--color-line)" />
      ))}

      {/* Highlighted passage */}
      <rect x="28" y="168" width="290" height="74" rx="6" fill="var(--color-accent)" opacity="0.14" />
      <rect x="28" y="168" width="4" height="74" rx="2" fill="var(--color-accent)" />
      {[182, 198, 214, 228].map((y, i) => (
        <rect key={y} x="42" y={y} width={[256, 240, 262, 150][i]} height="7" rx="3.5" fill="var(--color-primary)" opacity="0.32" />
      ))}

      {[262, 278, 294, 310, 326].map((y, i) => (
        <rect key={y} x="36" y={y} width={[270, 250, 262, 236, 120][i]} height="7" rx="3.5" fill="var(--color-line)" />
      ))}
      <rect x="36" y="354" width="62" height="22" rx="11" fill="var(--color-primary)" />
      <text x="67" y="369" fontSize="11" fontWeight="600" textAnchor="middle" fill="#fff" style={font}>
        Page 12
      </text>

      {/* Chat panel */}
      <g>
        <rect x="248" y="104" width="300" height="296" rx="12" fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="1.5" />
        <rect x="282" y="126" width="244" height="40" rx="10" fill="var(--color-primary)" />
        <text x="298" y="144" fontSize="12.5" fill="#fff" style={font}>
          What do the mitochondria
        </text>
        <text x="298" y="159" fontSize="12.5" fill="#fff" style={font}>
          produce in a cell?
        </text>

        <rect x="266" y="186" width="262" height="124" rx="10" fill="var(--color-canvas)" stroke="var(--color-line)" />
        <text x="282" y="208" fontSize="12.5" fill="var(--color-ink)" style={font}>
          They generate most of the cell&apos;s
        </text>
        <text x="282" y="226" fontSize="12.5" fill="var(--color-ink)" style={font}>
          ATP, the energy currency used to
        </text>
        <text x="282" y="244" fontSize="12.5" fill="var(--color-ink)" style={font}>
          power cellular processes.
        </text>

        {/* Citation chip */}
        <rect x="282" y="262" width="214" height="30" rx="15" fill="var(--color-surface)" stroke="var(--color-secondary)" strokeWidth="1.25" />
        <circle cx="300" cy="277" r="8" fill="var(--color-secondary)" />
        <text x="300" y="281" fontSize="11" fontWeight="700" textAnchor="middle" fill="#fff" style={font}>
          1
        </text>
        <text x="314" y="281" fontSize="11.5" fontWeight="600" fill="var(--color-primary)" style={font}>
          biology-notes.pdf · p. 12
        </text>

        <rect x="266" y="334" width="262" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line)" />
        <text x="282" y="361" fontSize="12" fill="var(--color-muted)" style={font}>
          Ask about your documents…
        </text>
        <circle cx="506" cy="356" r="12" fill="var(--color-secondary)" />
        <path d="M501 356h10m-4-4 4 4-4 4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Connector from citation to the highlighted passage */}
      <path d="M282 277 C 262 277, 246 262, 238 238" fill="none" stroke="var(--color-secondary)" strokeWidth="1.75" strokeDasharray="5 4" />
      <circle cx="238" cy="236" r="4.5" fill="var(--color-secondary)" />
    </svg>
  );
}
