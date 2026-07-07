import { describe, it, expect } from "vitest";
import {
  TRACKS,
  AVAILABLE_TRACKS,
  DEFAULT_TRACK,
  isTrack,
  isAvailableTrack,
  getVocab,
  getStages,
  getStage,
  withBusinessName,
  labelFor,
  defaultStageKeyOf,
  tileFor,
  badgeClassFor,
  stageLabel,
  type StageDef,
} from "@/lib/tracks";

describe("isTrack", () => {
  it("acepta los tracks conocidos", () => {
    for (const t of TRACKS) expect(isTrack(t)).toBe(true);
  });

  it("rechaza valores desconocidos y no-strings", () => {
    expect(isTrack("sales")).toBe(false); // retirado
    expect(isTrack("")).toBe(false);
    expect(isTrack(null)).toBe(false);
    expect(isTrack(42)).toBe(false);
    expect(isTrack(undefined)).toBe(false);
  });
});

describe("isAvailableTrack", () => {
  it("solo jobs y freelance están disponibles hoy", () => {
    expect(AVAILABLE_TRACKS).toEqual(["jobs", "freelance"]);
    expect(isAvailableTrack("jobs")).toBe(true);
    expect(isAvailableTrack("freelance")).toBe(true);
  });

  it("un track válido pero no disponible da false", () => {
    expect(isTrack("realestate")).toBe(true);
    expect(isAvailableTrack("realestate")).toBe(false);
  });
});

describe("getVocab", () => {
  it("devuelve el vocab del track pedido", () => {
    expect(getVocab("jobs").name).toBe("Búsqueda laboral");
    expect(getVocab("freelance").name).toBe("Tu negocio");
  });

  it("cae al track por defecto ante un track inválido", () => {
    // @ts-expect-error probamos entrada inválida a propósito
    expect(getVocab("basura").key).toBe(DEFAULT_TRACK);
  });
});

describe("withBusinessName", () => {
  it("reemplaza el nombre solo en freelance cuando hay businessName", () => {
    const v = withBusinessName(getVocab("freelance"), "Estudio Orazi");
    expect(v.name).toBe("Estudio Orazi");
  });

  it("recorta espacios del businessName", () => {
    const v = withBusinessName(getVocab("freelance"), "  Estudio Orazi  ");
    expect(v.name).toBe("Estudio Orazi");
  });

  it("no toca otros tracks", () => {
    const v = withBusinessName(getVocab("jobs"), "Estudio Orazi");
    expect(v.name).toBe("Búsqueda laboral");
  });

  it("deja el nombre por defecto si businessName es vacío o null", () => {
    expect(withBusinessName(getVocab("freelance"), "").name).toBe("Tu negocio");
    expect(withBusinessName(getVocab("freelance"), "   ").name).toBe("Tu negocio");
    expect(withBusinessName(getVocab("freelance"), null).name).toBe("Tu negocio");
  });
});

describe("coherencia de los presets de etapas", () => {
  for (const track of TRACKS) {
    describe(track, () => {
      const stages = getStages(track);

      it("tiene al menos una etapa", () => {
        expect(stages.length).toBeGreaterThan(0);
      });

      it("no tiene keys duplicadas", () => {
        const keys = stages.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it("todas las probabilidades están entre 0 y 100", () => {
        for (const s of stages) {
          expect(s.probability).toBeGreaterThanOrEqual(0);
          expect(s.probability).toBeLessThanOrEqual(100);
        }
      });

      it("todas las etapas tienen un type válido", () => {
        for (const s of stages) {
          expect(["open", "won", "lost"]).toContain(s.type);
        }
      });

      it("tiene una etapa de cierre ganador (won)", () => {
        expect(stages.some((s) => s.type === "won")).toBe(true);
      });

      it("todas tienen key y label no vacíos", () => {
        for (const s of stages) {
          expect(s.key.trim()).not.toBe("");
          expect(s.label.trim()).not.toBe("");
        }
      });
    });
  }
});

describe("getStage / stageLabel", () => {
  it("encuentra una etapa por key", () => {
    expect(getStage("jobs", "APPLIED")?.label).toBe("Aplicada");
  });

  it("devuelve undefined para una key inexistente", () => {
    expect(getStage("jobs", "NOPE")).toBeUndefined();
  });

  it("stageLabel cae a la key cruda si no la encuentra", () => {
    expect(stageLabel("jobs", "DESCONOCIDA")).toBe("DESCONOCIDA");
  });
});

describe("helpers puros sobre un array de etapas", () => {
  const stages: StageDef[] = [
    { key: "A", label: "Alpha", type: "open", probability: 10 },
    { key: "B", label: "Beta", type: "won", probability: 100 },
  ];

  it("labelFor devuelve el label o la key de fallback", () => {
    expect(labelFor(stages, "A")).toBe("Alpha");
    expect(labelFor(stages, "Z")).toBe("Z");
  });

  it("defaultStageKeyOf devuelve la primera etapa", () => {
    expect(defaultStageKeyOf(stages)).toBe("A");
  });

  it("defaultStageKeyOf cae a SAVED con array vacío", () => {
    expect(defaultStageKeyOf([])).toBe("SAVED");
  });

  it("tileFor de una key desconocida usa el primer tile (índice 0)", () => {
    // findIndex devuelve -1 → Math.max(0,-1)=0
    expect(tileFor(stages, "Z")).toEqual(tileFor(stages, "A"));
  });

  it("badgeClassFor usa el badge de ganado para type won", () => {
    expect(badgeClassFor(stages, "B")).toContain("emerald");
  });
});
