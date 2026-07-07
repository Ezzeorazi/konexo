import { describe, it, expect, beforeEach } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import { createCompany, updateCompany, deleteCompany } from "@/app/(app)/empresas/actions";
import {
  createOpportunity,
  updateOpportunity,
  patchOpportunityField,
  deleteOpportunity,
  updateOpportunityStage,
} from "@/app/(app)/oportunidades/actions";
import { createContact, updateContact, deleteContact } from "@/app/(app)/contactos/actions";
import { GET as exportGET } from "@/app/api/export/route";

// El aislamiento entre tenants es la garantía más importante de Konexo: cada
// query filtra por userId a mano, así que un where olvidado filtraría datos de
// otro usuario. Estos tests siembran datos de dos usuarios y verifican que
// ninguna action ni la exportación cruza la frontera.

async function seedForBoth() {
  setUser(USER_A);
  const a = await createCompany({ name: "Empresa de A" });
  setUser(USER_B);
  const b = await createCompany({ name: "Empresa de B" });
  return { aId: (a as { id: string }).id, bId: (b as { id: string }).id };
}

describe("multi-tenancy · empresas", () => {
  it("cada usuario solo ve sus propias empresas", async () => {
    await seedForBoth();
    expect(await db().company.count({ where: { userId: USER_A } })).toBe(1);
    expect(await db().company.count({ where: { userId: USER_B } })).toBe(1);
  });

  it("A no puede actualizar la empresa de B", async () => {
    const { bId } = await seedForBoth();
    setUser(USER_A);
    const res = await updateCompany(bId, { name: "Hackeada" });
    expect(res.ok).toBe(false);
    // La empresa de B quedó intacta.
    const b = await db().company.findUnique({ where: { id: bId } });
    expect(b?.name).toBe("Empresa de B");
  });

  it("A no puede borrar la empresa de B", async () => {
    const { bId } = await seedForBoth();
    setUser(USER_A);
    await deleteCompany(bId);
    expect(await db().company.findUnique({ where: { id: bId } })).not.toBeNull();
  });
});

describe("multi-tenancy · oportunidades", () => {
  it("A no puede editar, patchear, mover de etapa ni borrar la de B", async () => {
    setUser(USER_B);
    const created = await createOpportunity({ title: "Puesto de B", stage: "SAVED", priority: "MEDIUM" });
    const oppId = (created as { id: string }).id;

    setUser(USER_A);
    expect((await updateOpportunity(oppId, { title: "robada", stage: "SAVED", priority: "LOW" })).ok).toBe(false);
    expect((await patchOpportunityField(oppId, "title", "robada")).ok).toBe(false);
    await updateOpportunityStage(oppId, "OFFER"); // no falla pero no debe aplicar
    await deleteOpportunity(oppId);

    // Nada cambió: sigue existiendo, con su título y etapa originales.
    const opp = await db().opportunity.findUnique({ where: { id: oppId } });
    expect(opp).not.toBeNull();
    expect(opp?.title).toBe("Puesto de B");
    expect(opp?.stage).toBe("SAVED");
  });
});

describe("multi-tenancy · contactos", () => {
  it("A no puede actualizar ni borrar el contacto de B", async () => {
    setUser(USER_B);
    const created = await createContact({ name: "Contacto de B", relationshipStrength: "COLD" });
    const cId = (created as { id: string }).id;

    setUser(USER_A);
    expect((await updateContact(cId, { name: "robado", relationshipStrength: "WARM" })).ok).toBe(false);
    await deleteContact(cId);

    const c = await db().contact.findUnique({ where: { id: cId } });
    expect(c?.name).toBe("Contacto de B");
  });
});

describe("multi-tenancy · exportación", () => {
  beforeEach(async () => {
    // Sembramos datos ricos para A y para B.
    setUser(USER_A);
    await createCompany({ name: "A Corp" });
    await createOpportunity({ title: "A opp", stage: "SAVED", priority: "MEDIUM" });
    await createContact({ name: "A contact", relationshipStrength: "COLD" });
    setUser(USER_B);
    await createCompany({ name: "B Corp" });
    await createOpportunity({ title: "B opp", stage: "SAVED", priority: "MEDIUM" });
  });

  it("/api/export solo devuelve los datos del usuario actual", async () => {
    setUser(USER_A);
    const res = await exportGET();
    const body = await res.json();

    expect(body.userId).toBe(USER_A);
    expect(body.data.companies).toHaveLength(1);
    expect(body.data.companies[0].name).toBe("A Corp");
    expect(body.data.opportunities).toHaveLength(1);
    expect(body.data.contacts).toHaveLength(1);
    // Ningún dato de B se coló.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("B Corp");
    expect(serialized).not.toContain("B opp");
  });

  it("la exportación de B es independiente de la de A", async () => {
    setUser(USER_B);
    const body = await (await exportGET()).json();
    expect(body.data.companies.map((c: { name: string }) => c.name)).toEqual(["B Corp"]);
    expect(body.data.contacts).toHaveLength(0); // a B no le sembramos contactos
  });
});
