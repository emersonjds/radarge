"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { eventFormSchema, type Event, type EventFormValues } from "@/entities/event/model";
import { useCreateEvent, useUpdateEvent } from "@/entities/event/queries";
import type { Group } from "@/entities/group/model";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export interface EventFormModalProps {
  event: Event | null | undefined;
  groups: Group[];
  onClose: () => void;
}

export function EventFormModal({ event, groups, onClose }: EventFormModalProps) {
  return (
    <Dialog
      open={event !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
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

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      groupId: event?.groupId ?? "",
      title: event?.title ?? "",
      date: event?.date ?? "",
      location: event?.location ?? "",
      cost: event?.cost ?? 0,
    },
  });

  const submit = async (values: EventFormValues) => {
    try {
      if (event) {
        await updateEvent.mutateAsync({ id: event.id, patch: values });
      } else {
        await createEvent.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível salvar o evento."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">
          {event ? "Editar evento" : "Novo evento"}
        </DialogTitle>

        <FormField
          control={form.control}
          name="groupId"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Aula</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(event)}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Selecione a aula" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input autoFocus className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Valor por aluno (R$)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.01} className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p role="alert" className="mb-5 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
