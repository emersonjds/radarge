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
  turmaNome: string;
  nota: number;
  freq: number;
  faltas: number;
  aptidao: Area | null;
  emRisco: boolean;
}

const th = "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const td = "px-5 py-4 text-sm text-foreground";

export interface StudentsReportTableProps {
  linhas: ReportRow[];
  carregando: boolean;
}

export function StudentsReportTable({ linhas, carregando }: StudentsReportTableProps) {
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
            {carregando && (
              <TableRow>
                <TableCell className={`${td} text-center text-muted-foreground`} colSpan={7}>
                  Carregando alunos…
                </TableCell>
              </TableRow>
            )}
            {!carregando && linhas.length === 0 && (
              <TableRow>
                <TableCell className={`${td} text-center text-muted-foreground`} colSpan={7}>
                  Nenhum aluno encontrado
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              linhas.map((linha) => (
                <TableRow key={linha.id} className="border-t border-border hover:bg-muted">
                  <TableCell className={td}>
                    <Link
                      href={"/reports?studentId=" + linha.id}
                      className="flex items-center gap-3"
                      aria-label={`Abrir relatório de ${linha.name}`}
                    >
                      <AvatarText name={linha.name} />
                      <span className="font-medium text-foreground">{linha.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className={td}>{linha.turmaNome}</TableCell>
                  <TableCell className={td}>{formatScore(linha.nota)}</TableCell>
                  <TableCell className={td}>{formatPercent(linha.freq)}</TableCell>
                  <TableCell className={td}>
                    {linha.aptidao ? areaLabels[linha.aptidao] : "—"}
                  </TableCell>
                  <TableCell className={td}>
                    <Badge variant={linha.emRisco ? "danger" : "success"}>
                      {linha.emRisco ? "Em risco" : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell className={td}>
                    <Link
                      href={"/reports?studentId=" + linha.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                      aria-label={`Ver relatório de ${linha.name}`}
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
