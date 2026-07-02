"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StrengthBadge, TrackBadge } from "@/components/badges";
import { RowLink } from "@/components/clickable";
import { formatDateTime } from "@/lib/dates";
import { getVocab, isTrack, TRACKS, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import type { RelationshipStrength } from "@/lib/generated/prisma/client";

export type ContactRow = {
  id: string;
  name: string;
  role: string | null;
  companyName: string | null;
  strength: RelationshipStrength;
  nextFollowUpAt: Date | null;
  track: string;
};

// Directorio de contactos COMPARTIDO entre modos: se ven todos, con un badge
// del modo al que pertenece cada uno, y chips para filtrar por modo.
export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  const [filter, setFilter] = useState<Track | "all">("all");

  // Modos presentes en los datos, en el orden canónico de TRACKS.
  const present = useMemo(() => {
    const set = new Set(contacts.map((c) => c.track).filter(isTrack));
    return TRACKS.filter((t) => set.has(t));
  }, [contacts]);

  const shown =
    filter === "all"
      ? contacts
      : contacts.filter((c) => c.track === filter);

  return (
    <div className="space-y-4">
      {present.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Chip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`Todos (${contacts.length})`}
          />
          {present.map((t) => {
            const v = getVocab(t);
            const count = contacts.filter((c) => c.track === t).length;
            return (
              <Chip
                key={t}
                active={filter === t}
                onClick={() => setFilter(t)}
                label={`${v.emoji} ${v.name} (${count})`}
              />
            );
          })}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border-[3px] border-ink bg-panelw shadow-[5px_5px_0_var(--color-ink)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Rol</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Relación</TableHead>
              <TableHead className="hidden md:table-cell">
                Próximo follow-up
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((contact) => (
              <RowLink key={contact.id} href={`/contactos/${contact.id}`}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {contact.role ?? "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {contact.companyName ?? "—"}
                </TableCell>
                <TableCell>
                  {isTrack(contact.track) ? (
                    <TrackBadge track={contact.track} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <StrengthBadge strength={contact.strength} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {contact.nextFollowUpAt
                    ? formatDateTime(contact.nextFollowUpAt)
                    : "—"}
                </TableCell>
              </RowLink>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border-2 border-ink px-3 py-1 font-display text-xs tracking-wide transition-colors",
        active
          ? "bg-komic text-ink shadow-[2px_2px_0_var(--color-ink)]"
          : "bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
