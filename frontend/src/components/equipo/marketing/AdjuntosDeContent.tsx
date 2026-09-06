import {
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  Paintbrush,
  X,
} from "lucide-react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

/**
 * Los archivos de un contenido, para poder revisarlos sin abrir el editor.
 *
 * Se guardan enlaces, no archivos (Drive, Figma, Canva...), así que el tipo se
 * deduce de la URL. No se pintan miniaturas a propósito: la CSP del sitio es
 * `img-src 'self' data:`, así que una imagen de drive.google.com se bloquearía
 * en silencio y quedaría un hueco gris. Un icono por tipo dice lo mismo y
 * siempre carga.
 */

type Descripcion = {
  nombre: string;
  meta: string;
  Icono: typeof LinkIcon;
};

const PATRONES: { prueba: RegExp; meta: string; Icono: typeof LinkIcon }[] = [
  { prueba: /\.(png|jpe?g|gif|webp|avif|heic)$/i, meta: "Imagen", Icono: ImageIcon },
  { prueba: /\.(mp4|mov|webm|avi|mkv)$/i, meta: "Vídeo", Icono: Film },
  { prueba: /\.pdf$/i, meta: "PDF", Icono: FileText },
  { prueba: /figma\.com/i, meta: "Figma", Icono: Paintbrush },
  { prueba: /canva\.com/i, meta: "Canva", Icono: Paintbrush },
  { prueba: /docs\.google\.com\/document/i, meta: "Documento de Google", Icono: FileText },
  { prueba: /docs\.google\.com\/presentation/i, meta: "Presentación de Google", Icono: FileText },
  { prueba: /drive\.google\.com/i, meta: "Google Drive", Icono: FileText },
  { prueba: /(youtube\.com|youtu\.be|vimeo\.com)/i, meta: "Vídeo", Icono: Film },
  { prueba: /(instagram\.com|tiktok\.com)/i, meta: "Publicación", Icono: ImageIcon },
];

function describir(enlace: string): Descripcion {
  const coincidencia = PATRONES.find((p) => p.prueba.test(enlace));

  let nombre = enlace;
  let dominio = "";
  try {
    const url = new URL(enlace);
    dominio = url.hostname.replace(/^www\./, "");
    // El último tramo con pinta de nombre de archivo; si no, el dominio.
    const ultimo = url.pathname.split("/").filter(Boolean).pop();
    nombre = ultimo && ultimo.length < 60 ? decodeURIComponent(ultimo) : dominio;
  } catch {
    // No es una URL válida: se enseña tal cual, sin romper nada.
  }

  return {
    nombre,
    meta: coincidencia ? `${coincidencia.meta}${dominio ? ` · ${dominio}` : ""}` : dominio || "Enlace",
    Icono: coincidencia?.Icono ?? LinkIcon,
  };
}

type Props = {
  enlaces: string[];
  /** Si se pasa, cada adjunto puede quitarse. Sin esto son de solo lectura. */
  onQuitar?: (enlace: string) => void;
};

export function AdjuntosDeContent({ enlaces, onQuitar }: Props) {
  if (enlaces.length === 0) return null;

  return (
    <div className="mkt-adjuntos-react">
      <p className="mkt-adjuntos-titulo-react">
        {enlaces.length === 1 ? "1 archivo" : `${enlaces.length} archivos`}
      </p>

      {/* Pila vertical, no `AttachmentGroup`: ese es un carrusel horizontal
          (`overflow-x-auto`) pensado para miniaturas, y aquí lo que se quiere
          es ver todos los archivos de un vistazo al revisar. */}
      <div className="mkt-adjuntos-lista-react">
        {enlaces.map((enlace) => {
          const { nombre, meta, Icono } = describir(enlace);

          return (
            <Attachment key={enlace} className="w-full">
              <AttachmentMedia>
                <Icono />
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>{nombre}</AttachmentTitle>
                <AttachmentDescription>{meta}</AttachmentDescription>
              </AttachmentContent>

              <AttachmentActions>
                <AttachmentAction asChild aria-label={`Abrir ${nombre}`}>
                  {/* noopener/noreferrer: el destino es un enlace que ha pegado
                      alguien, no se le da acceso a esta pestaña. */}
                  <a href={enlace} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                  </a>
                </AttachmentAction>

                {onQuitar ? (
                  <AttachmentAction
                    aria-label={`Quitar ${nombre}`}
                    onClick={() => onQuitar(enlace)}
                  >
                    <X />
                  </AttachmentAction>
                ) : null}
              </AttachmentActions>
            </Attachment>
          );
        })}
      </div>
    </div>
  );
}
