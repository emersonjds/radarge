"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumbTitle } from "@/shared/providers/page-title";

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
  const title = useBreadcrumbTitle();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const defaultTitle = SEGMENT_LABELS[segments[segments.length - 1]] ?? segments[segments.length - 1];
  const hasEntityOverride = title !== null && title !== defaultTitle;

  const crumbs: Crumb[] = [{ label: "Início", href: "/" }];
  let acc = "";
  segments.forEach((segment, index) => {
    acc += "/" + segment;
    const isLast = index === segments.length - 1 && !hasEntityOverride;
    crumbs.push({ label: SEGMENT_LABELS[segment] ?? segment, href: isLast ? undefined : acc });
  });
  if (hasEntityOverride && title) crumbs.push({ label: title });

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      {title !== null && (
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
      )}
      <nav aria-label="Trilha de navegação">
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
    </div>
  );
}
