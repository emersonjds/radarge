import { describe, expect, it } from "vitest";
import type { Event } from "@/entities/event/model";
import type { Group } from "@/entities/group/model";
import type { Student } from "@/entities/student/model";
import { buildEventNotice, whatsappLink } from "./notice";

const group: Group = { id: "g1", name: "Reforço de Matemática — Segunda", shift: "afternoon", teacherId: "t1" };

const student: Student = {
  id: "s1",
  name: "João Silva",
  birthDate: "2015-03-10",
  guardianName: "Maria Silva",
  guardianPhone: "(11) 98812-4477",
  active: true,
};

const event: Event = {
  id: "ev1",
  groupId: "g1",
  title: "Passeio ao Zoológico",
  date: "2026-08-01",
  location: "Zoológico de São Paulo",
  cost: 25,
};

describe("buildEventNotice", () => {
  it("inclui responsável, aluno, evento, data por extenso, local e valor", () => {
    const notice = buildEventNotice({ event, group, student });

    expect(notice).toContain("Maria Silva");
    expect(notice).toContain("João Silva");
    expect(notice).toContain("Passeio ao Zoológico");
    expect(notice).toContain("1 de agosto de 2026");
    expect(notice).toContain("Zoológico de São Paulo");
    expect(notice).toMatch(/R\$\s?25,00/);
  });

  it("evento gratuito informa que é gratuito, sem valor", () => {
    const notice = buildEventNotice({ event: { ...event, cost: 0 }, group, student });

    expect(notice).toContain("gratuito");
    expect(notice).not.toContain("R$");
  });
});

describe("whatsappLink", () => {
  it("normaliza telefone sem DDI, adicionando 55", () => {
    const link = whatsappLink("(11) 98812-4477", "olá");
    expect(link).toBe("https://wa.me/5511988124477?text=ol%C3%A1");
  });

  it("mantém telefone que já vem com DDI 55", () => {
    const link = whatsappLink("+55 (11) 98812-4477", "olá");
    expect(link).toBe("https://wa.me/5511988124477?text=ol%C3%A1");
  });

  it("telefone com poucos dígitos retorna null", () => {
    expect(whatsappLink("1234", "olá")).toBeNull();
  });
});
