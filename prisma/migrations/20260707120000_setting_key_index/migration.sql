-- Índice para acelerar el lookup del feed .ics por `key` (ej. "calendarToken"),
-- evitando el scan completo de Setting. No se indexa `value` a propósito (texto
-- sin tope → riesgo de exceder el tamaño de entrada de btree).
CREATE INDEX "Setting_key_idx" ON "Setting"("key");
