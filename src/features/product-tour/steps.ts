import type { DriveStep } from "driver.js";
import { navForRole } from "@/shared/config/navigation";
import type { Role } from "@/entities/profile/model";

export const REPLAY_TOUR_TARGET = "replay-tour";

export const tourTarget = (href: string): string => `nav-${href}`;

const selector = (target: string): string => `[data-tour="${target}"]`;

const navCopy: Record<string, { title: string; description: string }> = {
  "/": { title: "Painel", description: "Frequência, faltas e alunos em risco num só lugar." },
  "/attendance": { title: "Chamada", description: "Escolha a aula e marque quem veio. Salva tudo de uma vez." },
  "/students": { title: "Alunos", description: "Fichas dos alunos, com responsável e telefone." },
  "/grades": { title: "Notas", description: "Lance as notas de cada avaliação da aula." },
  "/events": { title: "Eventos", description: "Datas e atividades da ONG." },
  "/reports": { title: "Relatórios", description: "Frequência e desempenho para exportar." },
  "/groups": { title: "Aulas", description: "Crie aulas, defina o professor e matricule alunos." },
  "/subjects": { title: "Matérias", description: "Matérias usadas nas avaliações." },
  "/users": { title: "Perfis", description: "Quem acessa o sistema e com qual papel." },
};

export const stepsForRole = (role: Role): DriveStep[] => {
  const navSteps = navForRole(role).flatMap((item): DriveStep[] => {
    const copy = navCopy[item.href];
    if (!copy) return [];
    return [{ element: selector(tourTarget(item.href)), popover: copy }];
  });

  return [
    {
      popover: {
        title: "Bem-vindo ao Radarge",
        description: "Um giro rápido pelo menu. Leva menos de um minuto.",
      },
    },
    ...navSteps,
    {
      element: selector(REPLAY_TOUR_TARGET),
      popover: { title: "Rever este tour", description: "Quer ver de novo? É só tocar aqui." },
    },
  ];
};
