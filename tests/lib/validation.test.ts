import { describe, it, expect } from "vitest";
import {
  OpportunitySchema,
  ContactSchema,
  CompanySchema,
  CVVersionSchema,
  TouchpointSchema,
  ProjectTaskSchema,
  StageSchema,
  WaitlistSchema,
  firstZodError,
} from "@/lib/validation";

describe("OpportunitySchema", () => {
  const valid = {
    title: "Backend en Acme",
    stage: "SAVED",
    priority: "MEDIUM" as const,
  };

  it("acepta lo mínimo requerido", () => {
    expect(OpportunitySchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza título vacío", () => {
    const r = OpportunitySchema.safeParse({ ...valid, title: "   " });
    expect(r.success).toBe(false);
  });

  it("rechaza título que supera el largo máximo (200)", () => {
    const r = OpportunitySchema.safeParse({ ...valid, title: "a".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("rechaza una prioridad fuera del enum", () => {
    const r = OpportunitySchema.safeParse({ ...valid, priority: "URGENTE" });
    expect(r.success).toBe(false);
  });

  it("rechaza un kind inválido", () => {
    const r = OpportunitySchema.safeParse({ ...valid, kind: "personal" });
    expect(r.success).toBe(false);
  });

  it("acepta kind own y client", () => {
    expect(OpportunitySchema.safeParse({ ...valid, kind: "own" }).success).toBe(true);
    expect(OpportunitySchema.safeParse({ ...valid, kind: "client" }).success).toBe(true);
  });

  it("rechaza appliedAt con formato no yyyy-MM-dd", () => {
    const r = OpportunitySchema.safeParse({ ...valid, appliedAt: "15/07/2026" });
    expect(r.success).toBe(false);
  });

  it("acepta appliedAt vacío o con formato correcto", () => {
    expect(OpportunitySchema.safeParse({ ...valid, appliedAt: "" }).success).toBe(true);
    expect(OpportunitySchema.safeParse({ ...valid, appliedAt: "2026-07-15" }).success).toBe(true);
  });

  it("acepta nextFollowUpAt como fecha o fecha+hora", () => {
    expect(OpportunitySchema.safeParse({ ...valid, nextFollowUpAt: "2026-07-15" }).success).toBe(true);
    expect(OpportunitySchema.safeParse({ ...valid, nextFollowUpAt: "2026-07-15T14:30" }).success).toBe(true);
  });

  it("rechaza nextFollowUpAt con formato inválido", () => {
    const r = OpportunitySchema.safeParse({ ...valid, nextFollowUpAt: "mañana" });
    expect(r.success).toBe(false);
  });

  it("valida un solo campo con .pick (edición in-context)", () => {
    const ok = OpportunitySchema.pick({ title: true }).safeParse({ title: "Nuevo" });
    expect(ok.success).toBe(true);
    const bad = OpportunitySchema.pick({ title: true }).safeParse({ title: "" });
    expect(bad.success).toBe(false);
  });
});

describe("ContactSchema", () => {
  const valid = { name: "Ana", relationshipStrength: "COLD" as const };

  it("acepta lo mínimo requerido", () => {
    expect(ContactSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta email vacío o válido", () => {
    expect(ContactSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(ContactSchema.safeParse({ ...valid, email: "a@b.com" }).success).toBe(true);
  });

  it("rechaza email con formato inválido", () => {
    expect(ContactSchema.safeParse({ ...valid, email: "no-es-email" }).success).toBe(false);
  });

  it("acepta un email con espacios alrededor (se recorta antes de validar)", () => {
    const r = ContactSchema.safeParse({ ...valid, email: "  ana@acme.com " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@acme.com");
  });

  it("rechaza una fuerza de relación fuera del enum", () => {
    expect(ContactSchema.safeParse({ ...valid, relationshipStrength: "MEGA" }).success).toBe(false);
  });
});

describe("CompanySchema", () => {
  it("requiere nombre", () => {
    expect(CompanySchema.safeParse({ name: "" }).success).toBe(false);
    expect(CompanySchema.safeParse({ name: "Acme" }).success).toBe(true);
  });
});

describe("CVVersionSchema", () => {
  it("requiere label y limita el contenido a 100k", () => {
    expect(CVVersionSchema.safeParse({ label: "v1" }).success).toBe(true);
    expect(CVVersionSchema.safeParse({ label: "" }).success).toBe(false);
    expect(
      CVVersionSchema.safeParse({ label: "v1", content: "a".repeat(100001) }).success
    ).toBe(false);
  });
});

describe("TouchpointSchema", () => {
  it("acepta los tipos válidos incluyendo IDEA/AVANCE", () => {
    for (const type of ["EMAIL", "LINKEDIN", "CALL", "MEETING", "REFERRAL_ASK", "NOTE", "IDEA", "AVANCE"]) {
      expect(TouchpointSchema.safeParse({ type }).success).toBe(true);
    }
  });

  it("rechaza un tipo desconocido", () => {
    expect(TouchpointSchema.safeParse({ type: "SMS" }).success).toBe(false);
  });
});

describe("ProjectTaskSchema", () => {
  it("requiere opportunityId y title", () => {
    expect(ProjectTaskSchema.safeParse({ opportunityId: "abc", title: "Hito" }).success).toBe(true);
    expect(ProjectTaskSchema.safeParse({ opportunityId: "", title: "Hito" }).success).toBe(false);
    expect(ProjectTaskSchema.safeParse({ opportunityId: "abc", title: "" }).success).toBe(false);
  });
});

describe("StageSchema", () => {
  it("coacciona una probabilidad inválida a 0 en vez de fallar", () => {
    const r = StageSchema.safeParse({ label: "Etapa", type: "open", probability: "abc" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.probability).toBe(0);
  });

  it("acepta y parsea una probabilidad numérica en rango", () => {
    const r = StageSchema.safeParse({ label: "Etapa", type: "open", probability: "55" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.probability).toBe(55);
  });

  it("coacciona probabilidad fuera de rango (>100) a 0 vía catch", () => {
    // min/max fallan y el .catch(0) atrapa el error.
    const r = StageSchema.safeParse({ label: "Etapa", type: "open", probability: 150 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.probability).toBe(0);
  });
});

describe("WaitlistSchema", () => {
  it("requiere un email válido", () => {
    expect(WaitlistSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(WaitlistSchema.safeParse({ email: "roto" }).success).toBe(false);
  });
});

describe("firstZodError", () => {
  it("devuelve el mensaje de campo obligatorio en español", () => {
    const r = OpportunitySchema.safeParse({ stage: "SAVED", priority: "MEDIUM", title: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Este campo es obligatorio.");
  });

  it("devuelve el mensaje de largo máximo", () => {
    const r = OpportunitySchema.safeParse({
      stage: "SAVED",
      priority: "MEDIUM",
      title: "a".repeat(201),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Un campo supera el largo máximo permitido.");
  });

  it("devuelve el mensaje de valor no permitido para un enum inválido", () => {
    const r = OpportunitySchema.safeParse({ stage: "SAVED", title: "x", priority: "X" });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Hay un valor no permitido en el formulario.");
  });

  it("devuelve el mensaje de formato para una fecha inválida", () => {
    const r = OpportunitySchema.safeParse({
      stage: "SAVED",
      title: "x",
      priority: "MEDIUM",
      appliedAt: "15-07-2026",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Fecha inválida.");
  });
});
