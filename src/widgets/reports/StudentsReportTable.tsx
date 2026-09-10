"use client";

import Link from "next/link";
import { areaLabels } from "@/entities/subject/model";
import type { Area } from "@/entities/subject/model";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EyeIcon } from "@tailadmin/icons";

export interface ReportRow {
  id: string;
  name: string;
  groupNames: string;
  average: number;
  attendanceRate: number | null;
  absences: number;
  aptitude: Area | null;
  atRisk: boolean;
}

const th = "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const td = "px-5 py-4 text-sm text-foreground";

export interface StudentsReportTableProps {
  rows: ReportRow[];
  isLoading: boolean;
}

export function StudentsReportTable({ rows, isLoading }: StudentsReportTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-border bg-muted">
            <TableRow>
              <TableHead className={th}>Aluno</TableHead>
              <TableHead className={th}>Aula</TableHead>
              <TableHead className={th}>Nota média</TableHead>
              <TableHead className={th}>Frequência</TableHead>
              <TableHead className={th}>Aptidão</TableHead>
              <TableHead className={th}>Situação</TableHead>
              <TableHead className={th}>Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell className={`${td} text-center text-muted-foreground`} colSpan={7}>
                  Carregando alunos…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell className={`${td} text-center text-muted-foreground`} colSpan={7}>
                  Nenhum aluno encontrado
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((row) => (
                <TableRow key={row.id} className="border-t border-border hover:bg-muted">
                  <TableCell className={td}>
                    <Link
                      href={"/reports?studentId=" + row.id}
                      className="flex items-center gap-3"
                      aria-label={`Abrir relatório de ${row.name}`}
                    >
                      <AvatarText name={row.name} />
                      <span className="font-medium text-foreground">{row.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className={td}>{row.groupNames}</TableCell>
                  <TableCell className={td}>{formatScore(row.average)}</TableCell>
                  <TableCell className={td}>
                    {row.attendanceRate === null ? "—" : formatPercent(row.attendanceRate)}
                  </TableCell>
                  <TableCell className={td}>
                    {row.aptitude ? areaLabels[row.aptitude] : "—"}
                  </TableCell>
                  <TableCell className={td}>
                    <Badge variant={row.atRisk ? "danger" : "success"}>
                      {row.atRisk ? "Em risco" : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell className={td}>
                    <Link
                      href={"/reports?studentId=" + row.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                      aria-label={`Ver relatório de ${row.name}`}
                      title="Ver relatório"
                    >
                      <EyeIcon />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
