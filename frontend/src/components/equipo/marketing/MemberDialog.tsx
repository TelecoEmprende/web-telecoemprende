import { useEffect, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiFailure } from "../../../types/api";
import {
  TASK_ESTADO_LABEL,
  formatearFecha,
  haceCuanto,
  type FichaMiembro,
} from "../../../types/marketing";

type Props = {
  email: string;
  onCerrar: () => void;
  /** Para refrescar el directorio cuando cambian las etiquetas. */
  onGuardado: () => void;
};

/**
 * La ficha de una persona del departamento.
 *
 * Los tres números y el historial no se guardan en ningún sitio: salen de sus
 * tareas en el momento de abrir la ficha. Lo único que se escribe son las
 * etiquetas y la nota, que viven en `equipo_accesos` porque son de la persona
 * y no del departamento -- así Eventos e Ingeniería ven las mismas.
 */
export function MemberDialog({ email, onCerrar, onGuardado }: Props) {
  const { getFichaMiembro, updateFichaMiembro } = useApi();

  const [ficha, setFicha] = useState<FichaMiembro | null>(null);
  const [tags, setTags] = useState("");
  const [notas, setNotas] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta = await getFichaMiembro(email);
        if (!activo) return;
        setFicha(respuesta.ficha);
        setTags(respuesta.ficha.tags.join(", "));
        setNotas(respuesta.ficha.notas);
      } catch (err) {
        if (activo) {
          setError((err as ApiFailure)?.message || "No se pudo cargar la ficha.");
        }
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, [email]);

  async function guardar() {
    setIsSaving(true);
    setError(null);

    try {
      await updateFichaMiembro(email, {
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        notas,
      });
      setGuardado(true);
      onGuardado();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo guardar la ficha.");
    } finally {
      setIsSaving(false);
    }
  }

  const nombre = etiquetaDe(email);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="mkt-dialogo-react">
        <DialogHeader>
          <DialogTitle>{nombre}</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>

        {error ? <AlertBanner variant="error" message={error} /> : null}

        {ficha === null ? (
          <p className="mkt-cargando-react">Cargando ficha...</p>
        ) : (
          <div className="mkt-ficha-react">
            <div className="mkt-ficha-identidad-react">
              <AvatarResponsable email={email} />
              <div>
                <p className="mkt-ficha-nombre-react">{nombre}</p>
                <p className="mkt-meta-react">
                  {ficha.cargo
                    ? ficha.cargo === "presidente"
                      ? "Presidente"
                      : "Board member"
                    : ficha.vp_de.length > 0
                      ? `VP de ${ficha.vp_de.join(", ")}`
                      : "Miembro"}
                  {" · desde "}
                  {formatearFecha(ficha.desde.slice(0, 10), true)}
                </p>
              </div>
            </div>

            <dl className="mkt-ficha-cifras-react">
              <div>
                <dd>{ficha.abiertas}</dd>
                <dt>Tareas abiertas</dt>
              </div>
              <div>
                <dd>{ficha.completadas}</dd>
                <dt>Completadas</dt>
              </div>
              <div>
                <dd>{ficha.campanas}</dd>
                <dt>Campañas</dt>
              </div>
            </dl>

            <section className="mkt-ficha-bloque-react">
              <h4>Actividad reciente</h4>
              {ficha.actividad.length === 0 ? (
                <p className="mkt-vacio-inline-react">
                  Todavía no tiene ninguna tarea en este departamento.
                </p>
              ) : (
                <ul className="mkt-ficha-actividad-react">
                  {ficha.actividad.map((item) => (
                    <li key={item.id}>
                      <span className={`mkt-punto-react mkt-punto-${item.estado}-react`} />
                      <span className="mkt-ficha-actividad-texto-react">
                        <b>{TASK_ESTADO_LABEL[item.estado]}</b> «{item.titulo}»
                        {item.padre ? <em> · {item.padre}</em> : null}
                      </span>
                      <time dateTime={item.updated_at}>{haceCuanto(item.updated_at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mkt-ficha-bloque-react">
              <h4>Perfil</h4>
              <div className="field-group-react">
                <label htmlFor="mf-tags">Habilidades</label>
                <input
                  id="mf-tags"
                  type="text"
                  value={tags}
                  placeholder="Reels, Fotografía, Copy"
                  onChange={(e) => {
                    setTags(e.target.value);
                    setGuardado(false);
                  }}
                />
                <p className="mkt-meta-react">Separadas por comas.</p>
              </div>

              <div className="field-group-react">
                <label htmlFor="mf-notas">Nota del equipo</label>
                <textarea
                  id="mf-notas"
                  rows={3}
                  value={notas}
                  placeholder="Entrega rápido, mejor una cosa a la vez."
                  onChange={(e) => {
                    setNotas(e.target.value);
                    setGuardado(false);
                  }}
                />
                <p className="mkt-meta-react">
                  La ve todo el departamento. Sirve para repartir mejor, no para
                  evaluar a nadie.
                </p>
              </div>

              <div className="mkt-ficha-acciones-react">
                <button
                  type="button"
                  className="mkt-btn-mini-react"
                  onClick={() => void guardar()}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar perfil"}
                </button>
                {guardado ? <span className="mkt-meta-react">Guardado.</span> : null}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
