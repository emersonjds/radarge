import type { Role } from "@/entities/profile/model";

export type NavIcon =
  "painel" | "session" | "relatorios" | "user" | "admin" | "materia" | "turma" | "grades" | "eventos";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export const navTeacher: NavItem[] = [
  { href: "/attendance", label: "Chamada", icon: "session" },
  { href: "/students", label: "Alunos", icon: "user" },
  { href: "/grades", label: "Notas", icon: "grades" },
  { href: "/events", label: "Eventos", icon: "eventos" },
];

export const navCoordinator: NavItem[] = [
  { href: "/", label: "Painel", icon: "painel" },
  { href: "/students", label: "Alunos", icon: "user" },
  { href: "/events", label: "Eventos", icon: "eventos" },
  { href: "/reports", label: "Relatórios", icon: "relatorios" },
];

export const navAdmin: NavItem[] = [
  ...navCoordinator,
  { href: "/groups", label: "Aulas", icon: "turma" },
  { href: "/subjects", label: "Matérias", icon: "materia" },
  { href: "/users", label: "Perfis", icon: "admin" },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "admin") return navAdmin;
  if (role === "coordinator") return navCoordinator;
  return navTeacher;
}
