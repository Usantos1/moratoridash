/** Utilitários do tema do chat público (tokens --sf-*) */

export function darkenHex(hex: string, amount = 0.28): string {
  const raw = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return "#0D655B";
  const n = (i: number) => Math.max(0, Math.round(parseInt(raw.slice(i, i + 2), 16) * (1 - amount)));
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(n(0))}${to(n(2))}${to(n(4))}`;
}

/** Chat nunca usa o laranja do dashboard. */
export function resolveChatPrimary(hex?: string | null): string {
  if (!hex) return "#128C7E";
  const cleaned = hex.replace(/\s/g, "").toLowerCase();
  if (/^#?(fb5a1d|fc581d|ff6a00|ff5a00)$/.test(cleaned)) return "#128C7E";
  if (/^#[0-9a-f]{6}$/i.test(cleaned)) return cleaned;
  return "#128C7E";
}
