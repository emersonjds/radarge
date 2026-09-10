"use client";

import Link from "next/link";
import { areaLabels } from "@/entities/subject/model";
import type { Area } from "@/entities/subject/model";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { IconButton } from "@/shared/ui/icon-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Eye } from "lucide-react";

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

const th = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export interface StudentsReportTableProps {
  rows: ReportRow[];
  isLoading: boolean;
}

export function StudentsReportTable({ rows, isLoading }: StudentsReportTableProps) {
  return (
    <Card className="overflow-hidden p-0">
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
                <TableCell className="text-center text-muted-foreground" colSpan={7}>
                  Carregando alunos…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={7}>
                  Nenhum aluno encontrado
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((row) => (
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
                  <TableCell>{row.groupNames}</TableCell>
                  <TableCell>{formatScore(row.average)}</TableCell>
                  <TableCell>
                    {row.attendanceRate === null ? "—" : formatPercent(row.attendanceRate)}
                  </TableCell>
                  <TableCell>{row.aptitude ? areaLabels[row.aptitude] : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.atRisk ? "danger" : "success"}>
                      {row.atRisk ? "Em risco" : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      icon={Eye}
                      label={`Ver relatório de ${row.name}`}
                      href={"/reports?studentId=" + row.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
