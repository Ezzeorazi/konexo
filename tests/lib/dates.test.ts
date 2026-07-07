import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatOverdue,
  toDateInputValue,
  toDateTimeInputValue,
  parseDateInput,
  parseDateTimeInput,
} from "@/lib/dates";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatDate", () => {
  it("formatea en español abreviado", () => {
    // Constructor local: 15 de julio de 2026.
    expect(formatDate(new Date(2026, 6, 15))).toBe("15 jul 2026");
  });
});

describe("formatDateTime", () => {
  it("muestra solo la fecha si la hora es medianoche exacta", () => {
    expect(formatDateTime(new Date(2026, 6, 15, 0, 0, 0))).toBe("15 jul 2026");
  });

  it("incluye la hora cuando no es medianoche", () => {
    expect(formatDateTime(new Date(2026, 6, 15, 14, 30))).toBe(
      "15 jul 2026, 14:30"
    );
  });
});

describe("formatRelative / formatOverdue", () => {
  it("una fecha futura usa el sufijo 'en'", () => {
    vi.setSystemTime(new Date(2026, 6, 1, 12, 0, 0));
    const inThreeDays = new Date(2026, 6, 4, 12, 0, 0);
    expect(formatRelative(inThreeDays)).toBe("en 3 días");
  });

  it("una fecha pasada usa el sufijo 'hace'", () => {
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0));
    const threeDaysAgo = new Date(2026, 6, 7, 12, 0, 0);
    expect(formatRelative(threeDaysAgo)).toBe("hace 3 días");
  });

  it("formatOverdue antepone 'vencido' a la distancia relativa", () => {
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0));
    const twoDaysAgo = new Date(2026, 6, 8, 12, 0, 0);
    expect(formatOverdue(twoDaysAgo)).toBe("vencido hace 2 días");
  });
});

describe("toDateInputValue / toDateTimeInputValue", () => {
  it("serializa una fecha a yyyy-MM-dd", () => {
    expect(toDateInputValue(new Date(2026, 6, 15))).toBe("2026-07-15");
  });

  it("serializa fecha+hora a yyyy-MM-ddTHH:mm", () => {
    expect(toDateTimeInputValue(new Date(2026, 6, 15, 9, 5))).toBe(
      "2026-07-15T09:05"
    );
  });

  it("devuelve string vacío para null/undefined", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateTimeInputValue(null)).toBe("");
  });
});

describe("parseDateInput", () => {
  it("interpreta yyyy-MM-dd en horario local a medianoche", () => {
    const d = parseDateInput("2026-07-15")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // julio (0-indexed)
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it("devuelve null para vacío/null/undefined", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput(undefined)).toBeNull();
  });
});

describe("parseDateTimeInput", () => {
  it("asume las 09:00 cuando viene solo la fecha", () => {
    const d = parseDateTimeInput("2026-07-15")!;
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it("respeta la hora cuando viene fecha+hora", () => {
    const d = parseDateTimeInput("2026-07-15T14:30")!;
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("devuelve null para vacío/null/undefined", () => {
    expect(parseDateTimeInput("")).toBeNull();
    expect(parseDateTimeInput(null)).toBeNull();
    expect(parseDateTimeInput(undefined)).toBeNull();
  });

  it("devuelve null para una fecha inválida", () => {
    expect(parseDateTimeInput("no-es-fecha")).toBeNull();
    expect(parseDateTimeInput("2026-13-45")).toBeNull();
  });
});
