import type { Event } from "@/entities/event/model";
import { isFree } from "@/entities/event/model";
import type { Group } from "@/entities/group/model";
import type { Student } from "@/entities/student/model";
import { formatCurrency, formatDateLong } from "@/shared/lib/format";

export interface EventNoticeInput {
  event: Event;
  group: Group;
  student: Student;
}

export function buildEventNotice({ event, group, student }: EventNoticeInput): string {
  const valueLine = isFree(event) ? "Este evento é gratuito." : `Valor: ${formatCurrency(event.cost)} por aluno.`;

  return [
    `Olá, ${student.guardianName}!`,
    `A aula "${group.name}" de ${student.name} vai participar do evento "${event.title}".`,
    `Data: ${formatDateLong(event.date)}.`,
    `Local: ${event.location}.`,
    valueLine,
    "Por favor, confirme a autorização para a participação do aluno.",
  ].join("\n");
}

const MIN_VALID_PHONE_DIGITS = 10;
const BRAZIL_COUNTRY_CODE = "55";

/** Returns null when the phone has too few digits to be a real number — the UI hides the button. */
export function whatsappLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < MIN_VALID_PHONE_DIGITS) return null;

  const withCountryCode = digits.startsWith(BRAZIL_COUNTRY_CODE) ? digits : `${BRAZIL_COUNTRY_CODE}${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
