export const lineKey = (slug: string, variant: Record<string, string>) =>
  slug + '|' + Object.entries(variant).sort().map(([k, v]) => `${k}=${v}`).join(';')
