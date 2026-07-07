import { describe, it, expect } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import { getTrackStages, getTrackStagesFull } from "@/lib/stages";
import { getStages } from "@/lib/tracks";

describe("getTrackStages · auto-seed", () => {
  it("la primera lectura siembra los presets del track en la DB", async () => {
    setUser(USER_A);
    const presets = getStages("jobs");
    const stages = await getTrackStages("jobs");

    expect(stages.map((s) => s.key)).toEqual(presets.map((s) => s.key));
    // Quedaron persistidas.
    expect(await db().pipelineStage.count({ where: { userId: USER_A, track: "jobs" } })).toBe(
      presets.length
    );
  });

  it("una segunda lectura no vuelve a sembrar (no duplica)", async () => {
    setUser(USER_A);
    await getTrackStages("jobs");
    await getTrackStages("jobs");
    expect(await db().pipelineStage.count({ where: { userId: USER_A, track: "jobs" } })).toBe(
      getStages("jobs").length
    );
  });

  it("lecturas concurrentes no duplican etapas (carrera del seed)", async () => {
    setUser(USER_A);
    await Promise.all([
      getTrackStages("jobs"),
      getTrackStages("jobs"),
      getTrackStages("jobs"),
    ]);
    expect(await db().pipelineStage.count({ where: { userId: USER_A, track: "jobs" } })).toBe(
      getStages("jobs").length
    );
  });

  it("cada usuario tiene su propio set de etapas", async () => {
    setUser(USER_A);
    await getTrackStages("jobs");
    setUser(USER_B);
    await getTrackStages("jobs");
    expect(await db().pipelineStage.count({ where: { userId: USER_A } })).toBe(getStages("jobs").length);
    expect(await db().pipelineStage.count({ where: { userId: USER_B } })).toBe(getStages("jobs").length);
  });

  it("distintos tracks siembran sets distintos para el mismo usuario", async () => {
    setUser(USER_A);
    await getTrackStages("jobs");
    await getTrackStages("freelance");
    expect(await db().pipelineStage.count({ where: { userId: USER_A, track: "jobs" } })).toBe(getStages("jobs").length);
    expect(await db().pipelineStage.count({ where: { userId: USER_A, track: "freelance" } })).toBe(getStages("freelance").length);
  });

  it("getTrackStagesFull devuelve filas con id (para el editor)", async () => {
    setUser(USER_A);
    const rows = await getTrackStagesFull("jobs");
    expect(rows.length).toBe(getStages("jobs").length);
    expect(rows[0].id).toBeTruthy();
    expect(rows[0].order).toBe(0);
  });
});
