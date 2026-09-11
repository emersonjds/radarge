import type { Role } from "@/entities/profile/model";

export type NavIcon =
  | "dashboard"
  | "session"
  | "reports"
  | "user"
  | "admin"
  | "subject"
  | "group"
  | "grades"
  | "events";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export const navTeacher: NavItem[] = [
  { href: "/attendance", label: "Chamada", icon: "session" },
  { href: "/students", label: "Alunos", icon: "user" },
  { href: "/grades", label: "Notas", icon: "grades" },
  { href: "/events", label: "Eventos", icon: "events" },
];

export const navCoordinator: NavItem[] = [
  { href: "/", label: "Painel", icon: "dashboard" },
  { href: "/students", label: "Alunos", icon: "user" },
  { href: "/events", label: "Eventos", icon: "events" },
  { href: "/reports", label: "Relatórios", icon: "reports" },
];

export const navAdmin: NavItem[] = [
  ...navCoordinator,
  { href: "/groups", label: "Aulas", icon: "group" },
  { href: "/subjects", label: "Matérias", icon: "subject" },
  { href: "/users", label: "Perfis", icon: "admin" },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "admin") return navAdmin;
  if (role === "coordinator") return navCoordinator;
  return navTeacher;
}
