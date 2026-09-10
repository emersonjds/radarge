"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Copy, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { cva } from "class-variance-authority";
import { isFree, type Event } from "@/entities/event/model";
import { useDeleteEvent } from "@/entities/event/queries";
import {
  authorizationLabels,
  defaultParticipation,
  paymentLabels,
  type AuthorizationStatus,
  type PaymentStatus,
} from "@/entities/event-participation/model";
import {
  useParticipationsByEvent,
  useSetParticipation,
} from "@/entities/event-participation/queries";
import type { Group } from "@/entities/group/model";
import { useStudentsByGroup } from "@/entities/student/queries";
import type { Student } from "@/entities/student/model";
import { buildEventNotice, whatsappLink } from "@/features/events/notice";
import { summarizeParticipation, type EventSummary } from "@/features/events/summary";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatCurrency, formatDate, formatPercent } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";

const selectClasses =
  "h-11 w-full min-w-36 rounded-lg border border-input bg-transparent px-3 text-base text-foreground focus:border-ring focus:outline-hidden md:h-9 md:text-sm";

type StatTone = "neutral" | "success" | "warning" | "danger";

const statTileVariants = cva("flex min-h-20 flex-col-reverse justify-end rounded-lg border p-3", {
  variants: {
    tone: {
      neutral: "border-border bg-gray-50",
      success: "border-success-200 bg-success-50",
      warning: "border-warning-300 bg-warning-50",
      danger: "border-error-200 bg-error-50",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const statLabelVariants = cva("text-xs", {
  variants: {
    tone: {
      neutral: "text-muted-foreground",
      success: "text-success-700",
      warning: "text-warning-700",
      danger: "text-error-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const statValueVariants = cva("text-2xl text-foreground", {
  variants: {
    tone: {
      neutral: "font-semibold",
      success: "font-bold",
      warning: "font-bold",
      danger: "font-bold",
    },
  },
  defaultVariants: { tone: "neutral" },
});

interface StatProps {
  label: string;
  value: string;
  tone?: StatTone;
  testId?: string;
}

function Stat({ label, value, tone = "neutral", testId }: StatProps) {
  return (
    <div className={statTileVariants({ tone })}>
      <p className={cn("mt-1", statLabelVariants({ tone }))}>{label}</p>
      <p data-testid={testId} className={statValueVariants({ tone })}>
        {value}
      </p>
    </div>
  );
}

interface AuthorizationGroupProps {
  summary: EventSummary;
}

function AuthorizationGroup({ summary }: AuthorizationGroupProps) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Autorização
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Stat
          tone="success"
          label="Autorizados"
          value={String(summary.authorized)}
          testId="stat-authorized"
        />
        <Stat tone="warning" label="Aguardando" value={String(summary.pendingAuthorization)} />
        <Stat tone="danger" label="Não autorizados" value={String(summary.denied)} />
      </div>
    </div>
  );
}

interface MoneyCardProps {
  summary: EventSummary;
}

function MoneyCard({ summary }: MoneyCardProps) {
  const hasExpected = summary.expected > 0;
  const percent = hasExpected ? Math.round((summary.collected / summary.expected) * 100) : 0;

  return (
    <div className={cn(statTileVariants({ tone: "neutral" }), "flex-col gap-1 sm:max-w-xs")}>
      <div className="flex items-center justify-between">
        <p className={statLabelVariants({ tone: "neutral" })}>Arrecadado</p>
        {hasExpected && (
          <Badge className="bg-brand-100 text-brand-700">{formatPercent(percent)}</Badge>
        )}
      </div>
      <p data-testid="stat-collected" className={statValueVariants({ tone: "neutral" })}>
        {formatCurrency(summary.collected)}
      </p>
      {hasExpected ? (
        <p className="text-xs text-muted-foreground">
          de <span className="whitespace-nowrap">{formatCurrency(summary.expected)}</span>{" "}
          esperados
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Todos os alunos estão isentos de pagamento.
        </p>
      )}
      {hasExpected && (
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-brand-100"
          aria-hidden="true"
        >
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
      )}
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

export function EventDetail({
  event,
  group,
  canManage,
  onBack,
  onEdit,
  onDeleted,
}: EventDetailProps) {
  const studentsQuery = useStudentsByGroup(event.groupId);
  const { data: students } = studentsQuery;
  const participationsQuery = useParticipationsByEvent(event.id);
  const { data: participations } = participationsQuery;
  const isLoadingParticipants = studentsQuery.isLoading || participationsQuery.isLoading;
  const hasParticipantsError = studentsQuery.isError || participationsQuery.isError;
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
    return (
      (participations ?? []).find((row) => row.studentId === studentId) ?? defaultParticipation
    );
  }

  async function copyNotice(student: Student) {
    const message = buildEventNotice({ event, group, student });
    await navigator.clipboard.writeText(message);
    setCopiedStudentId(student.id);
    setTimeout(
      () => setCopiedStudentId((current) => (current === student.id ? null : current)),
      1500,
    );
  }

  async function remove() {
    if (
      !window.confirm(
        `Excluir o evento "${event.title}"? As participações registradas serão apagadas.`,
      )
    )
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

      <Card asChild>
        <header className="flex flex-wrap items-start justify-between gap-3">
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
      </Card>

      <Card asChild>
        <section aria-label="Indicadores do evento">
          {isLoadingParticipants ? (
            <RowsSkeleton rows={2} avatar={false} />
          ) : hasParticipantsError ? (
            <QueryErrorState
              message={messageForError(
                studentsQuery.error ?? participationsQuery.error,
                "Não foi possível carregar os indicadores.",
              )}
              onRetry={() => {
                if (studentsQuery.isError) studentsQuery.refetch();
                if (participationsQuery.isError) participationsQuery.refetch();
              }}
            />
          ) : summary.total === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum aluno matriculado nesta aula ainda. Os indicadores aparecem assim que houver
              alunos.
            </div>
          ) : free ? (
            <div className="flex flex-col gap-3">
              <AuthorizationGroup summary={summary} />
              <div className="flex items-center justify-between rounded-lg border border-border bg-gray-50 p-3 lg:max-w-xs">
                <p className="text-xs text-muted-foreground">Total de alunos</p>
                <p className="text-2xl font-semibold text-foreground">{summary.total}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <MoneyCard summary={summary} />
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
                <AuthorizationGroup summary={summary} />
                <div className="border-t border-border pt-4 lg:border-t-0 lg:pt-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Pagamento
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    <Stat
                      tone="neutral"
                      label="Pagos"
                      value={String(summary.paid)}
                      testId="stat-paid"
                    />
                    <Stat tone="neutral" label="Pendentes" value={String(summary.pendingPayment)} />
                    <Stat tone="neutral" label="Isentos" value={String(summary.waived)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </Card>

      {/* Cards instead of a table: the teacher fills this in class on a phone, and a table forces sideways scrolling. */}
      {isLoadingParticipants ? (
        <Card className="p-0">
          <RowsSkeleton rows={4} />
        </Card>
      ) : hasParticipantsError ? (
        <Card>
          <QueryErrorState
            message={messageForError(
              studentsQuery.error ?? participationsQuery.error,
              "Não foi possível carregar os alunos.",
            )}
            onRetry={() => {
              if (studentsQuery.isError) studentsQuery.refetch();
              if (participationsQuery.isError) participationsQuery.refetch();
            }}
          />
        </Card>
      ) : (
        <Card asChild className="divide-y p-0">
          <ul>
            {(students ?? []).map((student) => {
              const participation = participationOf(student.id);
              const message = buildEventNotice({ event, group, student });
              const link = whatsappLink(student.guardianPhone, message);

              return (
                <li
                  key={student.id}
                  className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-4"
                >
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
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-11 flex-1 sm:h-9 lg:flex-none"
                      >
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
              <li className="p-4 text-sm text-muted-foreground">
                Nenhum aluno matriculado nesta aula.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
