import { z } from "zod";

export const roleSchema = z.enum(["teacher", "coordinator", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const roleLabels: Record<Role, string> = {
  teacher: "Professor",
  coordinator: "Coordenador",
  admin: "Administrador",
};

export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_MIN_LENGTH_MESSAGE = `Senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;

/**
 * Built per mode because the password rule differs: required on create, optional on
 * edit, where blank means "keep the current one". Modelling that in the schema keeps
 * it out of the submit handler.
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
