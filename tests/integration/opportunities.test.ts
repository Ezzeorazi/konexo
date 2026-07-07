import { describe, it, expect } from "vitest";
import { db, setUser, USER_A } from "./ctx";
import {
  createOpportunity,
  updateOpportunity,
  patchOpportunityField,
  deleteOpportunity,
  updateOpportunityStage,
} from "@/app/(app)/oportunidades/actions";
import { createContact, createTouchpoint } from "@/app/(app)/contactos/actions";

async function makeOpp(overrides: Record<string, unknown> = {}) {
  const res = await createOpportunity({
    title: "Backend en Acme",
    stage: "SAVED",
    priority: "MEDIUM",
    ...overrides,
  } as Parameters<typeof createOpportunity>[0]);
  return (res as { id: string }).id;
}

describe("createOpportunity", () => {
  it("crea con defaults y valores limpios", async () => {
    const id = await makeOpp({ value: "1500,50", url: "acme.com" });
    const opp = await db().opportunity.findUnique({ where: { id } });
    expect(opp?.track).toBe("jobs");
    expect(opp?.kind).toBe("client");
    expect(opp?.value).toBe(1500.5); // "1500,50" → coma decimal → 1500.5
    expect(opp?.url).toBe("https://acme.com"); // normalizeUrl
  });

  // FIX: el parser ahora entiende el separador de miles (AR "1.500,50" y US
  // "1,500.50" → 1500.5). Antes se perdía y quedaba null.
  it("parsea un monto con separador de miles (AR y US)", async () => {
    const arId = await makeOpp({ value: "1.500,50" });
    expect((await db().opportunity.findUnique({ where: { id: arId } }))?.value).toBe(1500.5);
    const usId = await makeOpp({ value: "1,500.50" });
    expect((await db().opportunity.findUnique({ where: { id: usId } }))?.value).toBe(1500.5);
  });

  it("rechaza título vacío con mensaje de validación", async () => {
    const res = await createOpportunity({ title: "  ", stage: "SAVED", priority: "MEDIUM" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("Este campo es obligatorio.");
  });

  it("respeta el track cuando es válido y cae al default si no", async () => {
    const idFree = await makeOpp({ track: "freelance", kind: "own" });
    expect((await db().opportunity.findUnique({ where: { id: idFree } }))?.track).toBe("freelance");
    const idBad = await makeOpp({ track: "inexistente" });
    expect((await db().opportunity.findUnique({ where: { id: idBad } }))?.track).toBe("jobs");
  });
});

describe("reglas de negocio del embudo", () => {
  it("mover a APPLIED fija appliedAt solo si estaba vacío", async () => {
    const id = await makeOpp();
    await updateOpportunityStage(id, "APPLIED");
    const first = await db().opportunity.findUnique({ where: { id } });
    expect(first?.appliedAt).not.toBeNull();

    // Volver a SAVED y de nuevo a APPLIED no debe pisar la fecha original.
    const originalDate = first!.appliedAt!;
    await updateOpportunityStage(id, "SAVED");
    await updateOpportunityStage(id, "APPLIED");
    const second = await db().opportunity.findUnique({ where: { id } });
    expect(second?.appliedAt?.getTime()).toBe(originalDate.getTime());
  });

  it("llegar a la última etapa (jobs: CLOSED) limpia el follow-up pendiente", async () => {
    const id = await makeOpp({ nextFollowUpAt: "2026-08-01" });
    expect((await db().opportunity.findUnique({ where: { id } }))?.nextFollowUpAt).not.toBeNull();
    await updateOpportunityStage(id, "CLOSED");
    expect((await db().opportunity.findUnique({ where: { id } }))?.nextFollowUpAt).toBeNull();
  });

  it("patchOpportunityField('stage') aplica las mismas reglas que updateOpportunityStage", async () => {
    const id = await makeOpp({ nextFollowUpAt: "2026-08-01" });
    await patchOpportunityField(id, "stage", "APPLIED");
    expect((await db().opportunity.findUnique({ where: { id } }))?.appliedAt).not.toBeNull();
    await patchOpportunityField(id, "stage", "CLOSED");
    expect((await db().opportunity.findUnique({ where: { id } }))?.nextFollowUpAt).toBeNull();
  });

  // FIX del hallazgo de la auditoría: la etapa ahora se valida contra el embudo
  // del track. Una etapa fantasma se rechaza y la card conserva su etapa.
  it("rechaza una etapa que no existe en el track (updateOpportunityStage)", async () => {
    const id = await makeOpp();
    const res = await updateOpportunityStage(id, "ETAPA_FANTASMA");
    expect(res.ok).toBe(false);
    expect((await db().opportunity.findUnique({ where: { id } }))?.stage).toBe("SAVED");
  });

  it("rechaza una etapa fantasma también vía patchOpportunityField", async () => {
    const id = await makeOpp();
    const res = await patchOpportunityField(id, "stage", "ETAPA_FANTASMA");
    expect(res.ok).toBe(false);
    expect((await db().opportunity.findUnique({ where: { id } }))?.stage).toBe("SAVED");
  });
});

describe("deleteOpportunity · cascada de actividad", () => {
  it("borra la bitácora interna (IDEA/AVANCE) pero conserva interacciones ligadas a un contacto", async () => {
    setUser(USER_A);
    const oppId = await makeOpp({ track: "freelance", kind: "own" });
    const contactRes = await createContact({ name: "Cliente", relationshipStrength: "WARM" });
    const contactId = (contactRes as { id: string }).id;

    // Nota interna (bitácora) colgada solo de la oportunidad.
    await createTouchpoint({ type: "AVANCE", note: "avance interno", opportunityId: oppId });
    // Interacción con un contacto, también ligada a la oportunidad.
    await createTouchpoint({ type: "EMAIL", note: "mail al cliente", contactId, opportunityId: oppId });

    expect(await db().touchpoint.count()).toBe(2);

    await deleteOpportunity(oppId);

    const remaining = await db().touchpoint.findMany();
    // La bitácora murió; la interacción sobrevive con opportunityId en null.
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe("EMAIL");
    expect(remaining[0].contactId).toBe(contactId);
    expect(remaining[0].opportunityId).toBeNull();
  });
});

describe("updateOpportunity", () => {
  it("devuelve error si el id no existe", async () => {
    const res = await updateOpportunity("no-existe", { title: "x", stage: "SAVED", priority: "LOW" });
    expect(res.ok).toBe(false);
  });
});
