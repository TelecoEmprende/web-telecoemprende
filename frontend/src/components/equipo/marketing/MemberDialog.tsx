import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, StickyNote } from "lucide-react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import { Checkbox } from "@/components/ui/checkbox";
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
  ONBOARDING_PASOS,
  type CalendarioItem,
  type FichaMiembro,
  type TaskEstado,
} from "../../../types/marketing";

type Props = {
  email: string;
  /** Habilidades ya apuntadas en el departamento, para el selector -- las
   *  calcula `MembersPanel.tsx`, que ya recorre a todos los miembros. Quien
   *  abre la ficha sin tener esa lista a mano (p. ej. `WeekPanel.tsx`) puede
   *  omitirla: el selector arranca vacío, pero "+ nueva habilidad" sigue
   *  funcionando igual. */
  habilidadesConocidas?: string[];
  onCerrar: () => void;
  /** Para refrescar el directorio cuando cambian las etiquetas o se le asigna
   *  una tarea nueva (cambia su carga). */
  onGuardado: () => void;
};

function iso(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

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
export function MemberDialog({ email, habilidadesConocidas = [], onCerrar, onGuardado }: Props) {
  const { createTask, getCalendario, getFichaMiembro, updateFichaMiembro } = useApi();

  const [ficha, setFicha] = useState<FichaMiembro | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [nuevaHabilidad, setNuevaHabilidad] = useState("");
  const [notas, setNotas] = useState("");
  const [onboarding, setOnboarding] = useState<Record<string, boolean>>({});
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asignando, setAsignando] = useState(false);
  const [tituloTarea, setTituloTarea] = useState("");
  const [asignandoGuardando, setAsignandoGuardando] = useState(false);

  const [proximos, setProximos] = useState<CalendarioItem[]>([]);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta = await getFichaMiembro(email);
        if (!activo) return;
        setFicha(respuesta.ficha);
        setTags(respuesta.ficha.tags);
        setNotas(respuesta.ficha.notas);
        setOnboarding(respuesta.ficha.onboarding ?? {});
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

  // Aparte de la ficha: si falla, no tiene que tirar abajo el resto -- es un
  // extra informativo ("qué tiene por delante"), no el dato central.
  useEffect(() => {
    let activo = true;

    async function cargarProximos() {
      const hoy = new Date();
      const en30dias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30);
      try {
        const respuesta = await getCalendario(iso(hoy), iso(en30dias));
        if (!activo) return;
        setProximos(respuesta.items.filter((i) => i.responsables.includes(email)).slice(0, 3));
      } catch {
        // Sin próximos eventos visibles, la ficha sigue siendo útil igual.
      }
    }

    void cargarProximos();
    return () => {
      activo = false;
    };
  }, [email]);

  const opcionesHabilidad = useMemo(
    () => [...new Set([...habilidadesConocidas, ...tags])].sort(),
    [habilidadesConocidas, tags],
  );

  const onboardingCompletados = ONBOARDING_PASOS.filter((p) => onboarding[p.key]).length;

  function agregarHabilidad() {
    const nueva = nuevaHabilidad.trim();
    if (!nueva || tags.includes(nueva)) return;
    setTags((actuales) => [...actuales, nueva]);
    setNuevaHabilidad("");
    setGuardado(false);
  }

  async function guardar() {
    setIsSaving(true);
    setError(null);

    try {
      await updateFichaMiembro(email, { tags, notas, onboarding });
      // Sin esto, "Cancelar" tras un guardado anterior volvía a lo que había
      // ANTES de esa primera vez que se guardó -- `ficha` se queda como la
      // primera carga si nunca se actualiza con lo último guardado.
      setFicha((actual) => (actual ? { ...actual, tags, notas, onboarding } : actual));
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
      setTags(ficha.tags);
      setNotas(ficha.notas);
      setOnboarding(ficha.onboarding ?? {});
    }
    setNuevaHabilidad("");
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

  const nombre = etiquetaDe(email, ficha?.nombre);

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
              <AvatarResponsable email={email} nombre={ficha?.nombre} className="mkt-ficha-avatar-react" />
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

              {tags.length > 0 ? (
                <span className="mkt-tags-react mkt-ficha-skills-react">
                  {tags.map((tag) => (
                    <span key={tag} className="mkt-tag-react">
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}

              <div className="mkt-ficha-contacto-react">
                <a className="mkt-btn-mini-react" href={`mailto:${email}`}>
                  <Mail size={14} strokeWidth={1.75} aria-hidden="true" /> {email}
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

              {proximos.length > 0 ? (
                <section className="mkt-ficha-bloque-react">
                  <h4>Próximos eventos</h4>
                  <ul className="mkt-ficha-actividad-react">
                    {proximos.map((item) => (
                      <li key={`${item.origen}-${item.id}`}>
                        <span className="mkt-ficha-actividad-texto-react">
                          <b>{item.titulo}</b>
                          {item.padre ? <em> · {item.padre}</em> : null}
                        </span>
                        <time>{formatearFecha(item.fecha)}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mkt-ficha-bloque-react">
                <h4>Perfil</h4>
                <p className="mkt-meta-react">
                  Onboarding: {onboardingCompletados}/{ONBOARDING_PASOS.length} completado
                </p>

                {editandoPerfil ? (
                  <>
                    <div className="field-group-react">
                      <label htmlFor="mf-tags">Habilidades</label>
                      <select
                        id="mf-tags"
                        multiple
                        size={5}
                        value={tags}
                        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        onChange={(e) => {
                          setTags([...e.target.selectedOptions].map((o) => o.value));
                          setGuardado(false);
                        }}
                      >
                        {opcionesHabilidad.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <p className="mkt-meta-react">
                        Ctrl/Cmd + clic para elegir varias, o clic y arrastrar.
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        <input
                          type="text"
                          value={nuevaHabilidad}
                          placeholder="+ nueva habilidad"
                          aria-label="Añadir una habilidad nueva"
                          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          onChange={(e) => setNuevaHabilidad(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              agregarHabilidad();
                            }
                          }}
                        />
                        <button type="button" className="mkt-btn-mini-react" onClick={agregarHabilidad}>
                          Añadir
                        </button>
                      </div>
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

                    <div className="field-group-react">
                      <span className="mkt-meta-react">Onboarding</span>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {ONBOARDING_PASOS.map((paso) => (
                          <label key={paso.key} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={!!onboarding[paso.key]}
                              onCheckedChange={(checked) => {
                                setOnboarding((actual) => ({ ...actual, [paso.key]: checked === true }));
                                setGuardado(false);
                              }}
                            />
                            {paso.label}
                          </label>
                        ))}
                      </div>
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
                      <p className="mkt-nota-privada-react">
                        <StickyNote size={14} strokeWidth={1.75} aria-hidden="true" /> Nota del
                        equipo: {notas}
                      </p>
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
