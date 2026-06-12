// Bold, distinct data-viz palette — works on white backgrounds
const FOLDER_PALETTE = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#d97706', // amber
  '#0891b2', // cyan
  '#9333ea', // grape
  '#db2777', // pink
  '#65a30d', // lime
  '#0f766e', // teal
  '#c2410c', // burnt orange
]

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#2563eb',
  JavaScript: '#d97706',
  Python:     '#16a34a',
  Go:         '#0891b2',
  Rust:       '#c2410c',
  CSS:        '#9333ea',
  HTML:       '#dc2626',
  JSON:       '#65a30d',
  Markdown:   '#6b7280',
  YAML:       '#db2777',
  Ruby:       '#dc2626',
  Java:       '#d97706',
  'C#':       '#16a34a',
  Swift:      '#c2410c',
  Kotlin:     '#9333ea',
}

export function getFolderColor(folderName: string): string {
  let hash = 0
  for (const c of folderName) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return FOLDER_PALETTE[Math.abs(hash) % FOLDER_PALETTE.length]
}

export function getLanguageColor(language: string | undefined): string {
  if (!language) return '#6b7280'
  return LANG_COLORS[language] ?? '#6b7280'
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ]
}
