"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Copy, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { isFree, type Event } from "@/entities/event/model";
import { useDeleteEvent } from "@/entities/event/queries";
import {
  authorizationLabels,
  defaultParticipation,
  paymentLabels,
  type AuthorizationStatus,
  type PaymentStatus,
} from "@/entities/event-participation/model";
import { useParticipationsByEvent, useSetParticipation } from "@/entities/event-participation/queries";
import type { Group } from "@/entities/group/model";
import { useStudentsByGroup } from "@/entities/student/queries";
import type { Student } from "@/entities/student/model";
import { buildEventNotice, whatsappLink } from "@/features/events/notice";
import { summarizeParticipation } from "@/features/events/summary";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

const selectClasses =
  "h-11 w-full min-w-36 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus:border-ring focus:outline-hidden sm:h-9";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export interface EventDetailProps {
  event: Event;
  group: Group;
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function EventDetail({ event, group, canManage, onBack, onEdit, onDeleted }: EventDetailProps) {
  const { data: students } = useStudentsByGroup(event.groupId);
  const { data: participations } = useParticipationsByEvent(event.id);
  const setParticipation = useSetParticipation();
  const deleteEvent = useDeleteEvent();
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  const free = isFree(event);
  const studentIds = useMemo(() => (students ?? []).map((student) => student.id), [students]);
  const summary = useMemo(
    () => summarizeParticipation(event, participations ?? [], studentIds),
    [event, participations, studentIds],
  );

  function participationOf(studentId: string) {
    return (participations ?? []).find((row) => row.studentId === studentId) ?? defaultParticipation;
  }

  async function copyNotice(student: Student) {
    const message = buildEventNotice({ event, group, student });
    await navigator.clipboard.writeText(message);
    setCopiedStudentId(student.id);
    setTimeout(() => setCopiedStudentId((current) => (current === student.id ? null : current)), 1500);
  }

  async function remove() {
    if (!window.confirm(`Excluir o evento "${event.title}"? As participações registradas serão apagadas.`))
      return;
    await deleteEvent.mutateAsync(event.id);
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(event.date)} · {event.location} · {group.name}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {free ? "Gratuito" : `${formatCurrency(event.cost)} por aluno`}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={remove}>
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Autorizados" value={String(summary.authorized)} />
        <Stat label="Aguardando" value={String(summary.pendingAuthorization)} />
        <Stat label="Não autorizados" value={String(summary.denied)} />
        {free ? (
          <Stat label="Total de alunos" value={String(summary.total)} />
        ) : (
          <>
            <Stat label="Pagos" value={String(summary.paid)} />
            <Stat label="Pendentes de pagamento" value={String(summary.pendingPayment)} />
            <Stat label="Isentos" value={String(summary.waived)} />
            <Stat
              label="Arrecadado"
              value={`${formatCurrency(summary.collected)} de ${formatCurrency(summary.expected)}`}
            />
          </>
        )}
      </div>

      {/* Cartão por aluno no celular: o professor marca autorização e pagamento em sala, sem rolagem lateral. */}
      <ul className="divide-y rounded-xl border bg-card shadow-sm">
        {(students ?? []).map((student) => {
          const participation = participationOf(student.id);
          const message = buildEventNotice({ event, group, student });
          const link = whatsappLink(student.guardianPhone, message);

          return (
            <li key={student.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-4">
              <span className="font-medium text-foreground lg:flex-1">{student.name}</span>

              <div className="grid grid-cols-2 gap-2 lg:flex lg:w-auto">
                <select
                  aria-label={`Autorização de ${student.name}`}
                  value={participation.authorization}
                  onChange={(changeEvent) =>
                    setParticipation.mutate({
                      eventId: event.id,
                      studentId: student.id,
                      authorization: changeEvent.target.value as AuthorizationStatus,
                    })
                  }
                  className={selectClasses}
                >
                  {Object.entries(authorizationLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {!free && (
                  <select
                    aria-label={`Pagamento de ${student.name}`}
                    value={participation.payment}
                    onChange={(changeEvent) =>
                      setParticipation.mutate({
                        eventId: event.id,
                        studentId: student.id,
                        payment: changeEvent.target.value as PaymentStatus,
                      })
                    }
                    className={selectClasses}
                  >
                    {Object.entries(paymentLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                {link && (
                  <Button asChild variant="outline" size="sm" className="h-11 flex-1 sm:h-9 lg:flex-none">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 flex-1 sm:h-9 lg:flex-none"
                  onClick={() => copyNotice(student)}
                >
                  <Copy className="size-4" />
                  {copiedStudentId === student.id ? "Copiado!" : "Copiar texto"}
                </Button>
              </div>
            </li>
          );
        })}

        {(students ?? []).length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Nenhum aluno matriculado nesta aula.</li>
        )}
      </ul>
    </div>
  );
}
