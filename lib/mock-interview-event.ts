// Evento de cliente para abrir el simulacro de entrevista en el chat (que vive
// en el layout). La card de la oportunidad lo dispara; el ChatWidget lo escucha.
// Así el simulacro no es una superficie nueva: es un modo del chat único.

export const MOCK_INTERVIEW_EVENT = "konexo:mock-interview";

export type MockInterviewTarget = {
  opportunityId: string;
  title: string;
  stage: string;
  stageLabel: string;
};

export function startMockInterview(target: MockInterviewTarget) {
  window.dispatchEvent(new CustomEvent(MOCK_INTERVIEW_EVENT, { detail: target }));
}
