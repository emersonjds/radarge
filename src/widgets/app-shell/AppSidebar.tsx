"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@tailadmin/context/SidebarContext";
import { navForRole, type NavIcon } from "@/shared/config/navigation";
import type { Role } from "@/entities/profile/model";
import {
  GridIcon,
  CalenderIcon,
  CalendarIcon,
  GroupIcon,
  PieChartIcon,
  UserCircleIcon,
  DocsIcon,
  TableIcon,
  TaskIcon,
} from "@tailadmin/icons";

const navIcons: Record<NavIcon, ReactNode> = {
  painel: <GridIcon />,
  session: <CalenderIcon />,
  user: <GroupIcon />,
  relatorios: <PieChartIcon />,
  admin: <UserCircleIcon />,
  materia: <DocsIcon />,
  turma: <TableIcon />,
  grades: <TaskIcon />,
  eventos: <CalendarIcon />,
};

export interface AppSidebarProps {
  role: Role;
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  const items = navForRole(role);
  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card px-5 transition-all duration-300 ease-in-out ${
        showText ? "w-72.5" : "w-22.5"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex flex-col py-8 ${showText ? "items-start" : "items-center"}`}>
        <span className="text-2xl font-bold text-primary">{showText ? "Radar" : "R"}</span>
        {showText && (
          <span className="text-xs font-medium text-muted-foreground">Gestão Estudantil</span>
        )}
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group menu-item ${
                active ? "menu-item-active" : "menu-item-inactive"
              } ${showText ? "" : "justify-center"}`}
            >
              <span className={active ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                {navIcons[item.icon]}
              </span>
              <span className={showText ? "" : "sr-only"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
