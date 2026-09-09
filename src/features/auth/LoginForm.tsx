"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { setSession } from "@/features/session/session-store";
import { roleLabels, type Role } from "@/entities/profile/model";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { loginAsRole } from "./authenticate";

const ROLES: Role[] = ["admin", "teacher", "coordinator"];

/** O que cada cargo encontra depois de entrar — espelha navForRole. */
const acessoPorCargo: Record<Role, string> = {
  admin: "Painel, alunos, relatórios, aulas, matérias e perfis.",
  teacher: "Chamada das suas aulas, seus alunos e lançamento de notas.",
  coordinator: "Painel de acompanhamento, alunos e relatórios.",
};

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entrando) return;
    setErro(null);
    setEntrando(true);
    try {
      const profile = await loginAsRole(role);
      if (!profile) {
        setErro("Nenhum perfil ativo para esse cargo.");
        return;
      }
      setSession(profile.id);
      router.push("/");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <form
      onSubmit={entrar}
      className="w-full max-w-sm duration-500 animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entrar</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Escolha o cargo para abrir a demonstração.
      </p>

      <div className="mt-8">
        <Label htmlFor="perfil">Entrar como</Label>
        <div className="relative mt-2">
          <select
            id="perfil"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background pr-10 pl-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-ring/50 focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20"
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{acessoPorCargo[role]}</p>
      </div>

      {erro && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {erro}
        </p>
      )}

      <Button className="mt-7 h-11 w-full text-sm" disabled={entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </Button>

      <p className="mt-6 text-xs text-muted-foreground">
        Ambiente de demonstração — sem senha. Os dados são fictícios.
      </p>
    </form>
  );
}
