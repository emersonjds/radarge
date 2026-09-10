import { z } from "zod";

export const roleSchema = z.enum(["teacher", "coordinator", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const roleLabels: Record<Role, string> = {
  teacher: "Professor",
  coordinator: "Coordenador",
  admin: "Administrador",
};

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  role: roleSchema,
  jobTitle: z.string().optional(),
  username: z.string(),
  // Demo-only: SHA-256 hex of the password (see shared/lib/auth/password).
  passwordHash: z.string(),
  active: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;

export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_MIN_LENGTH_MESSAGE = `Senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;

/**
 * What the profile form collects. Splitting it from `profileSchema` is what lets the
 * messages be user-facing Portuguese: the entity schema also parses stored records,
 * where a message would never be read.
 *
 * Password is required on create and optional on edit (blank means "keep the current
 * password"), so the shape is built per mode rather than branched in the submit handler.
 */
export const profileFormSchema = (mode: "create" | "edit") =>
  z.object({
    name: z.string().trim().min(1, "Informe o nome."),
    username: z.string().trim().min(1, "Informe o login de usuário."),
    role: roleSchema,
    password:
      mode === "create"
        ? z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE)
        : z
            .string()
            .refine(
              (value) => value === "" || value.length >= MIN_PASSWORD_LENGTH,
              PASSWORD_MIN_LENGTH_MESSAGE,
            ),
  });

export type ProfileFormValues = z.infer<ReturnType<typeof profileFormSchema>>;

/** Credentials the sign-in screen collects. */
export const credentialsFormSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

export type CredentialsFormValues = z.infer<typeof credentialsFormSchema>;

/**
 * The current password is only checked for presence: the floor applies to the
 * password being set, and rejecting a short current one would leak that it is
 * wrong before the API ever answers.
 */
export const passwordChangeFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da atual.",
  });

export type PasswordChangeFormValues = z.infer<typeof passwordChangeFormSchema>;
