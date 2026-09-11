import { z } from "zod";

export const authorizationStatusSchema = z.enum(["pending", "authorized", "denied"]);
export const paymentStatusSchema = z.enum(["pending", "paid", "waived"]);

export type AuthorizationStatus = z.infer<typeof authorizationStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const authorizationLabels: Record<AuthorizationStatus, string> = {
  pending: "Aguardando",
  authorized: "Autorizado",
  denied: "Não autorizado",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  waived: "Isento",
};

export const eventParticipationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  studentId: z.string(),
  authorization: authorizationStatusSchema,
  payment: paymentStatusSchema,
});

export type EventParticipation = z.infer<typeof eventParticipationSchema>;

/** A student with no stored row has not been touched yet: everything pending. */
export const defaultParticipation = {
  authorization: "pending",
  payment: "pending",
} as const satisfies Pick<EventParticipation, "authorization" | "payment">;
