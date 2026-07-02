// Generador de iCalendar (RFC 5545) para el feed de follow-ups de Konexo.
//
// A partir de los nextFollowUpAt de oportunidades y contactos emitimos:
//  - un evento de DÍA COMPLETO (VALUE=DATE) con alarma a las 9am, cuando el
//    follow-up no tiene hora (medianoche), o
//  - un evento CON HORARIO (hora de pared flotante) y alarma al inicio, cuando
//    el usuario eligió una hora.
// Sin dependencias: el formato es texto plano con líneas CRLF.
//
// Nota de compatibilidad: Apple Calendar / Outlook / Thunderbird respetan la
// VALARM de un feed suscripto y notifican. Google Calendar muestra los eventos
// pero NO dispara notificaciones de calendarios suscriptos por URL (limitación
// conocida de Google). Para alertas en Android vía Google haría falta la API de
// Google Calendar (fase posterior). La UI lo aclara.

export type IcsEvent = {
  /** Identificador estable: mismo UID = mismo evento (se actualiza, no duplica). */
  uid: string;
  /** Día del follow-up (se usa la fecha en UTC para el valor DATE). */
  date: Date;
  summary: string;
  description?: string;
  /** Link opcional al recurso en Konexo. */
  url?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha → "YYYYMMDD" usando componentes UTC (el follow-up se guarda a medianoche). */
function dateValue(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Instante → "YYYYMMDDTHHMMSSZ" (UTC), para DTSTAMP. */
function timestampValue(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Instante → "YYYYMMDDTHHMMSS" (hora flotante, sin Z). Usa los componentes
 *  UTC del Date, que es la "hora de pared" que el usuario eligió y que la app
 *  muestra. Sin TZID: cada calendario lo muestra tal cual. */
function localDateTimeValue(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
  );
}

/** ¿El follow-up es de día completo (sin hora elegida)? */
function isAllDay(d: Date): boolean {
  return (
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
  );
}

/** Escapa texto para campos TEXT de iCalendar (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Plegado de líneas a 75 octetos con continuación (espacio inicial). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

function nextDay(d: Date): Date {
  return new Date(d.getTime() + 24 * 60 * 60 * 1000);
}

/** Arma el documento .ics completo a partir de los eventos. */
export function buildCalendar(events: IcsEvent[], calendarName: string): string {
  const stamp = timestampValue(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Konexo//CRM Follow-ups//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
  ];

  for (const ev of events) {
    const allDay = isAllDay(ev.date);
    lines.push("BEGIN:VEVENT", `UID:${ev.uid}`, `DTSTAMP:${stamp}`);
    if (allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${dateValue(ev.date)}`,
        `DTEND;VALUE=DATE:${dateValue(nextDay(ev.date))}`
      );
    } else {
      // Evento de 1h a la hora elegida (hora flotante).
      const end = new Date(ev.date.getTime() + 60 * 60 * 1000);
      lines.push(
        `DTSTART:${localDateTimeValue(ev.date)}`,
        `DTEND:${localDateTimeValue(end)}`
      );
    }
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.url) lines.push(`URL:${escapeText(ev.url)}`);
    // Alarma: a las 9am si es de día completo (9h después de medianoche), o
    // justo al inicio si tiene hora elegida.
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(ev.summary)}`,
      allDay ? "TRIGGER;RELATED=START:PT9H" : "TRIGGER;RELATED=START:PT0S",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
