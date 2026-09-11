"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  SHIFTS,
  shiftLabels,
  groupFormSchema,
  type Group,
  type GroupFormValues,
} from "@/entities/group/model";
import { useCreateGroup, useUpdateGroup } from "@/entities/group/queries";
import { useProfiles } from "@/entities/profile/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export interface GroupFormModalProps {
  group: Group | null | undefined;
  onClose: () => void;
}

export function GroupFormModal({ group, onClose }: GroupFormModalProps) {
  return (
    <Dialog
      open={group !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {group !== undefined && (
          <GroupFormBody key={group?.id ?? "new"} group={group} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupFormBody({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { data: profiles } = useProfiles();
  const teachers = (profiles ?? []).filter((profile) => profile.role === "teacher");

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: group?.name ?? "",
      shift: group?.shift ?? "afternoon",
      teacherId: group?.teacherId ?? "",
    },
  });

  const submit = async (values: GroupFormValues) => {
    try {
      if (group) {
        await updateGroup.mutateAsync({ id: group.id, patch: values });
      } else {
        await createGroup.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível salvar a aula."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">
          {group ? "Editar aula" : "Adicionar aula"}
        </DialogTitle>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shift"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Turno</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SHIFTS.map((shift) => (
                    <SelectItem key={shift} value={shift}>
                      {shiftLabels[shift]}
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
          name="teacherId"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Professor regente</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o professor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
