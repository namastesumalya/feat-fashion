export interface ColorPreset {
  name: string;
  hex: string;
}

export const PRESET_COLORS: ColorPreset[] = [
  { name: 'Royal Magenta', hex: '#d81b60' },
  { name: 'Rani Pink', hex: '#e51975' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Peacock Blue', hex: '#0284c7' },
  { name: 'Wine Maroon', hex: '#881337' },
  { name: 'Mustard Gold', hex: '#eab308' },
  { name: 'Navy Blue', hex: '#1e293b' },
  { name: 'Teal Green', hex: '#0d9488' },
  { name: 'Ruby Red', hex: '#dc2626' },
  { name: 'Coral Peach', hex: '#fb923c' },
  { name: 'Lavender Violet', hex: '#a855f7' },
  { name: 'Classic Black', hex: '#18181b' },
  { name: 'Pure Ivory White', hex: '#f8fafc' },
  { name: 'Rose Quartz', hex: '#f472b6' },
  { name: 'Sage Green', hex: '#84cc16' },
  { name: 'Amber Orange', hex: '#f97316' },
];

export const getColorHex = (colorName: string): string => {
  if (!colorName) return '#e51975';
  const normalized = colorName.trim().toLowerCase();

  // Direct check against preset names
  const matched = PRESET_COLORS.find(p => p.name.toLowerCase() === normalized);
  if (matched) return matched.hex;

  // Keyword check
  if (normalized.includes('magenta')) return '#d81b60';
  if (normalized.includes('rani') || normalized.includes('pink') || normalized.includes('rose')) return '#e51975';
  if (normalized.includes('emerald') || (normalized.includes('green') && !normalized.includes('teal') && !normalized.includes('sage') && !normalized.includes('olive') && !normalized.includes('mint'))) return '#059669';
  if (normalized.includes('sage')) return '#8da399';
  if (normalized.includes('olive')) return '#65a30d';
  if (normalized.includes('mint')) return '#6ee7b7';
  if (normalized.includes('teal') || normalized.includes('turquoise')) return '#0d9488';
  if (normalized.includes('peacock') || (normalized.includes('blue') && !normalized.includes('navy') && !normalized.includes('sky') && !normalized.includes('royal'))) return '#0284c7';
  if (normalized.includes('navy')) return '#1e293b';
  if (normalized.includes('royal blue')) return '#2563eb';
  if (normalized.includes('sky') || normalized.includes('cyan')) return '#38bdf8';
  if (normalized.includes('maroon') || normalized.includes('wine') || normalized.includes('burgundy')) return '#881337';
  if (normalized.includes('ruby') || normalized.includes('red') || normalized.includes('crimson') || normalized.includes('scarlet')) return '#dc2626';
  if (normalized.includes('mustard') || normalized.includes('gold') || normalized.includes('yellow')) return '#eab308';
  if (normalized.includes('peach') || normalized.includes('coral') || normalized.includes('apricot')) return '#fb923c';
  if (normalized.includes('orange') || normalized.includes('rust') || normalized.includes('tangerine')) return '#ea580c';
  if (normalized.includes('purple') || normalized.includes('violet')) return '#9333ea';
  if (normalized.includes('lavender') || normalized.includes('lilac') || normalized.includes('mauve')) return '#c084fc';
  if (normalized.includes('black') || normalized.includes('charcoal')) return '#18181b';
  if (normalized.includes('white') || normalized.includes('ivory') || normalized.includes('cream') || normalized.includes('off-white')) return '#f8fafc';
  if (normalized.includes('grey') || normalized.includes('gray') || normalized.includes('silver')) return '#6b7280';
  if (normalized.includes('brown') || normalized.includes('beige') || normalized.includes('tan') || normalized.includes('khaki')) return '#78350f';

  // Fallback hash color for arbitrary custom named colors
  let hash = 0;
  for (let i = 0; i < colorName.length; i++) {
    hash = colorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
