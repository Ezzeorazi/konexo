// Instrumentación de Next: register() corre una vez al iniciar cada instancia
// del server, antes de atender requests. Lo usamos para validar env vars
// críticas al arranque (auditoría H1 / Tarea 1): si en producción falta la
// config de auth, DB o cifrado, el server no levanta (fail-closed).
import { assertCriticalEnv } from "@/lib/env";

export function register() {
  assertCriticalEnv();
}
