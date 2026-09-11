export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** ISO date → "2 de julho de 2026" (pt-BR, UTC to avoid TZ drift). */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function formatScore(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
