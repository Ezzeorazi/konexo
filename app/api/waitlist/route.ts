import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { WaitlistSchema, firstZodError } from "@/lib/validation";

// Captura de emails desde la landing (pública, sin auth). Guarda el lead y lo
// manda a PostHog como señal de demanda. Idempotente: re-enviar el mismo email
// no falla.

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });
  }

  const parsed = WaitlistSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: firstZodError(parsed.error) },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source?.trim() || "landing";

  await prisma.waitlistSignup.upsert({
    where: { email },
    update: {}, // ya estaba: no duplicamos
    create: { email, source },
  });

  await track(email, "waitlist_signup", { source });

  return NextResponse.json({ ok: true });
}
