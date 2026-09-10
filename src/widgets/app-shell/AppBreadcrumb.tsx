"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudents } from "@/entities/student/queries";

const SEGMENT_LABELS: Record<string, string> = {
  attendance: "Chamada",
  students: "Alunos",
  reports: "Relatórios",
  users: "Perfis",
  events: "Eventos",
};

interface Crumb {
  label: string;
  href?: string;
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const { data: students } = useStudents();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const nameById = new Map((students ?? []).map((student) => [student.id, student.name]));

  const crumbs: Crumb[] = [{ label: "Início", href: "/" }];
  let acc = "";
  segments.forEach((segment, index) => {
    acc += "/" + segment;
    const isLast = index === segments.length - 1;
    const label = SEGMENT_LABELS[segment] ?? nameById.get(segment) ?? segment;
    crumbs.push({ label, href: isLast ? undefined : acc });
  });

  return (
    <nav aria-label="Trilha de navegação" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href ?? crumb.label} className="flex items-center gap-1.5">
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
            {index < crumbs.length - 1 && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
