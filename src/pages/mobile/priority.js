// Colores y significado de las prioridades (mismos que el tablero de escritorio)
export const PRIORITY_STYLE = {
  0: { bg: '#f9a8b8', fg: '#7f1534' },
  1: { bg: '#86efac', fg: '#14532d' },
  2: { bg: '#93c5fd', fg: '#1e3a5f' },
  3: { bg: '#d1d5db', fg: '#374151' },
  4: { bg: '#fde68a', fg: '#78350f' },
  5: { bg: '#a7f3d0', fg: '#065f46' },
}

export const PRIORITY_MEANING = {
  0: 'Requerimiento nuevo o súper urgente.',
  1: 'Ya se enviaron candidatos, pero se deben enviar más.',
  2: 'Dejamos de hacer sourcing por que el cliente tiene buen pipeline. Seguimos entrevistando a los candidatos que previamente contactamos y que apenas están respondiendo, en caso de ser buen fit, se mandan a cliente.',
  3: 'La posición está en hold.',
  4: 'Por definir.',
  5: 'Oferta aceptada.',
}

export function priorityStyle(p) {
  return PRIORITY_STYLE[p] ?? { bg: '#e2e8f0', fg: '#334155' }
}
