"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudentList } from "@/widgets/student-list/StudentList";
import { StudentDetail } from "@/widgets/student-detail/StudentDetail";

function AlunosView() {
  const alunoId = useSearchParams().get("aluno");

  if (alunoId) {
    return <StudentDetail studentId={alunoId} backHref="/students" backLabel="Alunos" />;
  }

  return <StudentList />;
}

// A view lê useSearchParams (?aluno= / ?q= / ?filtro=); o Suspense permite o
// prerender estático da casca enquanto os params resolvem no cliente.
export default function AlunosPage() {
  return (
    <Suspense>
      <AlunosView />
    </Suspense>
  );
}
