/** PF: exige nome e sobrenome (ao menos duas palavras). PJ: razão social não vazia. */
export function hasRequiredClientName(name: string, kind: "pf" | "pj") {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (kind === "pj") return true;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.replace(/[^\p{L}]/gu, "").length >= 2);
}

export function clientNameError(name: string, kind: "pf" | "pj") {
  if (!name.trim()) return "Informe o nome do cliente.";
  if (kind === "pf" && !hasRequiredClientName(name, kind)) {
    return "Informe nome e sobrenome completos.";
  }
  return null;
}
