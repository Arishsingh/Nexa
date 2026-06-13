const FOLDER_PALETTE = [
  '#3178c6',
  '#4f9e5a',
  '#6b7280',
  '#00add8',
  '#9333ea',
  '#db2777',
  '#0f766e',
  '#6b6b6b',
  '#4b5563',
  '#374151',
]

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#e8b33d',
  Python:     '#4f9e5a',
  Go:         '#00add8',
  Rust:       '#dea584',
  CSS:        '#9333ea',
  HTML:       '#e34c26',
  JSON:       '#b07219',
  Markdown:   '#a8a299',
  YAML:       '#db2777',
  Ruby:       '#e34c26',
  Java:       '#b07219',
  'C#':       '#4f9e5a',
  Swift:      '#e34c26',
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
