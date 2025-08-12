export function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}
