"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSetting, setSettings } from "@/lib/settings";

const CALENDAR_TOKEN_KEY = "calendarToken";

function newToken(): string {
  return randomBytes(24).toString("hex"); // 48 chars hex
}

/** Crea el token del feed si todavía no existe. Idempotente. */
export async function createCalendarToken(): Promise<{ ok: true }> {
  const existing = await getSetting(CALENDAR_TOKEN_KEY);
  if (!existing) {
    await setSettings([{ key: CALENDAR_TOKEN_KEY, value: newToken() }]);
  }
  revalidatePath("/calendario");
  return { ok: true as const };
}

/** Regenera el token: el enlace viejo deja de funcionar al instante. */
export async function resetCalendarToken(): Promise<{ ok: true }> {
  await setSettings([{ key: CALENDAR_TOKEN_KEY, value: newToken() }]);
  revalidatePath("/calendario");
  return { ok: true as const };
}
