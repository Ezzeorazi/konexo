import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  await prisma.touchpoint.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.cVVersion.deleteMany();

  const cv = await prisma.cVVersion.create({
    data: {
      label: "CV General 2026",
      fileName: "cv-ezequiel-2026.pdf",
      notes: "Versión base, enfoque full-stack.",
    },
  });

  const mercadoLibre = await prisma.company.create({
    data: {
      name: "Mercado Libre",
      website: "https://careers.mercadolibre.com",
      location: "Buenos Aires, Argentina",
      industry: "E-commerce / Fintech",
      source: "LinkedIn",
      notes: "Cultura de alto ritmo. Buscan seniority en backend.",
    },
  });

  const vercana = await prisma.company.create({
    data: {
      name: "Vercana Labs",
      website: "https://vercanalabs.example.com",
      location: "Remoto (LATAM)",
      industry: "SaaS B2B",
      source: "Referido de un excompañero",
    },
  });

  const lucia = await prisma.contact.create({
    data: {
      name: "Lucía Fernández",
      role: "Engineering Manager",
      companyId: mercadoLibre.id,
      email: "lucia.fernandez@example.com",
      linkedinUrl: "https://linkedin.com/in/lucia-fernandez-example",
      relationshipStrength: "STRONG",
      nextFollowUpAt: daysFromNow(2),
      notes: "Trabajamos juntos en 2023. Muy buena onda, ofreció ayudar.",
    },
  });

  // Contacto frío en la misma empresa que Lucía, para ver el orden por fuerza
  // de relación en el panel de referidos
  await prisma.contact.create({
    data: {
      name: "Diego Paz",
      role: "Talent Sourcer",
      companyId: mercadoLibre.id,
      linkedinUrl: "https://linkedin.com/in/diego-paz-example",
      relationshipStrength: "COLD",
      notes: "Me agregó en LinkedIn, nunca hablamos.",
    },
  });

  const marcos = await prisma.contact.create({
    data: {
      name: "Marcos Oliveira",
      role: "Tech Recruiter",
      companyId: vercana.id,
      email: "marcos@vercanalabs.example.com",
      relationshipStrength: "WARM",
      notes: "Me contactó por LinkedIn en mayo. Respondió rápido.",
    },
  });

  const oppMeli = await prisma.opportunity.create({
    data: {
      title: "Backend Engineer Ssr",
      companyId: mercadoLibre.id,
      stage: "INTERVIEW",
      url: "https://careers.mercadolibre.com/job/12345",
      location: "Híbrido - Buenos Aires",
      salaryRange: "USD 3.000 - 4.000",
      priority: "HIGH",
      appliedAt: daysFromNow(-10),
      nextFollowUpAt: daysFromNow(1),
      cvVersionId: cv.id,
      jobDescription:
        "Equipo de pagos. Stack: Java/Go, microservicios, alta escala.",
      notes: "Primera entrevista técnica pasada. Falta system design.",
    },
  });

  const oppVercana = await prisma.opportunity.create({
    data: {
      title: "Full-stack Developer (Next.js)",
      companyId: vercana.id,
      stage: "APPLIED",
      location: "Remoto",
      salaryRange: "USD 2.500 - 3.500",
      priority: "MEDIUM",
      appliedAt: daysFromNow(-7),
      // Follow-up vencido a propósito, para ver el estado "vencido hace X"
      nextFollowUpAt: daysFromNow(-2),
      cvVersionId: cv.id,
      jobDescription: "Producto SaaS B2B, Next.js + Postgres + AWS.",
    },
  });

  await prisma.opportunity.create({
    data: {
      title: "Frontend Engineer",
      stage: "SAVED",
      url: "https://example.com/jobs/frontend",
      location: "Remoto (global)",
      priority: "LOW",
      notes: "Sin empresa confirmada en el aviso. Investigar quién publica.",
    },
  });

  await prisma.touchpoint.create({
    data: {
      type: "REFERRAL_ASK",
      note: "Le pedí a Lucía que me refiera para la posición de backend. Dijo que sí, lo carga esta semana.",
      occurredAt: daysFromNow(-5),
      contactId: lucia.id,
      opportunityId: oppMeli.id,
    },
  });

  await prisma.touchpoint.create({
    data: {
      type: "LINKEDIN",
      note: "Mensaje inicial de Marcos con la propuesta. Le respondí con mi CV.",
      occurredAt: daysFromNow(-4),
      contactId: marcos.id,
      opportunityId: oppVercana.id,
    },
  });

  await prisma.touchpoint.create({
    data: {
      type: "MEETING",
      note: "Entrevista técnica con el equipo de pagos. Salió bien.",
      occurredAt: daysFromNow(-2),
      contactId: lucia.id,
      opportunityId: oppMeli.id,
    },
  });

  console.log("Seed completado: 2 empresas, 3 oportunidades, 3 contactos, 3 touchpoints, 1 CV.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
