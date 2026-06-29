import * as React from "react";

/**
 * Render mínimo de Markdown plano → nodos de React.
 *
 * NO transforma ni reescribe el texto: el Markdown crudo se guarda tal cual en
 * PostgreSQL (ver patchOpportunityField / patchContactField). Esto importa para
 * la IA: el contexto que se le manda a Ollama es exactamente lo que el usuario
 * tipeó, sin alteraciones de formato. Acá solo derivamos una vista para leer.
 *
 * Cubre lo que se usa al tomar notas de seguimiento: encabezados (#, ##, ###),
 * negrita (**), itálica (* o _), código inline (`), links [txt](url), listas
 * con viñetas (- / *) y numeradas (1.), y párrafos con saltos de línea.
 * No usa dangerouslySetInnerHTML: todo se construye como elementos React, así
 * que no hay riesgo de inyección de HTML.
 */

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; lines: string[] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^\d+\.\s+(.*)$/;

function toBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Línea en blanco: separa bloques.
    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(BULLET.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (ORDERED.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED.test(lines[i])) {
        items.push(ORDERED.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Párrafo: junta líneas consecutivas que no abren otro bloque.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", lines: para });
  }

  return blocks;
}

// Tokeniza una corrida de texto inline en orden: código → link → negrita →
// itálica. El código tiene prioridad para no formatear su contenido.
const INLINE =
  /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${n++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      // *itálica* o _itálica_
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

export function renderMarkdown(md: string): React.ReactNode {
  const blocks = toBlocks(md);

  return blocks.map((block, idx) => {
    const key = `b-${idx}`;
    switch (block.type) {
      case "heading": {
        const cls =
          block.level === 1
            ? "mt-3 mb-1 text-base font-semibold first:mt-0"
            : block.level === 2
              ? "mt-3 mb-1 text-sm font-semibold first:mt-0"
              : "mt-2 mb-1 text-sm font-medium first:mt-0";
        const content = renderInline(block.text, key);
        if (block.level === 1) return <h3 key={key} className={cls}>{content}</h3>;
        if (block.level === 2) return <h4 key={key} className={cls}>{content}</h4>;
        return <h5 key={key} className={cls}>{content}</h5>;
      }
      case "ul":
        return (
          <ul key={key} className="my-1 list-disc space-y-0.5 pl-5">
            {block.items.map((item, j) => (
              <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={key} className="my-1 list-decimal space-y-0.5 pl-5">
            {block.items.map((item, j) => (
              <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
            ))}
          </ol>
        );
      case "p":
        return (
          <p key={key} className="my-1 first:mt-0 last:mb-0">
            {block.lines.map((line, j) => (
              <React.Fragment key={`${key}-${j}`}>
                {j > 0 ? <br /> : null}
                {renderInline(line, `${key}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
    }
  });
}
