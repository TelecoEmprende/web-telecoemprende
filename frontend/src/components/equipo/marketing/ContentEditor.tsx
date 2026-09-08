import { FormEvent, useEffect, useRef, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import type { ApiFailure } from "../../../types/api";
import {
  CONTENT_ESTADOS,
  CONTENT_ESTADO_LABEL,
  MAX_TEXTO_LARGO_LEN,
  MAX_TITULO_LEN,
  type Content,
  type ContentEstado,
} from "../../../types/marketing";

type Props = {
  content: Content;
  onCerrar: () => void;
  onGuardado: () => void;
};

/** Una línea por elemento. Es lo que la gente ya hace al pegar enlaces, y
 *  ahorra un componente de "chips" que nadie ha pedido. */
function comoLineas(valores: string[]) {
  return valores.join("\n");
}

function desdeLineas(texto: string) {
  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

/**
 * Editor sencillo, no un editor tipo Notion (§33 del encargo). Campos planos,
 * un guardar, y fuera.
 */
export function ContentEditor({ content, onCerrar, onGuardado }: Props) {
  const { updateContent } = useApi();

  const [titulo, setTitulo] = useState(content.titulo);
  const [tipo, setTipo] = useState(content.tipo);
  const [plataforma, setPlataforma] = useState(content.plataforma);
  const [fecha, setFecha] = useState(content.fecha_publicacion ?? "");
  const [estado, setEstado] = useState<ContentEstado>(content.estado);
  const [script, setScript] = useState(content.script);
  const [copyTexto, setCopyTexto] = useState(content.copy_texto);
  const [cta, setCta] = useState(content.cta);
  const [hashtags, setHashtags] = useState(content.hashtags);
  const [ideaVisual, setIdeaVisual] = useState(content.idea_visual);
  const [responsables, setResponsables] = useState(comoLineas(content.responsables));
  const [enlaces, setEnlaces] = useState(comoLineas(content.enlaces));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);

  // Este es el editor con más campos de todo Marketing (guion, copy, CTA...):
  // un toque fuera de sitio en el móvil, sin este aviso, se llevaba por
  // delante lo escrito sin posibilidad de deshacer.
  const haCambiado =
    titulo !== content.titulo ||
    tipo !== content.tipo ||
    plataforma !== content.plataforma ||
    fecha !== (content.fecha_publicacion ?? "") ||
    estado !== content.estado ||
    script !== content.script ||
    copyTexto !== content.copy_texto ||
    cta !== content.cta ||
    hashtags !== content.hashtags ||
    ideaVisual !== content.idea_visual ||
    responsables !== comoLineas(content.responsables) ||
    enlaces !== comoLineas(content.enlaces);

  function intentarCerrar() {
    if (haCambiado) {
      setConfirmandoCierre(true);
    } else {
      onCerrar();
    }
  }

  // El listener de Escape se monta una sola vez (si dependiera de
  // `haCambiado` se re-suscribiría en cada pulsación); una ref le da acceso
  // al valor de verdad sin ese vaivén.
  const haCambiadoRef = useRef(haCambiado);
  haCambiadoRef.current = haCambiado;

  // Un modal que no cierra con Escape y no mueve el foco deja a quien navega
  // con teclado atrapado detrás del overlay, tocando botones que no ve.
  useEffect(() => {
    cajaRef.current?.querySelector<HTMLInputElement>("input")?.focus();

    function alPulsar(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (haCambiadoRef.current) {
        setConfirmandoCierre(true);
      } else {
        onCerrar();
      }
    }

    document.addEventListener("keydown", alPulsar);
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = scrollPrevio;
    };
  }, [onCerrar]);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateContent(content.id, {
        titulo,
        tipo,
        plataforma,
        fecha_publicacion: fecha || null,
        estado,
        script,
        copy_texto: copyTexto,
        cta,
        hashtags,
        idea_visual: ideaVisual,
        responsables: desdeLineas(responsables),
        enlaces: desdeLineas(enlaces),
      });
      onGuardado();
    } catch (err) {
      const fallo = err as ApiFailure;
      setError(fallo?.message || "No se pudo guardar el contenido.");
      setIsSaving(false);
    }
  }

  return (
    <div
      className="mkt-modal-fondo-react"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ce-encabezado"
      // Clic en el fondo (no en la caja) cierra, como espera cualquiera.
      onClick={(event) => {
        if (event.target === event.currentTarget) intentarCerrar();
      }}
    >
      <div className="mkt-modal-react" ref={cajaRef}>
        <header className="mkt-modal-header-react">
          <h3 id="ce-encabezado">Editar contenido</h3>
          <button type="button" className="mkt-btn-mini-react" onClick={intentarCerrar}>
            Cerrar
          </button>
        </header>

        {error ? <AlertBanner variant="error" message={error} /> : null}

        <form className="mkt-form-react" onSubmit={guardar}>
          <p className="mkt-adjuntos-titulo-react">Metadatos</p>

          <div className="field-group-react">
            <label htmlFor="ce-titulo">Título</label>
            <input
              id="ce-titulo"
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
            <ContadorCaracteres valor={titulo} maximo={MAX_TITULO_LEN} />
          </div>

          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="ce-tipo">Tipo</label>
              <input
                id="ce-tipo"
                type="text"
                value={tipo}
                placeholder="reel, post, stories"
                onChange={(event) => setTipo(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="ce-plataforma">Plataforma</label>
              <input
                id="ce-plataforma"
                type="text"
                value={plataforma}
                placeholder="instagram, linkedin"
                onChange={(event) => setPlataforma(event.target.value)}
              />
            </div>
          </div>

          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="ce-fecha">Fecha de publicación</label>
              <input
                id="ce-fecha"
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="ce-estado">Estado</label>
              <select
                id="ce-estado"
                value={estado}
                onChange={(event) => setEstado(event.target.value as ContentEstado)}
              >
                {CONTENT_ESTADOS.map((valor) => (
                  <option key={valor} value={valor}>
                    {CONTENT_ESTADO_LABEL[valor]}
                  </option>
                ))}
              </select>
              {estado === "publicado" ? (
                <p className="mkt-meta-react">
                  Al guardar, sus tareas pendientes se marcarán como hechas.
                </p>
              ) : null}
            </div>
          </div>

          <p className="mkt-adjuntos-titulo-react mkt-form-seccion-react">Copy y guion</p>

          <div className="field-group-react">
            <label htmlFor="ce-script">Guion</label>
            <textarea
              id="ce-script"
              rows={5}
              value={script}
              onChange={(event) => setScript(event.target.value)}
            />
            <ContadorCaracteres valor={script} maximo={MAX_TEXTO_LARGO_LEN} />
          </div>

          <div className="field-group-react">
            <label htmlFor="ce-copy">Copy</label>
            <textarea
              id="ce-copy"
              rows={3}
              value={copyTexto}
              onChange={(event) => setCopyTexto(event.target.value)}
            />
            <ContadorCaracteres valor={copyTexto} maximo={MAX_TEXTO_LARGO_LEN} />
          </div>

          <div className="field-group-react">
            <label htmlFor="ce-cta">CTA</label>
            <input
              id="ce-cta"
              type="text"
              value={cta}
              placeholder="Apúntate en el link de la bio"
              onChange={(event) => setCta(event.target.value)}
            />
          </div>

          <div className="field-group-react">
            <label htmlFor="ce-hashtags">Hashtags</label>
            <input
              id="ce-hashtags"
              type="text"
              value={hashtags}
              placeholder="#emprendimiento #upm"
              onChange={(event) => setHashtags(event.target.value)}
            />
          </div>

          <div className="field-group-react">
            <label htmlFor="ce-visual">Idea visual</label>
            <textarea
              id="ce-visual"
              rows={2}
              value={ideaVisual}
              onChange={(event) => setIdeaVisual(event.target.value)}
            />
          </div>

          <p className="mkt-adjuntos-titulo-react mkt-form-seccion-react">Equipo y enlaces</p>

          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="ce-responsables">Responsables (uno por línea)</label>
              <textarea
                id="ce-responsables"
                rows={3}
                value={responsables}
                placeholder="abril@alumnos.upm.es"
                onChange={(event) => setResponsables(event.target.value)}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="ce-enlaces">Enlaces (uno por línea)</label>
              <textarea
                id="ce-enlaces"
                rows={3}
                value={enlaces}
                placeholder="https://drive.google.com/..."
                onChange={(event) => setEnlaces(event.target.value)}
              />
            </div>
          </div>

          <div className="mkt-modal-acciones-react">
            <button type="submit" className="mkt-btn-react" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>

            {confirmandoCierre ? (
              <span className="mkt-confirmar-react">
                ¿Descartar los cambios?
                <button
                  type="button"
                  className="mkt-btn-mini-peligro-react"
                  onClick={onCerrar}
                >
                  Sí, descartar
                </button>
                <button
                  type="button"
                  className="mkt-btn-mini-react"
                  onClick={() => setConfirmandoCierre(false)}
                >
                  Seguir editando
                </button>
              </span>
            ) : (
              <button type="button" className="mkt-btn-mini-react" onClick={intentarCerrar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
