"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { credentialsFormSchema, type CredentialsFormValues } from "@/entities/profile/model";
import { sessionKeys } from "@/features/session/use-session";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { signIn } from "./api";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const submit = async (values: CredentialsFormValues) => {
    try {
      const profile = await signIn(values);
      queryClient.setQueryData(sessionKeys.current, profile);
      router.replace(profile.mustChangePassword ? "/change-password" : "/");
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, SIGN_IN_FAILED, { unauthorized: SIGN_IN_FAILED }),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-3 motion-reduce:animate-none"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entrar</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use o usuário e a senha que a coordenação cadastrou para você.
        </p>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="mt-8">
              <FormLabel>Usuário</FormLabel>
              <FormControl>
                <Input autoFocus autoComplete="username" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="mt-5">
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errors.root.message}
          </p>
        )}

        <Button type="submit" className="mt-7 h-11 w-full text-sm" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}

const SIGN_IN_FAILED = "Usuário ou senha incorretos.";
