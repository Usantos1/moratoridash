/** Máscara e dígitos de telefone BR */

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "").slice(0, 13);
}

export function formatPhoneBr(raw: string) {
  const d = onlyDigits(raw);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}
