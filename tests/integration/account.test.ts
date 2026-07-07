import { describe, it, expect } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import { deleteAccount } from "@/app/(app)/configuracion/account-actions";

// Siembra datos en TODAS las tablas del tenant para un usuario dado.
async function seedFullTenant(userId: string) {
  const p = db();
  const company = await p.company.create({ data: { userId, name: "Corp" } });
  const opp = await p.opportunity.create({ data: { userId, title: "Opp", companyId: company.id } });
  const contact = await p.contact.create({ data: { userId, name: "Contact", companyId: company.id } });
  await p.touchpoint.create({ data: { userId, type: "EMAIL", contactId: contact.id, opportunityId: opp.id } });
  await p.cVVersion.create({ data: { userId, label: "CV v1" } });
  await p.projectTask.create({ data: { userId, opportunityId: opp.id, title: "Hito" } });
  await p.pipelineStage.create({ data: { userId, track: "jobs", key: "SAVED", label: "Guardada", order: 0 } });
  await p.setting.create({ data: { userId, key: "aiProvider", value: "groq" } });
  await p.userProgress.create({ data: { userId, credits: 20 } });
  await p.aiUsage.create({ data: { userId, day: "2026-07-06", count: 3 } });
}

async function tenantRowCount(userId: string): Promise<number> {
  const p = db();
  const counts = await Promise.all([
    p.company.count({ where: { userId } }),
    p.opportunity.count({ where: { userId } }),
    p.contact.count({ where: { userId } }),
    p.touchpoint.count({ where: { userId } }),
    p.cVVersion.count({ where: { userId } }),
    p.projectTask.count({ where: { userId } }),
    p.pipelineStage.count({ where: { userId } }),
    p.setting.count({ where: { userId } }),
    p.userProgress.count({ where: { userId } }),
    p.aiUsage.count({ where: { userId } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

describe("deleteAccount", () => {
  it("rechaza sin la palabra de confirmación y no borra nada", async () => {
    await seedFullTenant(USER_A);
    setUser(USER_A);
    const res = await deleteAccount("borrar");
    expect(res.ok).toBe(false);
    expect(await tenantRowCount(USER_A)).toBeGreaterThan(0);
  });

  it("borra TODO el tenant del usuario actual con 'ELIMINAR'", async () => {
    await seedFullTenant(USER_A);
    setUser(USER_A);
    const res = await deleteAccount("ELIMINAR");
    expect(res.ok).toBe(true);
    expect(await tenantRowCount(USER_A)).toBe(0);
  });

  it("acepta la confirmación con espacios y en minúsculas", async () => {
    await seedFullTenant(USER_A);
    setUser(USER_A);
    const res = await deleteAccount("  eliminar  ");
    expect(res.ok).toBe(true);
    expect(await tenantRowCount(USER_A)).toBe(0);
  });

  it("no toca los datos de otro usuario", async () => {
    await seedFullTenant(USER_A);
    await seedFullTenant(USER_B);
    setUser(USER_A);
    await deleteAccount("ELIMINAR");
    expect(await tenantRowCount(USER_A)).toBe(0);
    expect(await tenantRowCount(USER_B)).toBe(10); // una fila por tabla, intactas
  });
});
