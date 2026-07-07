import { describe, it, expect } from "vitest";
import { db, setUser, USER_A, USER_B } from "./ctx";
import {
  createProjectTask,
  toggleProjectTask,
  reorderProjectTasks,
} from "@/app/(app)/oportunidades/project-actions";
import { createOpportunity } from "@/app/(app)/oportunidades/actions";

async function makeOwnOpp(): Promise<string> {
  const res = await createOpportunity({
    title: "Proyecto propio",
    stage: "FL_LEAD",
    priority: "MEDIUM",
    track: "freelance",
    kind: "own",
  });
  return (res as { id: string }).id;
}

describe("createProjectTask", () => {
  it("crea tareas con order incremental sobre una oportunidad propia", async () => {
    setUser(USER_A);
    const oppId = await makeOwnOpp();
    await createProjectTask({ opportunityId: oppId, title: "Hito 1" });
    await createProjectTask({ opportunityId: oppId, title: "Hito 2" });
    const tasks = await db().projectTask.findMany({ where: { opportunityId: oppId }, orderBy: { order: "asc" } });
    expect(tasks.map((t) => t.order)).toEqual([0, 1]);
  });

  it("rechaza colgar una tarea de una oportunidad ajena", async () => {
    setUser(USER_B);
    const oppId = await makeOwnOpp();
    setUser(USER_A);
    const res = await createProjectTask({ opportunityId: oppId, title: "intruso" });
    expect(res.ok).toBe(false);
    expect(await db().projectTask.count()).toBe(0);
  });
});

describe("toggleProjectTask · completedAt", () => {
  it("setea completedAt al tildar y lo limpia al destildar", async () => {
    setUser(USER_A);
    const oppId = await makeOwnOpp();
    await createProjectTask({ opportunityId: oppId, title: "Hito" });
    const task = await db().projectTask.findFirst();

    await toggleProjectTask(task!.id, oppId, true);
    let after = await db().projectTask.findUnique({ where: { id: task!.id } });
    expect(after?.done).toBe(true);
    expect(after?.completedAt).not.toBeNull();

    await toggleProjectTask(task!.id, oppId, false);
    after = await db().projectTask.findUnique({ where: { id: task!.id } });
    expect(after?.done).toBe(false);
    expect(after?.completedAt).toBeNull();
  });
});

describe("reorderProjectTasks", () => {
  it("reasigna el order según el arreglo de ids", async () => {
    setUser(USER_A);
    const oppId = await makeOwnOpp();
    await createProjectTask({ opportunityId: oppId, title: "A" });
    await createProjectTask({ opportunityId: oppId, title: "B" });
    await createProjectTask({ opportunityId: oppId, title: "C" });
    const tasks = await db().projectTask.findMany({ where: { opportunityId: oppId }, orderBy: { order: "asc" } });
    const reversed = [...tasks].reverse().map((t) => t.id);

    await reorderProjectTasks(oppId, reversed);

    const after = await db().projectTask.findMany({ where: { opportunityId: oppId }, orderBy: { order: "asc" } });
    expect(after.map((t) => t.title)).toEqual(["C", "B", "A"]);
  });
});
