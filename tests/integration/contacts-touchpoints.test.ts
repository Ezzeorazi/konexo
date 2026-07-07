import { describe, it, expect } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import {
  createContact,
  createTouchpoint,
  updateTouchpoint,
  deleteTouchpoint,
} from "@/app/(app)/contactos/actions";
import { createOpportunity } from "@/app/(app)/oportunidades/actions";

describe("createContact", () => {
  it("limpia y normaliza los campos", async () => {
    const res = await createContact({
      name: "  Ana  ", // requiredText hace .trim() en el schema
      relationshipStrength: "STRONG",
      linkedinUrl: "linkedin.com/in/ana",
      email: "ana@acme.com",
    });
    const c = await db().contact.findUnique({ where: { id: (res as { id: string }).id } });
    expect(c?.name).toBe("Ana");
    expect(c?.linkedinUrl).toBe("https://linkedin.com/in/ana");
    expect(c?.email).toBe("ana@acme.com");
    expect(c?.track).toBe("jobs");
  });

  it("rechaza email inválido", async () => {
    const res = await createContact({ name: "Ana", relationshipStrength: "COLD", email: "roto" });
    expect(res.ok).toBe(false);
  });

  // FIX: el email se recorta antes de validar, así que espacios alrededor ya no
  // lo invalidan (antes devolvía error). Se guarda limpio.
  it("acepta un email con espacios alrededor (se recorta antes de validar)", async () => {
    const res = await createContact({
      name: "Ana",
      relationshipStrength: "COLD",
      email: "  ana@acme.com ",
    });
    expect(res.ok).toBe(true);
    const c = await db().contact.findUnique({ where: { id: (res as { id: string }).id } });
    expect(c?.email).toBe("ana@acme.com");
  });
});

describe("createTouchpoint · validaciones y propiedad", () => {
  it("exige estar ligado a un contacto o a una oportunidad", async () => {
    const res = await createTouchpoint({ type: "NOTE", note: "suelta" });
    expect(res.ok).toBe(false);
  });

  it("rechaza ligarse a un contacto ajeno", async () => {
    setUser(USER_B);
    const c = await createContact({ name: "De B", relationshipStrength: "COLD" });
    const contactId = (c as { id: string }).id;

    setUser(USER_A);
    const res = await createTouchpoint({ type: "EMAIL", contactId });
    expect(res.ok).toBe(false);
    expect(await db().touchpoint.count()).toBe(0);
  });

  it("rechaza ligarse a una oportunidad ajena", async () => {
    setUser(USER_B);
    const o = await createOpportunity({ title: "De B", stage: "SAVED", priority: "MEDIUM" });
    const opportunityId = (o as { id: string }).id;

    setUser(USER_A);
    const res = await createTouchpoint({ type: "CALL", opportunityId });
    expect(res.ok).toBe(false);
    expect(await db().touchpoint.count()).toBe(0);
  });

  it("crea un touchpoint válido ligado a un contacto propio", async () => {
    setUser(USER_A);
    const c = await createContact({ name: "Propio", relationshipStrength: "WARM" });
    const contactId = (c as { id: string }).id;
    const res = await createTouchpoint({ type: "MEETING", note: "reunión", contactId });
    expect(res.ok).toBe(true);
    const tp = await db().touchpoint.findFirst();
    expect(tp?.type).toBe("MEETING");
    expect(tp?.contactId).toBe(contactId);
  });
});

describe("updateTouchpoint / deleteTouchpoint", () => {
  it("actualiza solo los campos presentes en el patch", async () => {
    setUser(USER_A);
    const c = await createContact({ name: "X", relationshipStrength: "COLD" });
    await createTouchpoint({ type: "EMAIL", note: "original", contactId: (c as { id: string }).id });
    const tp = await db().touchpoint.findFirst();

    const res = await updateTouchpoint(tp!.id, { note: "editado" });
    expect(res.ok).toBe(true);
    const after = await db().touchpoint.findUnique({ where: { id: tp!.id } });
    expect(after?.note).toBe("editado");
    expect(after?.type).toBe("EMAIL"); // no se tocó
  });

  it("no permite borrar el touchpoint de otro usuario", async () => {
    setUser(USER_A);
    const c = await createContact({ name: "X", relationshipStrength: "COLD" });
    await createTouchpoint({ type: "EMAIL", contactId: (c as { id: string }).id });
    const tp = await db().touchpoint.findFirst();

    setUser(USER_B);
    const res = await deleteTouchpoint(tp!.id);
    expect(res.ok).toBe(false);
    expect(await db().touchpoint.count()).toBe(1);
  });
});
