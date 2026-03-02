// Design tokens from PRD Section 6.1

export const Colors = {
  // Backgrounds
  bgPrimary:    '#1B1B2F',
  bgCard:       '#162447',
  bgRow1:       '#1F4068',
  bgRow2:       '#1B1B2F',
  bgInput:      '#0D2137',
  bgHighlight:  '#1B5E20',
  bgModal:      '#0D1B2A',

  // Text
  textPrimary:  '#E0E0E0',
  textIncome:   '#66BB6A',
  textExpense:  '#EF5350',
  textNet:      '#FFD740',
  textBalance:  '#4DD0E1',
  textExtra:    '#FFA726',
  textLabel:    '#90CAF9',
  textMuted:    '#607D8B',

  // Interactive
  accent:       '#64B5F6',
  accentPress:  '#42A5F5',

  // Borders
  border:       '#1E3A5F',
  borderLight:  '#2A4A6A',

  // Status
  success:      '#4CAF50',
  warning:      '#FF9800',
  danger:       '#F44336',

  // Misc
  white:        '#FFFFFF',
  black:        '#000000',
  transparent:  'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
