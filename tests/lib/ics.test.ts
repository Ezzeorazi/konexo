import { describe, it, expect } from "vitest";
import { buildCalendar, type IcsEvent } from "@/lib/ics";

function lines(ics: string): string[] {
  return ics.split("\r\n");
}

describe("buildCalendar", () => {
  it("emite un calendario válido y vacío con solo el envoltorio", () => {
    const out = buildCalendar([], "Mi calendario");
    const ls = lines(out);
    expect(ls[0]).toBe("BEGIN:VCALENDAR");
    expect(ls).toContain("VERSION:2.0");
    expect(ls).toContain("PRODID:-//Konexo//CRM Follow-ups//ES");
    expect(ls).toContain("X-WR-CALNAME:Mi calendario");
    expect(ls).toContain("END:VCALENDAR");
    // No hay eventos.
    expect(ls).not.toContain("BEGIN:VEVENT");
  });

  it("usa saltos de línea CRLF y termina con CRLF", () => {
    const out = buildCalendar([], "x");
    expect(out).toMatch(/\r\n/);
    expect(out.endsWith("\r\n")).toBe(true);
  });

  it("un follow-up a medianoche UTC es un evento de día completo con alarma a 9am", () => {
    const ev: IcsEvent = {
      uid: "opp-1@konexo",
      date: new Date("2026-07-15T00:00:00Z"),
      summary: "Follow-up: Acme",
    };
    const ls = lines(buildCalendar([ev], "cal"));
    expect(ls).toContain("BEGIN:VEVENT");
    expect(ls).toContain("UID:opp-1@konexo");
    expect(ls).toContain("DTSTART;VALUE=DATE:20260715");
    expect(ls).toContain("DTEND;VALUE=DATE:20260716"); // día siguiente
    expect(ls).toContain("TRIGGER;RELATED=START:PT9H");
    expect(ls).toContain("SUMMARY:Follow-up: Acme");
  });

  it("un follow-up con hora es un evento con horario y alarma al inicio", () => {
    const ev: IcsEvent = {
      uid: "c-1@konexo",
      date: new Date("2026-07-15T14:30:00Z"),
      summary: "Contactar a Ana",
    };
    const ls = lines(buildCalendar([ev], "cal"));
    expect(ls).toContain("DTSTART:20260715T143000");
    expect(ls).toContain("DTEND:20260715T153000"); // +1 hora
    expect(ls).toContain("TRIGGER;RELATED=START:PT0S");
  });

  it("incluye DESCRIPTION y URL solo cuando existen", () => {
    const withExtras: IcsEvent = {
      uid: "u1",
      date: new Date("2026-07-15T00:00:00Z"),
      summary: "s",
      description: "detalle",
      url: "https://konexo.site/oportunidades/1",
    };
    const ls = lines(buildCalendar([withExtras], "cal"));
    expect(ls).toContain("DESCRIPTION:detalle");
    expect(ls).toContain("URL:https://konexo.site/oportunidades/1");

    const minimal: IcsEvent = {
      uid: "u2",
      date: new Date("2026-07-15T00:00:00Z"),
      summary: "s",
    };
    const ls2 = lines(buildCalendar([minimal], "cal"));
    expect(ls2.some((l) => l.startsWith("URL:"))).toBe(false);
  });

  it("escapa comas, punto y coma, backslash y saltos de línea en el texto", () => {
    const ev: IcsEvent = {
      uid: "u1",
      date: new Date("2026-07-15T00:00:00Z"),
      summary: "a, b; c\\d\ne",
    };
    const out = buildCalendar([ev], "cal");
    expect(out).toContain("SUMMARY:a\\, b\\; c\\\\d\\ne");
  });

  it("pliega las líneas que superan los 75 caracteres con continuación", () => {
    const ev: IcsEvent = {
      uid: "u1",
      date: new Date("2026-07-15T00:00:00Z"),
      summary: "X".repeat(200),
    };
    const ls = lines(buildCalendar([ev], "cal"));
    // Debe existir al menos una línea de continuación (empieza con espacio).
    expect(ls.some((l) => l.startsWith(" "))).toBe(true);
    // Ninguna línea física supera los 75 caracteres.
    for (const l of ls) expect(l.length).toBeLessThanOrEqual(75);
  });

  it("emite varios eventos en un mismo calendario", () => {
    const evs: IcsEvent[] = [
      { uid: "a", date: new Date("2026-07-15T00:00:00Z"), summary: "A" },
      { uid: "b", date: new Date("2026-07-16T00:00:00Z"), summary: "B" },
    ];
    const out = buildCalendar(evs, "cal");
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out.match(/END:VEVENT/g)).toHaveLength(2);
  });
});
