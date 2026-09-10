"use client";

import { useState, type FormEvent } from "react";
import { AREAS, areaLabels, type Area } from "@/entities/subject/model";
import type { Subject } from "@/entities/subject/model";
import { useCreateSubject, useUpdateSubject } from "@/entities/subject/queries";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

const controlClasses =
  "h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20";

export interface SubjectFormModalProps {
  subject: Subject | null | undefined;
  onClose: () => void;
}

export function SubjectFormModal({ subject, onClose }: SubjectFormModalProps) {
  return (
    <Dialog
      open={subject !== undefined}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {subject !== undefined && (
          <SubjectFormBody key={subject?.id ?? "new"} subject={subject} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubjectFormBody({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const [name, setName] = useState(subject?.name ?? "");
  const [area, setArea] = useState<Area>(subject?.area ?? "exact_sciences");
  const [erro, setErro] = useState<string | null>(null);
  const saving = createSubject.isPending || updateSubject.isPending;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setErro(null);
    try {
      if (subject) {
        await updateSubject.mutateAsync({ id: subject.id, patch: { name: name.trim(), area } });
      } else {
        await createSubject.mutateAsync({ name, area });
      }
      onClose();
    } catch {
      setErro("Não foi possível salvar a matéria.");
    }
  }

  return (
    <form onSubmit={save}>
      <DialogTitle className="mb-6 text-foreground">
        {subject ? "Editar matéria" : "Adicionar matéria"}
      </DialogTitle>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="materia-nome">
          Nome
        </Label>
        <input
          id="materia-nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="materia-area">
          Área
        </Label>
        <select
          id="materia-area"
          value={area}
          onChange={(event) => setArea(event.target.value as Area)}
          className={controlClasses}
        >
          {AREAS.map((value) => (
            <option key={value} value={value}>
              {areaLabels[value]}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}
