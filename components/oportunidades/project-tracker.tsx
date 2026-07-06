"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Check, GripVertical, ListChecks, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createProjectTask,
  deleteProjectTask,
  reorderProjectTasks,
  toggleProjectTask,
  updateProjectTask,
} from "@/app/(app)/oportunidades/project-actions";
import { EditableText } from "@/components/editable/editable-text";
import type { SaveResult } from "@/components/editable/types";
import { cn } from "@/lib/utils";

// Ejecución del proyecto: checklist de tareas/hitos. La BITÁCORA (ideas/avances)
// se fusionó en el stream de Actividad (Fase 3): esas entradas se cargan y se
// ven en el timeline de Actividad del detalle, ya no en un panel aparte.

export type ProjectTask = {
  id: string;
  title: string;
  done: boolean;
};

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function ProjectTracker({
  opportunityId,
  tasks,
}: {
  opportunityId: string;
  tasks: ProjectTask[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Estado local de tareas para optimismo (drag, toggle, borrado). Se
  // re-sincroniza cuando llegan datos frescos del server (patrón "adjusting
  // state during render", igual que el kanban).
  const [taskList, setTaskList] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setTaskList(tasks);
  }

  const [newTask, setNewTask] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const pendingTasks = taskList.filter((t) => !t.done);
  const doneTasks = taskList.filter((t) => t.done);
  const doneCount = doneTasks.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error ?? "Algo salió mal.");
      }
    });
  }

  function toggleTask(task: ProjectTask) {
    setTaskList((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    );
    run(() => toggleProjectTask(task.id, opportunityId, !task.done));
  }

  function removeTask(id: string) {
    setTaskList((prev) => prev.filter((t) => t.id !== id));
    run(() => deleteProjectTask(id, opportunityId));
  }

  function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setNewTask("");
    run(() => createProjectTask({ opportunityId, title }));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = pendingTasks.map((t) => t.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    const previous = taskList;
    const newPending = arrayMove(pendingTasks, from, to);
    setTaskList([...newPending, ...doneTasks]);
    reorderProjectTasks(
      opportunityId,
      newPending.map((t) => t.id)
    )
      .then(() => router.refresh())
      .catch(() => {
        setTaskList(previous);
        toast.error("No se pudo reordenar.");
      });
  }

  const activeTask = activeId
    ? taskList.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" />
          Tareas del proyecto
        </CardTitle>
        <CardDescription>
          {taskList.length === 0
            ? "Anotá los hitos y entregables del proyecto."
            : `${doneCount} de ${taskList.length} completadas. Arrastrá para reordenar.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
        >
          <ul className="space-y-1">
            {pendingTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                disabled={pending}
                onToggle={() => toggleTask(task)}
                onDelete={() => removeTask(task.id)}
                onRename={(title) =>
                  updateProjectTask(task.id, opportunityId, title)
                }
              />
            ))}
          </ul>
          <DragOverlay>
            {activeTask ? (
              <div className="flex items-center gap-2 rounded border-2 border-ink bg-background px-2 py-1.5 text-sm shadow-[3px_3px_0_var(--color-ink)]">
                <GripVertical className="size-4 text-muted-foreground" />
                {activeTask.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {doneTasks.length > 0 ? (
          <ul className="space-y-1 border-t pt-3">
            {doneTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 px-1">
                <CheckboxButton
                  done
                  disabled={pending}
                  onClick={() => toggleTask(task)}
                />
                <div className="flex-1">
                  <EditableText
                    value={task.title}
                    onSave={(title) =>
                      updateProjectTask(task.id, opportunityId, title)
                    }
                    required
                    ariaLabel="Editar tarea"
                    className="text-sm text-muted-foreground line-through"
                  />
                </div>
                <DeleteButton
                  disabled={pending}
                  onClick={() => removeTask(task.id)}
                  label="Eliminar tarea"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <form onSubmit={addTask} className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nueva tarea o hito..."
            maxLength={300}
          />
          <Button type="submit" size="sm" disabled={pending || !newTask.trim()}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CheckboxButton({
  done,
  disabled,
  onClick,
}: {
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={done ? "Marcar pendiente" : "Marcar hecha"}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded border-2 border-ink transition-colors",
        done ? "bg-hero text-paper" : "bg-paper"
      )}
    >
      {done ? <Check className="size-3.5" /> : null}
    </button>
  );
}

function DeleteButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="text-muted-foreground transition-colors hover:text-alarm"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

function TaskRow({
  task,
  disabled,
  onToggle,
  onDelete,
  onRename,
}: {
  task: ProjectTask;
  disabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<SaveResult>;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.id });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: task.id });

  return (
    <li
      ref={setDropRef}
      className={cn(
        "flex items-center gap-2 rounded px-1 py-0.5 transition-colors",
        isOver && "bg-komic/40",
        isDragging && "opacity-40"
      )}
    >
      <button
        ref={setDragRef}
        {...listeners}
        {...attributes}
        type="button"
        aria-label="Reordenar tarea"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-4" />
      </button>
      <CheckboxButton done={false} disabled={disabled} onClick={onToggle} />
      <div className="flex-1">
        <EditableText
          value={task.title}
          onSave={onRename}
          required
          ariaLabel="Editar tarea"
          className="text-sm"
        />
      </div>
      <DeleteButton
        disabled={disabled}
        onClick={onDelete}
        label="Eliminar tarea"
      />
    </li>
  );
}
