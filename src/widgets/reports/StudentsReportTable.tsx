"use client";

import { useState } from "react";
import Link from "next/link";
import { areaLabels } from "@/entities/subject/model";
import type { Area } from "@/entities/subject/model";
import type { StudentSituation } from "@/features/analytics/model";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { paginate } from "@/shared/lib/pagination";
import { useIsDesktop } from "@/shared/lib/use-is-desktop";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyValue } from "@/shared/ui/empty-value";
import { IconButton } from "@/shared/ui/icon-button";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePagination } from "@/shared/ui/table-pagination";
import { Eye } from "lucide-react";

export interface ReportRow {
  id: string;
  name: string;
  groupNames: string;
  average: number;
  attendanceRate: number | null;
  absences: number | null;
  aptitude: Area | null;
  situation: StudentSituation;
}

export interface StudentsReportTableProps {
  rows: ReportRow[];
  isLoading: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function StudentsReportTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
}: StudentsReportTableProps) {
  const [page, setPage] = useState(1);
  // Resetting page on a filter change during render (not an effect) avoids the
  // extra commit React flags when setState runs from useEffect.
  const [appliedRows, setAppliedRows] = useState(rows);
  if (rows !== appliedRows) {
    setAppliedRows(rows);
    setPage(1);
  }
  const pageRows = paginate(rows, page);
  const isDesktop = useIsDesktop();

  return (
    <Card className="overflow-hidden p-0">
      {isLoading && <RowsSkeleton rows={6} />}
      {!isLoading && errorMessage && <QueryErrorState message={errorMessage} onRetry={onRetry} />}
      {!isLoading && !errorMessage && rows.length === 0 && (
        <p className="p-4 text-center text-muted-foreground">Nenhum aluno encontrado</p>
      )}
      {!isLoading && !errorMessage && rows.length > 0 && (
        <>
          {isDesktop ? (
            <Table>
              <TableHeader className="border-b border-border bg-muted">
                <TableRow>
                  <TableHead className="min-w-48">Aluno</TableHead>
                  <TableHead className="max-w-40">Aula</TableHead>
                  <TableHead className="w-24 text-right">Nota média</TableHead>
                  <TableHead className="w-24 text-right">Frequência</TableHead>
                  <TableHead>Aptidão</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Relatório</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id} className="border-t border-border hover:bg-muted">
                    <TableCell>
                      <Link
                        href={"/reports?studentId=" + row.id}
                        className="flex items-center gap-3"
                        aria-label={`Abrir relatório de ${row.name}`}
                      >
                        <AvatarText name={row.name} />
                        <span className="font-medium text-foreground">{row.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-40 truncate" title={row.groupNames}>
                      {row.groupNames}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatScore(row.average)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.attendanceRate === null ? "—" : formatPercent(row.attendanceRate)}
                    </TableCell>
                    <TableCell>{row.aptitude ? areaLabels[row.aptitude] : "—"}</TableCell>
                    <TableCell>
                      {row.situation === "no-data" ? (
                        <EmptyValue label="sem chamadas registradas" />
                      ) : (
                        <Badge variant={row.situation === "at-risk" ? "danger" : "success"}>
                          {row.situation === "at-risk" ? "Em risco" : "Regular"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <IconButton
                          icon={Eye}
                          label={`Ver relatório de ${row.name}`}
                          href={"/reports?studentId=" + row.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {pageRows.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 p-4">
                  <Link
                    href={"/reports?studentId=" + row.id}
                    aria-label={`Abrir relatório de ${row.name}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarText name={row.name} />
                      <span className="line-clamp-2 text-sm font-medium break-words text-foreground">
                        {row.name}
                      </span>
                    </div>
                    {row.situation === "no-data" ? (
                      <EmptyValue className="shrink-0" label="sem chamadas registradas" />
                    ) : (
                      <Badge
                        className="shrink-0"
                        variant={row.situation === "at-risk" ? "danger" : "success"}
                      >
                        {row.situation === "at-risk" ? "Em risco" : "Regular"}
                      </Badge>
                    )}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground" title={row.groupNames}>
                    {row.groupNames}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nota {formatScore(row.average)} · Frequência{" "}
                    {row.attendanceRate === null ? "—" : formatPercent(row.attendanceRate)} ·{" "}
                    {row.absences === null
                      ? "—"
                      : `${row.absences} falta${row.absences === 1 ? "" : "s"}`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <TablePagination page={page} totalRows={rows.length} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}
