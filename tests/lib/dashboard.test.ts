import { describe, it, expect } from "vitest";
import { computeForecast } from "@/lib/dashboard";
import type { StageDef } from "@/lib/tracks";

const stages: StageDef[] = [
  { key: "OPEN", label: "Abierta", type: "open", probability: 50 },
  { key: "LATE", label: "Avanzada", type: "open", probability: 80 },
  { key: "WON", label: "Ganada", type: "won", probability: 100 },
  { key: "LOST", label: "Perdida", type: "lost", probability: 0 },
];

describe("computeForecast", () => {
  it("suma pipeline y ponderado sobre etapas abiertas", () => {
    const f = computeForecast(stages, [
      { value: 1000, stage: "OPEN" }, // pipeline +1000, ponderado +500
      { value: 2000, stage: "LATE" }, // pipeline +2000, ponderado +1600
    ]);
    expect(f.pipelineValue).toBe(3000);
    expect(f.weightedValue).toBe(2100);
    expect(f.wonValue).toBe(0);
  });

  it("acumula lo ganado aparte y no lo mete en el pipeline", () => {
    const f = computeForecast(stages, [{ value: 5000, stage: "WON" }]);
    expect(f.wonValue).toBe(5000);
    expect(f.pipelineValue).toBe(0);
    expect(f.weightedValue).toBe(0);
  });

  it("ignora por completo las etapas perdidas", () => {
    const f = computeForecast(stages, [{ value: 9000, stage: "LOST" }]);
    expect(f).toEqual({ pipelineValue: 0, weightedValue: 0, wonValue: 0 });
  });

  it("trata un value null como 0", () => {
    const f = computeForecast(stages, [{ value: null, stage: "OPEN" }]);
    expect(f).toEqual({ pipelineValue: 0, weightedValue: 0, wonValue: 0 });
  });

  it("una etapa desconocida cuenta como abierta con probabilidad 0", () => {
    const f = computeForecast(stages, [{ value: 1000, stage: "FANTASMA" }]);
    expect(f.pipelineValue).toBe(1000);
    expect(f.weightedValue).toBe(0);
    expect(f.wonValue).toBe(0);
  });

  it("devuelve todo en cero sin oportunidades", () => {
    expect(computeForecast(stages, [])).toEqual({
      pipelineValue: 0,
      weightedValue: 0,
      wonValue: 0,
    });
  });

  it("combina abiertas, ganadas y perdidas en un mismo cálculo", () => {
    const f = computeForecast(stages, [
      { value: 1000, stage: "OPEN" }, // p+1000, w+500
      { value: 4000, stage: "WON" }, // won+4000
      { value: 7000, stage: "LOST" }, // ignorada
    ]);
    expect(f).toEqual({ pipelineValue: 1000, weightedValue: 500, wonValue: 4000 });
  });
});
