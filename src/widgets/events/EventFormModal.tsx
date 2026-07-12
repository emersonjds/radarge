"use client";

import { useState, type FormEvent } from "react";
import type { Event } from "@/entities/event/model";
import { useCreateEvent, useUpdateEvent } from "@/entities/event/queries";
import type { Group } from "@/entities/group/model";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

const controlClasses =
  "h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20";

export interface EventFormModalProps {
  event: Event | null | undefined;
  groups: Group[];
  onClose: () => void;
}

export function EventFormModal({ event, groups, onClose }: EventFormModalProps) {
  return (
    <Dialog
      open={event !== undefined}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {event !== undefined && (
          <EventFormBody key={event?.id ?? "new"} event={event} groups={groups} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EventFormBodyProps {
  event: Event | null;
  groups: Group[];
  onClose: () => void;
}

function EventFormBody({ event, groups, onClose }: EventFormBodyProps) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [groupId, setGroupId] = useState(event?.groupId ?? groups[0]?.id ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [cost, setCost] = useState(event?.cost ?? 0);
  const [erro, setErro] = useState<string | null>(null);
  const saving = createEvent.isPending || updateEvent.isPending;

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (saving) return;
    setErro(null);
    try {
      if (event) {
        await updateEvent.mutateAsync({
          id: event.id,
          patch: { title, date, location, cost },
        });
      } else {
        await createEvent.mutateAsync({ groupId, title, date, location, cost });
      }
      onClose();
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível salvar o evento.");
    }
  }

  return (
    <form onSubmit={save}>
      <DialogTitle className="mb-6 text-foreground">{event ? "Editar evento" : "Novo evento"}</DialogTitle>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="evento-aula">
          Aula
        </Label>
        <select
          id="evento-aula"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          required
          disabled={Boolean(event)}
          className={controlClasses}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="evento-titulo">
          Título
        </Label>
        <input
          id="evento-titulo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="evento-data">
          Data
        </Label>
        <input
          id="evento-data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="evento-local">
          Local
        </Label>
        <input
          id="evento-local"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="evento-valor">
          Valor por aluno (R$)
        </Label>
        <input
          id="evento-valor"
          type="number"
          min={0}
          step={0.01}
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          required
          className={controlClasses}
        />
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
