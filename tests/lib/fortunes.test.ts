import { describe, it, expect } from "vitest";
import {
  fortuneDayKey,
  isFortuneKey,
  phaseOf,
  pickDailyFortune,
  pickFortune,
  type FortuneOpp,
} from "@/lib/fortunes";

const NOW = new Date("2026-10-16T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function opp(over: Partial<FortuneOpp> = {}): FortuneOpp {
  return {
    id: "o1",
    title: "Frontend Dev",
    companyName: "Acme",
    stage: "SAVED",
    stageType: "open",
    createdAt: daysAgo(1),
    appliedAt: null,
    nextFollowUpAt: null,
    hasDescription: true,
    hasCv: true,
    hasContact: true,
    won: [],
    ...over,
  };
}

describe("phaseOf", () => {
  it("mapea las etapas por defecto y cae en open para las custom", () => {
    expect(phaseOf("SAVED", "open")).toBe("saved");
    expect(phaseOf("APPLIED", "open")).toBe("applied");
    expect(phaseOf("INTERVIEW", "open")).toBe("interview");
    expect(phaseOf("TECH_TEST", "open")).toBe("open");
    expect(phaseOf("OFFER", "won")).toBe("offer");
    expect(phaseOf("CLOSED", "lost")).toBe("closed");
  });
});

describe("pickFortune", () => {
  it("una guardada arranca por los filtros de idioma/permiso", () => {
    expect(pickFortune(opp(), NOW)?.key).toBe("saved-gates");
  });

  it("cada victoria desbloquea la siguiente galleta de la cadena", () => {
    const won: string[] = [];
    const seen: string[] = [];
    let f = pickFortune(opp({ won }), NOW);
    while (f) {
      seen.push(f.key);
      won.push(f.key);
      f = pickFortune(opp({ won }), NOW);
    }
    // Con contacto, CV y descripción: no salen las de aliado/armadura/aviso.
    expect(seen).toEqual(["saved-gates", "saved-call", "saved-launch"]);
  });

  it("sin descripción ni contacto pide el aviso y un aliado", () => {
    const o = opp({ hasDescription: false, hasContact: false, won: ["saved-gates"] });
    expect(pickFortune(o, NOW)?.key).toBe("saved-description");
    expect(pickFortune({ ...o, won: [...o.won, "saved-description"] }, NOW)?.key).toBe(
      "saved-ally"
    );
  });

  it("interpola la empresa en la misión y arma el link de acción", () => {
    const f = pickFortune(
      opp({ hasContact: false, won: ["saved-gates"] }),
      NOW
    );
    expect(f?.mission).toContain("Acme");
    expect(f?.action?.href).toBe("/contactos");
  });

  it("aplicada sin follow-up agendado: primero el radar", () => {
    const f = pickFortune(
      opp({ stage: "APPLIED", appliedAt: daysAgo(3) }),
      NOW
    );
    expect(f?.key).toBe("applied-radar");
    expect(f?.action?.href).toBe("/oportunidades/o1");
  });

  it("aplicada hace menos de 14 días: esperar; 14+ días: follow-up", () => {
    const base = { stage: "APPLIED", nextFollowUpAt: daysAgo(-5) };
    expect(pickFortune(opp({ ...base, appliedAt: daysAgo(5) }), NOW)?.key).toBe(
      "applied-wait"
    );
    expect(pickFortune(opp({ ...base, appliedAt: daysAgo(15) }), NOW)?.key).toBe(
      "applied-followup"
    );
  });

  it("una guardada de más de dos semanas se enfría", () => {
    const f = pickFortune(
      opp({ createdAt: daysAgo(20), won: ["saved-gates", "saved-call"] }),
      NOW
    );
    expect(f?.key).toBe("saved-attack");
  });

  it("entrevista arranca por las historias STAR", () => {
    expect(pickFortune(opp({ stage: "INTERVIEW" }), NOW)?.key).toBe(
      "interview-star"
    );
  });

  it("oferta y cerrada tienen sus galletas; sin pendientes devuelve null", () => {
    expect(pickFortune(opp({ stage: "OFFER", stageType: "won" }), NOW)?.key).toBe(
      "offer-negotiate"
    );
    const closed = opp({ stage: "CLOSED", stageType: "lost" });
    expect(pickFortune(closed, NOW)?.key).toBe("closed-lesson");
    expect(
      pickFortune({ ...closed, won: ["closed-lesson", "closed-door"] }, NOW)
    ).toBeNull();
  });
});

describe("pickDailyFortune", () => {
  it("elige la galleta más urgente de todo el pipeline", () => {
    const saved = opp({ id: "a" }); // saved-gates (40)
    const interview = opp({ id: "b", stage: "INTERVIEW" }); // interview-star (80)
    const f = pickDailyFortune([saved, interview], NOW, "2026-10-16");
    expect(f?.key).toBe("interview-star");
    expect(f?.opportunityId).toBe("b");
  });

  it("es determinística dentro del día", () => {
    const opps = [opp({ id: "a" }), opp({ id: "b" }), opp({ id: "c" })];
    const a = pickDailyFortune(opps, NOW, "2026-10-16");
    const b = pickDailyFortune([...opps].reverse(), NOW, "2026-10-16");
    expect(a?.opportunityId).toBe(b?.opportunityId);
  });

  it("sin oportunidades no hay galleta", () => {
    expect(pickDailyFortune([], NOW, "2026-10-16")).toBeNull();
  });
});

describe("helpers", () => {
  it("valida claves del catálogo", () => {
    expect(isFortuneKey("saved-gates")).toBe(true);
    expect(isFortuneKey("inventada")).toBe(false);
  });

  it("la clave de día usa hora de Argentina", () => {
    // 01:00 UTC del 17 = 22:00 del 16 en Buenos Aires.
    expect(fortuneDayKey(new Date("2026-10-17T01:00:00Z"))).toBe("2026-10-16");
  });
});
