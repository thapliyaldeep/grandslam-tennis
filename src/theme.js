// ─── GrandSlam Tennis Design Tokens ───────────────────────────────────────

export const colors = {
  // Backgrounds
  court:      '#E8F5E0',   // Wimbledon grass — main background
  courtDeep:  '#D4E8C2',   // deeper grass — cards, sections
  chalk:      '#FFFFFF',   // court lines — elevated cards
  baseline:   '#1B2D5B',   // deep navy — primary text, headers
  baselineLight: '#2A4080', // lighter navy — secondary text

  // Accents
  clay:       '#C4622D',   // Roland Garros clay — CTAs, live
  clayLight:  '#E8845A',   // lighter clay — hover states
  gold:       '#C9A84C',   // champions, winners
  goldLight:  '#F0D080',   // lighter gold — champion backgrounds
  net:        '#8BAF6E',   // net green — dividers, tags

  // Status
  live:       '#E53E3E',   // live match indicator
  won:        '#2D6A4F',   // match won
  lost:       '#9B2335',   // match lost
  pending:    '#6B7280',   // pending match

  // Text
  textPrimary:   '#1B2D5B',
  textSecondary: '#4A5568',
  textMuted:     '#718096',
  textLight:     '#A0AEC0',
};

export const fonts = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Courier New', monospace",
};

export const shadows = {
  card:   '0 2px 8px rgba(27,45,91,0.08)',
  cardHover: '0 4px 16px rgba(27,45,91,0.14)',
  live:   '0 0 0 3px rgba(229,62,62,0.2)',
};

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
};

// ─── Common button styles ──────────────────────────────────────────────────
export const btn = {
  primary: {
    background: colors.clay,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    padding: '10px 20px',
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  secondary: {
    background: 'transparent',
    color: colors.baseline,
    border: `1.5px solid ${colors.baseline}`,
    borderRadius: radii.md,
    padding: '10px 20px',
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  ghost: {
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.courtDeep}`,
    borderRadius: radii.md,
    padding: '8px 16px',
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
  },
  danger: {
    background: '#FEE2E2',
    color: '#9B2335',
    border: 'none',
    borderRadius: radii.md,
    padding: '8px 16px',
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
};

// ─── Google Fonts import string (add to index.html) ───────────────────────
export const googleFontsUrl =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap';
