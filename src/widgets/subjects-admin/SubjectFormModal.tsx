"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  AREAS,
  areaLabels,
  subjectFormSchema,
  type Subject,
  type SubjectFormValues,
} from "@/entities/subject/model";
import { useCreateSubject, useUpdateSubject } from "@/entities/subject/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export interface SubjectFormModalProps {
  subject: Subject | null | undefined;
  onClose: () => void;
}

export function SubjectFormModal({ subject, onClose }: SubjectFormModalProps) {
  return (
    <Dialog
      open={subject !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
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

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: subject?.name ?? "",
      area: subject?.area ?? "exact_sciences",
    },
  });

  const submit = async (values: SubjectFormValues) => {
    try {
      if (subject) {
        await updateSubject.mutateAsync({ id: subject.id, patch: values });
      } else {
        await createSubject.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível salvar a matéria."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">
          {subject ? "Editar matéria" : "Adicionar matéria"}
        </DialogTitle>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input autoFocus className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Área</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {areaLabels[area]}
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
