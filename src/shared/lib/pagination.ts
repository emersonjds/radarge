export const TABLE_PAGE_SIZE = 20;

export function pageCount(totalRows: number, pageSize = TABLE_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

export function paginate<T>(rows: T[], page: number, pageSize = TABLE_PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageRangeLabel(
  page: number,
  totalRows: number,
  pageSize = TABLE_PAGE_SIZE,
): string {
  if (totalRows === 0) return "Mostrando 0 de 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  return `Mostrando ${start}–${end} de ${totalRows}`;
}
