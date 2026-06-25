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
import {
  Check,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProjectNote,
  createProjectTask,
  deleteProjectNote,
  deleteProjectTask,
  reorderProjectTasks,
  toggleProjectTask,
  updateProjectNote,
} from "@/app/(app)/oportunidades/project-actions";
import {
  PROJECT_NOTE_KINDS,
  projectNoteKindLabels,
  type ProjectNoteKind,
} from "@/lib/labels";
import { formatRelative, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type ProjectTask = {
  id: string;
  title: string;
  done: boolean;
};

export type ProjectNote = {
  id: string;
  kind: string;
  body: string;
  createdAt: Date;
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
  notes,
}: {
  opportunityId: string;
  tasks: ProjectTask[];
  notes: ProjectNote[];
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
  const [noteKind, setNoteKind] = useState<ProjectNoteKind>("avance");
  const [noteBody, setNoteBody] = useState("");
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

  function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = noteBody.trim();
    if (!body) return;
    setNoteBody("");
    run(() => createProjectNote({ opportunityId, kind: noteKind, body }));
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Checklist de tareas / hitos */}
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
                  <span className="flex-1 text-sm text-muted-foreground line-through">
                    {task.title}
                  </span>
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

      {/* Bitácora: ideas + avances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Bitácora
          </CardTitle>
          <CardDescription>
            Ideas y avances del proyecto, en orden cronológico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addNote} className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={noteKind}
                onValueChange={(v) => setNoteKind(v as ProjectNoteKind)}
                items={PROJECT_NOTE_KINDS.map((k) => ({
                  value: k,
                  label: projectNoteKindLabels[k],
                }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_NOTE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {projectNoteKindLabels[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                disabled={pending || !noteBody.trim()}
              >
                <Plus className="size-4" />
                Anotar
              </Button>
            </div>
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={2}
              maxLength={20000}
              placeholder="¿Qué se te ocurrió o qué avanzaste?"
            />
          </form>

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay entradas en la bitácora.
            </p>
          ) : (
            <ol className="relative space-y-5 border-l pl-6">
              {notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  disabled={pending}
                  onSave={(kind, body) =>
                    run(() =>
                      updateProjectNote(note.id, opportunityId, { kind, body })
                    )
                  }
                  onDelete={() =>
                    run(() => deleteProjectNote(note.id, opportunityId))
                  }
                />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
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
}: {
  task: ProjectTask;
  disabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
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
      <span className="flex-1 text-sm">{task.title}</span>
      <DeleteButton
        disabled={disabled}
        onClick={onDelete}
        label="Eliminar tarea"
      />
    </li>
  );
}

function NoteRow({
  note,
  disabled,
  onSave,
  onDelete,
}: {
  note: ProjectNote;
  disabled: boolean;
  onSave: (kind: ProjectNoteKind, body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<ProjectNoteKind>(
    (note.kind as ProjectNoteKind) === "idea" ? "idea" : "avance"
  );
  const [body, setBody] = useState(note.body);

  function save() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSave(kind, trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="relative">
        <span className="absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full bg-primary" />
        <div className="space-y-2">
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as ProjectNoteKind)}
            items={PROJECT_NOTE_KINDS.map((k) => ({
              value: k,
              label: projectNoteKindLabels[k],
            }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_NOTE_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {projectNoteKindLabels[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={20000}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={disabled || !body.trim()}
            >
              <Check className="size-4" />
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setKind(
                  (note.kind as ProjectNoteKind) === "idea" ? "idea" : "avance"
                );
                setBody(note.body);
              }}
            >
              <X className="size-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="relative">
      <span className="absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full bg-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {projectNoteKindLabels[note.kind as ProjectNoteKind] ?? note.kind}
        </Badge>
        <span
          className="text-xs text-muted-foreground"
          title={formatDate(note.createdAt)}
        >
          {formatRelative(note.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            aria-label="Editar entrada"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <DeleteButton
            disabled={disabled}
            onClick={onDelete}
            label="Eliminar entrada"
          />
        </div>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm">{note.body}</p>
    </li>
  );
}
