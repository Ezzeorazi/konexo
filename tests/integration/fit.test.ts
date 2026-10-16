import { describe, it, expect, vi } from "vitest";
import { db, USER_A, USER_B } from "./ctx";

const aiMock = vi.hoisted(() => ({ text: "" }));
vi.mock("@/lib/ai", () => ({
  generateAiText: vi.fn(async () => ({ ok: true, text: aiMock.text })),
}));

import { evaluateFit } from "@/app/(app)/oportunidades/fit-actions";

const goodJson = JSON.stringify({
  gates: {
    eligibility: { verdict: "PASS", quote: "Remote worldwide" },
    language: { verdict: "FLAG", quote: "Fluent English" },
    location: { verdict: "PASS" },
  },
  scores: {
    technical: { score: 85 },
    experience: { score: 70 },
    culture: { score: 60 },
    career: { score: 80 },
  },
  strengths: ["React"],
  gaps: ["AWS"],
  recommendation: "Postulate.",
});

async function seedProfile(userId = USER_A) {
  await db().setting.createMany({
    data: [
      { userId, key: "jobSkillsStrong", value: "React, TS" },
      { userId, key: "jobExperience", value: "5 años full-stack" },
    ],
  });
}

async function job(userId = USER_A, jobDescription: string | null = "React remoto") {
  return db().opportunity.create({
    data: { userId, title: "Frontend", track: "jobs", jobDescription },
  });
}

describe("evaluateFit", () => {
  it("evalúa, calcula el puntaje en el server y lo guarda", async () => {
    await seedProfile();
    const o = await job();
    aiMock.text = "Acá va:\n```json\n" + goodJson + "\n```";
    const res = await evaluateFit(o.id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // 85*.3 + 70*.25 + 60*.15 + 80*.3 = 25.5 + 17.5 + 9 + 24 = 76
    expect(res.report.overall).toBe(76);
    expect(res.report.verdict).toBe("strong");
    const saved = await db().opportunity.findUnique({ where: { id: o.id } });
    expect(saved?.fitScore).toBe(76);
    expect(saved?.fitVerdict).toBe("strong");
    expect(saved?.fitEvaluatedAt).not.toBeNull();
    expect(JSON.parse(saved!.fitReport!).gates.language.verdict).toBe("FLAG");
  });

  it("pide perfil y descripción antes de gastar IA", async () => {
    const o = await job();
    expect((await evaluateFit(o.id)).ok).toBe(false); // sin perfil
    await seedProfile();
    const empty = await job(USER_A, null);
    expect((await evaluateFit(empty.id)).ok).toBe(false); // sin aviso
  });

  it("no evalúa oportunidades de otro usuario", async () => {
    await seedProfile();
    const o = await job(USER_B);
    aiMock.text = goodJson;
    expect((await evaluateFit(o.id)).ok).toBe(false);
    const other = await db().opportunity.findUnique({ where: { id: o.id } });
    expect(other?.fitScore).toBeNull();
  });

  it("una respuesta ilegible no pisa nada", async () => {
    await seedProfile();
    const o = await job();
    aiMock.text = "no sé, depende";
    expect((await evaluateFit(o.id)).ok).toBe(false);
    const saved = await db().opportunity.findUnique({ where: { id: o.id } });
    expect(saved?.fitVerdict).toBeNull();
  });
});
