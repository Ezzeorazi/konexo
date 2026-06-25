import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// Captura de emails desde la landing (pública, sin auth). Guarda el lead y lo
// manda a PostHog como señal de demanda. Idempotente: re-enviar el mismo email
// no falla.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let email = "";
  let source = "landing";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    if (body?.source) source = String(body.source).slice(0, 40);
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Email inválido." },
      { status: 400 }
    );
  }

  await prisma.waitlistSignup.upsert({
    where: { email },
    update: {}, // ya estaba: no duplicamos
    create: { email, source },
  });

  await track(email, "waitlist_signup", { source });

  return NextResponse.json({ ok: true });
}
