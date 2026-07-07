import { describe, it, expect } from "vitest";
import { db, setUser, USER_A } from "./ctx";
import { POST as waitlistPOST } from "@/app/api/waitlist/route";
import { GET as calendarGET } from "@/app/api/calendario/[token]/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/waitlist", () => {
  it("guarda un email válido y normaliza a minúsculas", async () => {
    const res = await waitlistPOST(jsonRequest({ email: "Nuevo@Acme.COM", source: "hero" }));
    expect(res.status).toBe(200);
    const row = await db().waitlistSignup.findFirst();
    expect(row?.email).toBe("nuevo@acme.com");
    expect(row?.source).toBe("hero");
  });

  // FIX (mismo origen que en contactos): el email se recorta antes de validar,
  // así que espacios alrededor ya no lo invalidan.
  it("acepta un email con espacios alrededor (se recorta antes de validar)", async () => {
    const res = await waitlistPOST(jsonRequest({ email: "  a@b.com " }));
    expect(res.status).toBe(200);
    expect((await db().waitlistSignup.findFirst())?.email).toBe("a@b.com");
  });

  it("es idempotente: re-enviar el mismo email no duplica ni falla", async () => {
    await waitlistPOST(jsonRequest({ email: "dup@acme.com" }));
    const res = await waitlistPOST(jsonRequest({ email: "dup@acme.com" }));
    expect(res.status).toBe(200);
    expect(await db().waitlistSignup.count()).toBe(1);
  });

  it("rechaza un email inválido con 400", async () => {
    const res = await waitlistPOST(jsonRequest({ email: "no-es-email" }));
    expect(res.status).toBe(400);
    expect(await db().waitlistSignup.count()).toBe(0);
  });

  it("rechaza un body que no es JSON con 400", async () => {
    const bad = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: "no json",
    });
    const res = await waitlistPOST(bad);
    expect(res.status).toBe(400);
  });
});

describe("/api/calendario/[token]", () => {
  const TOKEN = "a".repeat(24);

  function calReq() {
    return new Request(`http://localhost/api/calendario/${TOKEN}`);
  }
  function calCtx(token: string) {
    return { params: Promise.resolve({ token }) } as Parameters<typeof calendarGET>[1];
  }

  async function seedTokenAndFollowUp() {
    setUser(USER_A);
    await db().setting.create({ data: { userId: USER_A, key: "calendarToken", value: TOKEN } });
    await db().opportunity.create({
      data: { userId: USER_A, title: "Follow-up Acme", nextFollowUpAt: new Date("2026-08-01T00:00:00Z") },
    });
  }

  it("devuelve un feed .ics con los follow-ups del dueño del token", async () => {
    await seedTokenAndFollowUp();
    const res = await calendarGET(calReq(), calCtx(TOKEN));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("Follow-up Acme");
  });

  it("un token inexistente devuelve 404", async () => {
    await seedTokenAndFollowUp();
    const res = await calendarGET(calReq(), calCtx("z".repeat(24)));
    expect(res.status).toBe(404);
  });

  it("un token demasiado corto devuelve 404 sin consultar la DB", async () => {
    const res = await calendarGET(calReq(), calCtx("corto"));
    expect(res.status).toBe(404);
  });
});
