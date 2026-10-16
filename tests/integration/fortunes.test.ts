import { describe, it, expect } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import { claimVictory } from "@/lib/fortune-victory";
import { getDailyCookie } from "@/lib/fortune-data";
import { DAILY_BONUS } from "@/lib/fortunes";

async function savedJob(userId = USER_A) {
  return db().opportunity.create({
    data: {
      userId,
      title: "Frontend Dev",
      track: "jobs",
      stage: "SAVED",
      jobDescription: "React + TS",
    },
  });
}

describe("claimVictory · Galletas de la Victoria", () => {
  it("otorga créditos y devuelve la galleta siguiente", async () => {
    const o = await savedJob();
    const res = await claimVictory(USER_A, o.id, "saved-gates", false);
    expect(res.ok && res.awarded).toBe(true);
    if (!res.ok) return;
    expect(res.credits).toBeGreaterThan(0);
    expect(res.totalCredits).toBe(res.credits);
    expect(res.next?.key).not.toBe("saved-gates");
  });

  it("es idempotente: la misma galleta no paga dos veces", async () => {
    const o = await savedJob();
    await claimVictory(USER_A, o.id, "saved-gates", false);
    const again = await claimVictory(USER_A, o.id, "saved-gates", false);
    expect(again.ok && again.awarded).toBe(false);
    expect(await db().cookieVictory.count()).toBe(1);
  });

  it("rechaza una galleta que no es la que toca ahora", async () => {
    const o = await savedJob();
    const res = await claimVictory(USER_A, o.id, "offer-negotiate", false);
    expect(res.ok).toBe(false);
    const fake = await claimVictory(USER_A, o.id, "inventada", false);
    expect(fake.ok).toBe(false);
  });

  it("no deja reclamar en oportunidades de otro usuario", async () => {
    const o = await savedJob(USER_B);
    const res = await claimVictory(USER_A, o.id, "saved-gates", false);
    expect(res.ok).toBe(false);
  });

  it("la galleta del día paga bonus una sola vez por día", async () => {
    const a = await savedJob();
    const b = await savedJob();
    const first = await claimVictory(USER_A, a.id, "saved-gates", true);
    const second = await claimVictory(USER_A, b.id, "saved-gates", true);
    if (!first.ok || !second.ok) throw new Error("esperaba ok");
    expect(second.credits).toBe(first.credits - DAILY_BONUS);
    expect(await db().cookieVictory.count({ where: { daily: true } })).toBe(1);
  });

  it("getDailyCookie refleja el pipeline y la victoria del día", async () => {
    setUser(USER_A);
    const empty = await getDailyCookie(USER_A);
    expect(empty.empty).toBe(true);
    expect(empty.fortune).toBeNull();

    const o = await savedJob();
    const before = await getDailyCookie(USER_A);
    expect(before.fortune?.opportunityId).toBe(o.id);
    expect(before.wonToday).toBe(false);

    await claimVictory(USER_A, o.id, before.fortune!.key, true);
    expect((await getDailyCookie(USER_A)).wonToday).toBe(true);
  });

  it("borrar la oportunidad borra sus victorias (cascade)", async () => {
    const o = await savedJob();
    await claimVictory(USER_A, o.id, "saved-gates", false);
    await db().opportunity.delete({ where: { id: o.id } });
    expect(await db().cookieVictory.count()).toBe(0);
  });
});
