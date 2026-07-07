import { describe, it, expect } from "vitest";
import { db, USER_A, USER_B } from "./ctx";
import { consumeAiQuota, AI_DAILY_LIMIT } from "@/lib/ai-usage";

// El rate limit protege la cuota compartida de Groq (key del dueño). El tope se
// baja a 5 por env en vitest.integration.config.ts.

describe("consumeAiQuota", () => {
  it("el tope de test es 5 (env AI_DAILY_LIMIT)", () => {
    expect(AI_DAILY_LIMIT).toBe(5);
  });

  it("permite exactamente LIMIT llamadas y rechaza la siguiente", async () => {
    for (let i = 1; i <= AI_DAILY_LIMIT; i++) {
      const r = await consumeAiQuota(USER_A);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(AI_DAILY_LIMIT - i);
    }
    const over = await consumeAiQuota(USER_A);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toMatch(/Límite diario/);
  });

  it("bajo concurrencia nunca deja pasar más de LIMIT (incremento atómico)", async () => {
    const results = await Promise.all(
      Array.from({ length: AI_DAILY_LIMIT * 3 }, () => consumeAiQuota(USER_A))
    );
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(AI_DAILY_LIMIT);
    // El contador quedó en total de intentos (cada uno incrementó).
    const row = await db().aiUsage.findFirst({ where: { userId: USER_A } });
    expect(row?.count).toBe(AI_DAILY_LIMIT * 3);
  });

  it("la cuota es por usuario: la de A no afecta a B", async () => {
    for (let i = 0; i < AI_DAILY_LIMIT; i++) await consumeAiQuota(USER_A);
    const bFirst = await consumeAiQuota(USER_B);
    expect(bFirst.ok).toBe(true);
  });
});
