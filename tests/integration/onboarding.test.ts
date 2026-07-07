import { describe, it, expect } from "vitest";
import { setUser, USER_A } from "./ctx";
import { completeMission, getProgress, MISSIONS } from "@/lib/onboarding";
import { createCompany } from "@/app/(app)/empresas/actions";
import { createContact, createTouchpoint } from "@/app/(app)/contactos/actions";
import { createOpportunity } from "@/app/(app)/oportunidades/actions";

describe("completeMission · idempotencia y créditos", () => {
  it("otorga créditos una sola vez y marca completedAt", async () => {
    const first = await completeMission(USER_A, "firstSighting");
    expect(first.awarded).toBe(true);

    const again = await completeMission(USER_A, "firstSighting");
    expect(again.awarded).toBe(false);

    const state = await getProgress(USER_A);
    expect(state.credits).toBe(MISSIONS.firstSighting.credits);
    const mission = state.missions.find((m) => m.slug === "firstSighting");
    expect(mission?.completed).toBe(true);
    expect(mission?.completedAt).not.toBeNull();
  });

  it("acumula créditos de misiones distintas", async () => {
    await completeMission(USER_A, "firstSighting"); // 10
    await completeMission(USER_A, "establishContact"); // 10
    await completeMission(USER_A, "launchAttack"); // 15
    const state = await getProgress(USER_A);
    expect(state.credits).toBe(
      MISSIONS.firstSighting.credits +
        MISSIONS.establishContact.credits +
        MISSIONS.launchAttack.credits
    );
  });

  it("es seguro ante llamadas concurrentes: no duplica créditos", async () => {
    await Promise.all(
      Array.from({ length: 5 }, () => completeMission(USER_A, "setRadar"))
    );
    const state = await getProgress(USER_A);
    expect(state.credits).toBe(MISSIONS.setRadar.credits);
  });
});

describe("disparadores de misiones desde las actions", () => {
  it("crear la 1ª empresa completa 'Primer Avistamiento'", async () => {
    setUser(USER_A);
    await createCompany({ name: "Acme" });
    const state = await getProgress(USER_A);
    expect(state.missions.find((m) => m.slug === "firstSighting")?.completed).toBe(true);
  });

  it("crear el 1er contacto completa 'Establecer Contacto'", async () => {
    setUser(USER_A);
    await createContact({ name: "Ana", relationshipStrength: "COLD" });
    const state = await getProgress(USER_A);
    expect(state.missions.find((m) => m.slug === "establishContact")?.completed).toBe(true);
  });

  it("registrar el 1er touchpoint completa 'Lanzar Ataque'", async () => {
    setUser(USER_A);
    const c = await createContact({ name: "Ana", relationshipStrength: "COLD" });
    await createTouchpoint({ type: "EMAIL", contactId: (c as { id: string }).id });
    const state = await getProgress(USER_A);
    expect(state.missions.find((m) => m.slug === "launchAttack")?.completed).toBe(true);
  });

  it("crear una oportunidad con follow-up completa 'Fijar Radar'", async () => {
    setUser(USER_A);
    await createOpportunity({
      title: "Puesto",
      stage: "SAVED",
      priority: "MEDIUM",
      nextFollowUpAt: "2026-08-01",
    });
    const state = await getProgress(USER_A);
    expect(state.missions.find((m) => m.slug === "setRadar")?.completed).toBe(true);
  });

  it("crear una oportunidad SIN follow-up no completa 'Fijar Radar'", async () => {
    setUser(USER_A);
    await createOpportunity({ title: "Puesto", stage: "SAVED", priority: "MEDIUM" });
    const state = await getProgress(USER_A);
    expect(state.missions.find((m) => m.slug === "setRadar")?.completed).toBe(false);
  });
});
