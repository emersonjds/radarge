"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  EVALUATION_TYPES,
  evaluationFormSchema,
  evaluationTypeLabels,
  type EvaluationFormValues,
} from "@/entities/evaluation/model";
import { useCreateEvaluation } from "@/entities/evaluation/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const WEIGHTS = [1, 2, 3] as const;

export interface EvaluationFormModalProps {
  open: boolean;
  groupId: string;
  subjectId: string;
  onClose: () => void;
}

export function EvaluationFormModal({
  open,
  groupId,
  subjectId,
  onClose,
}: EvaluationFormModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {open && <EvaluationFormBody groupId={groupId} subjectId={subjectId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EvaluationFormBody({
  groupId,
  subjectId,
  onClose,
}: {
  groupId: string;
  subjectId: string;
  onClose: () => void;
}) {
  const createEvaluation = useCreateEvaluation();

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      name: "",
      type: "exam",
      date: "",
      weight: 1,
    },
  });

  const submit = async (values: EvaluationFormValues) => {
    try {
      await createEvaluation.mutateAsync({ groupId, subjectId, ...values });
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível salvar a avaliação."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">Nova avaliação</DialogTitle>

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
          name="type"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVALUATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {evaluationTypeLabels[type]}
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
          name="date"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Peso</FormLabel>
              <Select value={String(field.value)} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {WEIGHTS.map((weight) => (
                    <SelectItem key={weight} value={String(weight)}>
                      {weight}
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
