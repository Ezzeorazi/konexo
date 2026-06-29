// Contrato compartido por los componentes de edición in-context. Cada campo
// recibe un `onSave` que normalmente es una Server Action parcial ya ligada al
// id y al nombre del campo (ver patchOpportunityField / patchContactField).
export type SaveResult = { ok: true } | { ok: false; error: string };

export type SaveHandler = (value: string) => Promise<SaveResult>;
