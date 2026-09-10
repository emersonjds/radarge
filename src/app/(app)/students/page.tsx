"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudentList } from "@/widgets/student-list/StudentList";
import { StudentDetail } from "@/widgets/student-detail/StudentDetail";

function StudentsView() {
  const studentId = useSearchParams().get("aluno");

  if (studentId) {
    return <StudentDetail studentId={studentId} backHref="/students" backLabel="Alunos" />;
  }

  return <StudentList />;
}

// useSearchParams opts the view out of static prerendering; the Suspense
// boundary keeps the shell prerenderable while params resolve on the client.
export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsView />
    </Suspense>
  );
}
