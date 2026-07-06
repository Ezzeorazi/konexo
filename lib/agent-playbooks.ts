// Playbooks por vertical para el equipo de agentes.
//
// tracks.ts define el VOCABULARIO de cada modo (cómo se llaman las cosas).
// Acá vive el CRITERIO: cómo prioriza el Calificador y cómo redacta el Redactor
// en cada vertical. Un referido de empleo no se evalúa ni se escribe igual que
// un follow-up de venta o un acercamiento a un inversor.

import type { Track } from "@/lib/tracks";

export type AgentPlaybook = {
  /** Cómo debe priorizar el Calificador en este vertical. */
  qualifier: string;
  /** Qué tipo de mensaje y con qué tono escribe el Redactor en este vertical. */
  drafter: string;
};

const PLAYBOOKS: Record<Track, AgentPlaybook> = {
  jobs: {
    qualifier:
      "Lo más caliente es una entrevista próxima o reciente, y cualquier follow-up vencido. El orden de etapa importa: Entrevista > Aplicada > Guardada. Una oportunidad sin un contacto que pueda referir vale menos por ahora: su próximo paso suele ser conseguir ese referido. Bajá la prioridad de avisos viejos sin ningún avance.",
    drafter:
      "El mensaje típico es un follow-up de postulación, un pedido de referido a un contacto, o un agradecimiento post-entrevista. Tono entusiasta, humilde y profesional, breve. Mostrá interés genuino en el rol y la empresa; nunca suenes desesperado. Si es pedido de referido, hacéselo fácil al contacto (ofrecé tu CV o un resumen de una línea).",
  },
  realestate: {
    qualifier:
      "Priorizá por etapa (Reserva > Oferta > Visita > Prospecto) y por valor de la propiedad. Un comprador que ya visitó y mostró interés es lo más caliente: coordinar la próxima visita o seguir una oferta es lo urgente. Tené en cuenta tiempos y financiamiento; un interesado que se enfría tras una visita es prioridad.",
    drafter:
      "El mensaje típico es coordinar o seguir una visita, presentar una propiedad que matchea lo que el cliente pidió, o seguir una oferta/reserva. Tono cercano y servicial, con urgencia sana (hay otras consultas, la oportunidad se puede ir). Sé concreto: proponé día y horario.",
  },
  freelance: {
    qualifier:
      "Priorizá por etapa (En curso > Negociación > Propuesta > Consulta) y por monto, y tratá los cobros pendientes como urgentes: un proyecto entregado y sin cobrar es lo primero a seguir. Una consulta caliente sin propuesta enviada tiene como próximo paso mandar la propuesta. No dejes consultas nuevas sin responder.",
    drafter:
      "El mensaje típico es responder una consulta con próximos pasos, enviar o seguir una propuesta, o un recordatorio amable de cobro. Tono profesional y cercano, seguro de tu valor sin sonar desesperado. En recordatorios de cobro, firme pero cordial, con el dato concreto (monto, fecha, proyecto).",
  },
  startup: {
    qualifier:
      "Priorizá por etapa (Term sheet > Due diligence > Pitch > Lead) y por momentum: las rondas se cierran con impulso, así que un inversor interesado que se está enfriando es urgente. Un ticket potencial alto sube la prioridad. Si no hay intro ni contacto en el fondo, el próximo paso es conseguir una intro cálida.",
    drafter:
      "El mensaje típico es un follow-up post-pitch, un update de tracción para mantener caliente a un inversor, o pedir/coordinar una intro o call con el partner. Tono seguro, conciso y orientado a datos (métricas, crecimiento, momentum). Transmití que la ronda avanza; nunca suenes necesitado.",
  },
  recruiting: {
    qualifier:
      "Priorizá por etapa (Oferta > Entrevista > Screening > Sourced) y por fit con la búsqueda. Un buen candidato que dejó de responder es urgente: no lo pierdas. Considerá responsiveness y disponibilidad. Si falta feedback del hiring manager, coordinarlo es el próximo paso.",
    drafter:
      "El mensaje típico es un acercamiento a un candidato (sourcing), mantener caliente a un candidato en proceso, o coordinar la siguiente entrevista. Tono humano y personalizado, NADA de plantilla genérica de reclutador: vendé la oportunidad concreta y respetá el tiempo del candidato. Sé claro con el próximo paso.",
  },
};

export function getAgentPlaybook(track: Track): AgentPlaybook {
  return PLAYBOOKS[track] ?? PLAYBOOKS.jobs;
}
