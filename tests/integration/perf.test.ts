import { describe, it, expect, beforeEach } from "vitest";
import { db, setUser, USER_A } from "./ctx";
import {
  getDashboardData,
  DASHBOARD_FOLLOWUP_TAKE,
  DASHBOARD_NO_CONTACT_TAKE,
} from "@/lib/dashboard";
import { getTrackStages } from "@/lib/stages";
import { GET as calendarGET } from "@/app/api/calendario/[token]/route";

// Escalabilidad: sembramos volúmenes grandes y verificamos que las lecturas del
// dashboard y del feed .ics queden ACOTADAS (no crecen con los datos) y sigan
// siendo correctas. Los tiempos sobre PGlite (WASM en proceso) no representan a
// Neon, así que los umbrales son generosos: sólo atrapan regresiones groseras.

const OPPS = 1000;
const CONTACTS = 500;

async function seedManyForA() {
  setUser(USER_A);
  const now = new Date();
  // 1000 oportunidades sin empresa (⇒ todas califican para "sin contacto"),
  // etapa SAVED (abierta, no la última). Las primeras 50 con follow-up próximo.
  await db().opportunity.createMany({
    data: Array.from({ length: OPPS }, (_, i) => ({
      userId: USER_A,
      title: `Oportunidad ${i}`,
      track: "jobs",
      stage: "SAVED",
      nextFollowUpAt: i < 50 ? now : null,
    })),
  });
  // 500 contactos; los primeros 30 con follow-up próximo.
  await db().contact.createMany({
    data: Array.from({ length: CONTACTS }, (_, i) => ({
      userId: USER_A,
      name: `Contacto ${i}`,
      track: "jobs",
      nextFollowUpAt: i < 30 ? now : null,
    })),
  });
}

describe(`getDashboardData con ${OPPS} oportunidades y ${CONTACTS} contactos`, () => {
  beforeEach(async () => {
    await seedManyForA();
  });

  it("las listas quedan acotadas por sus topes (no crecen con los datos)", async () => {
    const stages = await getTrackStages("jobs");
    const data = await getDashboardData({
      userId: USER_A,
      track: "jobs",
      stages,
      hasValue: false,
    });

    // Follow-ups: máximo 10 de oportunidades + 10 de contactos.
    expect(data.followUps.length).toBeLessThanOrEqual(DASHBOARD_FOLLOWUP_TAKE * 2);
    // "Sin contacto": acotado por su tope (antes era ilimitado).
    expect(data.noContactOpps.length).toBe(DASHBOARD_NO_CONTACT_TAKE);
  });

  it("los totales son correctos a escala", async () => {
    const stages = await getTrackStages("jobs");
    const data = await getDashboardData({
      userId: USER_A,
      track: "jobs",
      stages,
      hasValue: false,
    });
    expect(data.totalOpportunities).toBe(OPPS);
    expect(data.contactCount).toBe(CONTACTS);
    expect(data.countByStage.get("SAVED")).toBe(OPPS);
  });

  it("resuelve en un tiempo razonable (smoke anti-regresión)", async () => {
    const stages = await getTrackStages("jobs");
    const t0 = Date.now();
    await getDashboardData({ userId: USER_A, track: "jobs", stages, hasValue: false });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("feed .ics a escala", () => {
  const TOKEN = "b".repeat(24);

  beforeEach(async () => {
    setUser(USER_A);
    await db().setting.create({
      data: { userId: USER_A, key: "calendarToken", value: TOKEN },
    });
    // 200 oportunidades con follow-up ⇒ 200 eventos en el feed.
    await db().opportunity.createMany({
      data: Array.from({ length: 200 }, (_, i) => ({
        userId: USER_A,
        title: `Follow ${i}`,
        track: "jobs",
        nextFollowUpAt: new Date("2026-08-01T00:00:00Z"),
      })),
    });
  });

  it("emite todos los eventos y resuelve rápido", async () => {
    const req = new Request(`http://localhost/api/calendario/${TOKEN}`);
    const ctx = { params: Promise.resolve({ token: TOKEN }) } as Parameters<typeof calendarGET>[1];
    const t0 = Date.now();
    const res = await calendarGET(req, ctx);
    const elapsed = Date.now() - t0;

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(200);
    expect(elapsed).toBeLessThan(5000);
  });
});
