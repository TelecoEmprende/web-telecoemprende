import "@blocknote/mantine/style.css";

import type { PartialBlock } from "@blocknote/core";
import { es } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

/** Colores del editor sacados de `tokens.css`: BlockNote los vuelca como
 *  variables CSS, así que una `var()` vale igual que un hex. */
const TEMA = {
  colors: {
    editor: { text: "var(--color-noche)", background: "var(--color-surface)" },
    menu: { text: "var(--color-noche)", background: "var(--color-surface)" },
    tooltip: { text: "var(--color-text-on-dark)", background: "var(--color-noche)" },
    hovered: { text: "var(--color-noche)", background: "var(--color-papel)" },
    selected: { text: "var(--color-text-on-dark)", background: "var(--color-azul)" },
    disabled: { text: "var(--color-text-muted)", background: "var(--color-papel-hueso)" },
    shadow: "var(--color-papel-hueso)",
    border: "var(--color-papel-hueso)",
    sideMenu: "var(--color-azul-claro)",
  },
  borderRadius: 8,
  fontFamily: "var(--font-body)",
};

type Props = {
  inicial: unknown[];
  editable: boolean;
  onCambio: (contenido: unknown[]) => void;
};

/**
 * El editor por bloques de una nota. Va en su propio archivo para cargarse
 * con `lazy()`: BlockNote + Mantine pesan, y solo hacen falta al abrir una
 * nota. Quien lo usa le pone `key` con el id de la nota, porque
 * `useCreateBlockNote` solo lee el contenido inicial al montar.
 */
export default function NotaEditor({ inicial, editable, onCambio }: Props) {
  const editor = useCreateBlockNote({
    initialContent: inicial.length > 0 ? (inicial as PartialBlock[]) : undefined,
    dictionary: es,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={TEMA}
      onChange={() => onCambio(editor.document)}
    />
  );
}
