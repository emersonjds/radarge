"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { studentFormSchema, type Student, type StudentFormValues } from "@/entities/student/model";
import { useCreateStudent, useUpdateStudent } from "@/entities/student/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

export interface StudentFormModalProps {
  student: Student | null | undefined;
  onClose: () => void;
}

export function StudentFormModal({ student, onClose }: StudentFormModalProps) {
  return (
    <Dialog
      open={student !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {student !== undefined && (
          <StudentFormBody key={student?.id ?? "new"} student={student} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StudentFormBodyProps {
  student: Student | null;
  onClose: () => void;
}

function StudentFormBody({ student, onClose }: StudentFormBodyProps) {
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: student?.name ?? "",
      birthDate: student?.birthDate ?? "",
      guardianName: student?.guardianName ?? "",
      guardianPhone: student?.guardianPhone ?? "",
      active: student?.active ?? true,
    },
  });

  const submit = async (values: StudentFormValues) => {
    try {
      if (student) {
        await updateStudent.mutateAsync({ id: student.id, patch: values });
      } else {
        await createStudent.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível salvar o aluno."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">
          {student ? "Editar aluno" : "Adicionar aluno"}
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
          name="birthDate"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Data de nascimento</FormLabel>
              <FormControl>
                <Input type="date" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guardianName"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Nome do responsável</FormLabel>
              <FormControl>
                <Input className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guardianPhone"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Telefone do responsável</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 91234-5678"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {student && (
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="mb-5 flex flex-row items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel>Ativo</FormLabel>
              </FormItem>
            )}
          />
        )}

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
