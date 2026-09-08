import { FormEvent, useEffect, useState } from "react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
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
  formatearFecha,
  haceCuanto,
  type FichaMiembro,
  type TaskEstado,
} from "../../../types/marketing";

type Props = {
  email: string;
  onCerrar: () => void;
  /** Para refrescar el directorio cuando cambian las etiquetas o se le asigna
   *  una tarea nueva (cambia su carga). */
  onGuardado: () => void;
};

/** La actividad reciente es el estado actual de sus tareas, no un registro de
 *  eventos (ver `ficha_miembro` en el backend) -- el verbo es una lectura de
 *  ese estado, no un hecho distinto para cada fila. */
const VERBO_ACTIVIDAD: Record<TaskEstado, string> = {
  pendiente: "Tiene pendiente",
  en_progreso: "Está trabajando en",
  por_revisar: "Envió a revisión",
  acabado: "Completó",
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
  const { createTask, getFichaMiembro, updateFichaMiembro } = useApi();

  const [ficha, setFicha] = useState<FichaMiembro | null>(null);
  const [tags, setTags] = useState("");
  const [notas, setNotas] = useState("");
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asignando, setAsignando] = useState(false);
  const [tituloTarea, setTituloTarea] = useState("");
  const [asignandoGuardando, setAsignandoGuardando] = useState(false);

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
      setEditandoPerfil(false);
      onGuardado();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo guardar la ficha.");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelarEdicion() {
    // Sin esto, un cambio a medio escribir y luego "Cancelar" se quedaba en
    // el estado local -- la vista de solo lectura usa `tags`/`notas`, no
    // `ficha`, así que un borrador abandonado se seguía enseñando como si
    // fuera lo último guardado.
    if (ficha) {
      setTags(ficha.tags.join(", "));
      setNotas(ficha.notas);
    }
    setEditandoPerfil(false);
  }

  async function asignarTarea(event: FormEvent) {
    event.preventDefault();
    const titulo = tituloTarea.trim();
    if (!titulo) return;

    setAsignandoGuardando(true);
    try {
      await createTask({ titulo, responsables: [email] });
      setTituloTarea("");
      setAsignando(false);
      onGuardado();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo asignar la tarea.");
    } finally {
      setAsignandoGuardando(false);
    }
  }

  const nombre = etiquetaDe(email);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="mkt-dialogo-react mkt-dialogo-ficha-react">
        <DialogHeader className="sr-only">
          <DialogTitle>{nombre}</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>

        {error ? <AlertBanner variant="error" message={error} /> : null}

        {ficha === null ? (
          <Esqueleto filas={3} alto={48} />
        ) : (
          <div className="mkt-ficha-react">
            <div className="mkt-ficha-lateral-react">
              <AvatarResponsable email={email} className="mkt-ficha-avatar-react" />
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

              {tags.trim() ? (
                <span className="mkt-tags-react mkt-ficha-skills-react">
                  {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="mkt-tag-react">
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}

              <div className="mkt-ficha-contacto-react">
                <a className="mkt-btn-mini-react" href={`mailto:${email}`}>
                  ✉️ {email}
                </a>
                <button
                  type="button"
                  className="mkt-btn-react"
                  onClick={() => setAsignando((abierto) => !abierto)}
                >
                  + Asignar tarea
                </button>
              </div>

              {asignando ? (
                <form className="mkt-ficha-asignar-react" onSubmit={asignarTarea}>
                  <input
                    type="text"
                    autoFocus
                    value={tituloTarea}
                    placeholder="Título de la tarea"
                    aria-label={`Título de la tarea para ${nombre}`}
                    onChange={(e) => setTituloTarea(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="mkt-btn-mini-react"
                    disabled={!tituloTarea.trim() || asignandoGuardando}
                  >
                    {asignandoGuardando ? "Asignando..." : "Crear"}
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mkt-ficha-cuerpo-react">
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
                          {VERBO_ACTIVIDAD[item.estado]} <b>"{item.titulo}"</b>
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

                {editandoPerfil ? (
                  <>
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
                      <button
                        type="button"
                        className="mkt-btn-mini-react"
                        onClick={() => cancelarEdicion()}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {notas ? (
                      <p className="mkt-nota-privada-react">📝 Nota del equipo: {notas}</p>
                    ) : null}
                    <div className="mkt-ficha-acciones-react">
                      <button
                        type="button"
                        className="mkt-btn-mini-react"
                        onClick={() => setEditandoPerfil(true)}
                      >
                        Editar perfil
                      </button>
                      {guardado ? <span className="mkt-meta-react">Guardado.</span> : null}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
