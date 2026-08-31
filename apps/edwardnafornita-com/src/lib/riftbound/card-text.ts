function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatCardText(value: string) {
  return value
    .replace(/:rb_exhaust:/gi, 'Exhaust')
    .replace(/:rb_ready:/gi, 'Ready')
    .replace(/:rb_energy_(\d+):/gi, '$1 Energy ')
    .replace(
      /:rb_rune_([a-z_]+):/gi,
      (_match, domain: string) => `${titleCase(domain)} Power `
    )
    .replace(/:rb_might:/gi, 'Might')
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/([.!?])(?=[A-Z])/g, '$1 ')
    .replace(/:\s*(?=[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)?\s+—)/g, ':\n• ')
    .replace(/([.!?])\s*(?=[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)?\s+—)/g, '$1\n• ')
    .replace(/\)\s*(?=\[)/g, ')\n\n')
    .replace(/\)\s*(?=[A-Z])/g, ')\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
