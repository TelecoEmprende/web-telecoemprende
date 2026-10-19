import { motion } from "motion/react";
import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { CabeceraPanel } from "../CabeceraPanel";
import { Esqueleto } from "../../feedback/Esqueleto";
import { restaurar } from "../../../api/club";
import { apiDepto } from "../../../api/marketing";
import { AlertBanner } from "../../feedback/AlertBanner";
import { ContadorCaracteres } from "../../feedback/ContadorCaracteres";
import { Badge } from "@/components/ui/badge";
import { AvataresDeResponsables } from "../marketing/Avatares";
import { SelectorMiembros } from "../marketing/SelectorMiembros";
import { useDirectorio } from "../DeptoApi";
import { useEntradaDeFila } from "../../movimiento";
import type { ApiFailure } from "../../../types/api";
import { DEPTO_LABEL, TEAMS, type Team } from "../../../types/equipo";
import { MAX_TEXTO_LARGO_LEN, MAX_TITULO_LEN, formatearFecha } from "../../../types/marketing";
import { listaDe, textoDe, type Registro } from "../../../types/registros";

// BlockNote + Mantine pesan: solo se bajan al abrir un acta.
const NotaEditor = lazy(() => import("../notas/NotaEditor"));

/** El acta con la que nace cada reunión: lo que se repite en todas. Es un
 *  documento de bloques como cualquier nota, así que se edita igual (listas,
 *  casillas, títulos, «/» para insertar). Las casillas de «Tareas» son las que
 *  se cuentan como pendientes. */
const PLANTILLA_ACTA = [
  { type: "heading", props: { level: 2 }, content: "Orden del día" },
  { type: "bulletListItem", content: "" },
  { type: "heading", props: { level: 2 }, content: "Qué se ha hecho desde la última vez" },
  { type: "bulletListItem", content: "" },
  { type: "heading", props: { level: 2 }, content: "Acuerdos y decisiones" },
  { type: "bulletListItem", content: "" },
  { type: "heading", props: { level: 2 }, content: "Tareas (quién y para cuándo)" },
  { type: "checkListItem", content: "" },
];

const GUARDADO_MS = 800;

type Bloque = {
  id?: string;
  type?: string;
  props?: { checked?: boolean };
  content?: unknown;
  children?: unknown;
};

/** El texto de un bloque de BlockNote: `content` es un texto o una lista de
 *  trozos con su `text`. */
function textoDelBloque(b: Bloque): string {
  if (typeof b.content === "string") return b.content;
  if (!Array.isArray(b.content)) return "";
  return b.content.map((t) => (typeof t?.text === "string" ? t.text : "")).join("");
}

/** Los acuerdos sin pasar a tarea: las casillas sin marcar del acta que tienen
 *  texto, en orden. */
export function acuerdosPendientes(contenido: unknown): { id: string; texto: string }[] {
  if (!Array.isArray(contenido)) return [];
  return (contenido as Bloque[]).flatMap((b) => [
    ...(b.type === "checkListItem" && !b.props?.checked && b.id && textoDelBloque(b).trim()
      ? [{ id: b.id, texto: textoDelBloque(b).trim() }]
      : []),
    ...acuerdosPendientes(b.children),
  ]);
}

/** Marca el acuerdo como hecho en el acta y deja escrito que ya es una tarea,
 *  para que no se pase dos veces ni siga contando como pendiente. */
export function marcarComoTarea(contenido: unknown, id: string): unknown {
  if (!Array.isArray(contenido)) return contenido;
  return (contenido as Bloque[]).map((b) => {
    if (b.id !== id) return { ...b, children: marcarComoTarea(b.children, id) };
    const aviso = { type: "text", text: " → tarea creada", styles: { italic: true } };
    const content = Array.isArray(b.content)
      ? [...b.content, aviso]
      : [{ type: "text", text: textoDelBloque(b), styles: {} }, aviso];
    return { ...b, props: { ...b.props, checked: true }, content };
  });
}

/** Casillas del acta todavía sin marcar. */
export function pendientesDelActa(contenido: unknown): number {
  if (!Array.isArray(contenido)) return 0;
  return (contenido as Bloque[]).reduce(
    (n, b) =>
      n +
      (b.type === "checkListItem" && !b.props?.checked ? 1 : 0) +
      pendientesDelActa(b.children),
    0,
  );
}

function ambitoDe(r: Registro) {
  const depto = textoDe(r, "departamento");
  if (depto === "directiva") return r.solo_directiva ? "Directiva · privada" : "Directiva";
  return depto === "" ? "Todo el club" : DEPTO_LABEL[depto as Team] ?? depto;
}

type Ambito = Team | "club" | "directiva";

/** Un acuerdo del acta convertido en tarea: con responsable y fecha, para que
 *  salga en Tareas y en la Mesa en vez de quedarse escrito en el acta. */
function PasarATarea({
  acuerdo,
  deptoInicial,
  elegirDepto,
  reunion,
  onCreada,
}: {
  acuerdo: { id: string; texto: string };
  deptoInicial: Team;
  /** Reunión de todo el club o de la directiva: la tarea no tiene un
   *  departamento evidente, así que se elige. */
  elegirDepto: boolean;
  reunion: string;
  onCreada: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [depto, setDepto] = useState<Team>(deptoInicial);
  const [responsables, setResponsables] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setGuardando(true);
    try {
      await apiDepto(depto).createTask({
        titulo: acuerdo.texto.slice(0, MAX_TITULO_LEN),
        instrucciones: `Acuerdo de la reunión «${reunion}».`,
        responsables,
        deadline: deadline || null,
      });
      onCreada(acuerdo.id);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la tarea.");
      setGuardando(false);
    }
  }

  return (
    <li className="reu-acuerdo-react">
      <span>{acuerdo.texto}</span>
      {abierto ? (
        <div className="reu-acuerdo-form-react">
          {error ? <AlertBanner variant="error" message={error} /> : null}
          {elegirDepto ? (
            <select
              className="crm-select-react"
              aria-label="Departamento de la tarea"
              value={depto}
              onChange={(e) => setDepto(e.target.value as Team)}
            >
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {DEPTO_LABEL[t]}
                </option>
              ))}
            </select>
          ) : null}
          <SelectorMiembros
            id={`acuerdo-${acuerdo.id}`}
            seleccionados={responsables}
            onCambiar={setResponsables}
            deptos={[depto]}
            proponer
          />
          <input
            type="date"
            value={deadline}
            aria-label="Para cuándo"
            onChange={(e) => setDeadline(e.target.value)}
          />
          <button type="button" className="crm-btn" disabled={guardando} onClick={() => void crear()}>
            {guardando ? "Creando..." : "Crear tarea"}
          </button>
          <button type="button" className="crm-btn crm-btn-ghost-react" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" className="crm-btn crm-btn-ghost-react" onClick={() => setAbierto(true)}>
          Pasar a tarea
        </button>
      )}
    </li>
  );
}

type Props = {
  /** Departamentos que se ven a la vez (el filtro de la barra). La reunión de
   *  todo el club o de la directiva sale en cualquiera de ellos, una sola vez. */
  deptos: Team[];
  /** Cargo, VP o admin: convoca y edita las de la directiva y ve las privadas. */
  esDirectiva: boolean;
};

/**
 * Las reuniones: convocatoria, asistentes, objetivo y el acta, que es un
 * documento como una nota (títulos, listas, casillas). El acta se guarda sola.
 * Las casillas sin marcar del acta salen como pendientes de la reunión.
 */
export function ReunionesPanel({ deptos, esDirectiva }: Props) {
  const entradaFila = useEntradaDeFila();
  const directorio = useDirectorio();
  const [reuniones, setReuniones] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; deshacer: () => void } | null>(null);
  const [abierta, setAbierta] = useState<Registro | null>(null);
  const [creando, setCreando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState<"guardado" | "guardando" | "pendiente">("guardado");

  const pendiente = useRef<Record<string, unknown>>({});
  const temporizador = useRef<number | undefined>(undefined);

  // Formulario de alta.
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [ambito, setAmbito] = useState<Ambito>("club");
  const [soloDirectiva, setSoloDirectiva] = useState(true);
  // Cambia cuando el acta se reescribe desde fuera del editor (al pasar un
  // acuerdo a tarea): el editor se monta de nuevo con el contenido nuevo.
  const [versionActa, setVersionActa] = useState(0);
  const [tareaCreada, setTareaCreada] = useState<string | null>(null);

  const api = apiDepto(deptos[0]);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await apiDepto(deptos[0]).listarRegistros("reuniones", deptos);
      setReuniones(respuesta.reuniones ?? []);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar las reuniones.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptos.join(",")]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardarYa = useCallback(async () => {
    window.clearTimeout(temporizador.current);
    const cambios = pendiente.current;
    pendiente.current = {};
    if (Object.keys(cambios).length === 0 || !abierta) return;
    setEstadoGuardado("guardando");
    try {
      await api.actualizarRegistro("reuniones", abierta.id, cambios);
      setEstadoGuardado("guardado");
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo guardar la reunión.");
      setEstadoGuardado("pendiente");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta?.id]);

  /** Cambia campos de la reunión abierta: se ven ya y se guardan solos. */
  function cambiar(parcial: Record<string, unknown>) {
    if (!abierta) return;
    setAbierta({ ...abierta, ...parcial });
    pendiente.current = { ...pendiente.current, ...parcial };
    setEstadoGuardado("pendiente");
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarYa(), GUARDADO_MS);
  }

  async function cerrar() {
    await guardarYa();
    setAbierta(null);
    setTareaCreada(null);
    await cargar();
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim()) return;
    try {
      const donde = ambito === "club" || ambito === "directiva" ? deptos[0] : ambito;
      const r = await apiDepto(donde).crearRegistro("reuniones", {
        titulo,
        fecha: fecha || null,
        hora,
        contenido: PLANTILLA_ACTA,
        ...(ambito === "club" ? { club: true } : {}),
        ...(ambito === "directiva" ? { directiva: true, solo_directiva: soloDirectiva } : {}),
      });
      setTitulo("");
      setFecha("");
      setHora("");
      setCreando(false);
      setAbierta(r.registro);
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la reunión.");
    }
  }

  async function borrar() {
    if (!abierta) return;
    const { id } = abierta;
    const nombre = textoDe(abierta, "titulo");
    window.clearTimeout(temporizador.current);
    pendiente.current = {};
    try {
      await api.eliminarRegistro("reuniones", id);
      setAbierta(null);
      await cargar();
      setAviso({
        texto: `«${nombre}» está en la papelera (30 días).`,
        deshacer: () => {
          void restaurar("reunion", id)
            .then(cargar)
            .catch(() => setError("No se pudo restaurar la reunión."));
        },
      });
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo eliminar la reunión.");
    }
  }

  if (isLoading) return <Esqueleto filas={4} alto={64} />;

  const avisoBanner = aviso ? (
    <AlertBanner
      variant="success"
      message={aviso.texto}
      action={{
        label: "Deshacer",
        onClick: () => {
          const deshacer = aviso.deshacer;
          setAviso(null);
          deshacer();
        },
      }}
    />
  ) : null;

  // --- Una reunión abierta ---
  if (abierta) {
    const asistentes = listaDe(abierta, "asistentes");
    const deDirectiva = textoDe(abierta, "departamento") === "directiva";
    // Una de la directiva abierta a todo el club se lee, pero solo la toca ella.
    const soloLeer = deDirectiva && !esDirectiva;
    const acuerdos = soloLeer ? [] : acuerdosPendientes(abierta.contenido);
    const deptoDeLaReunion = (TEAMS as string[]).includes(textoDe(abierta, "departamento"))
      ? (textoDe(abierta, "departamento") as Team)
      : null;
    return (
      <section className="mkt-panel-react">
        {error ? <AlertBanner variant="error" message={error} /> : null}

        <button type="button" className="mkt-volver-react" onClick={() => void cerrar()}>
          ← Todas las reuniones
        </button>

        <fieldset className="reu-fieldset-react" disabled={soloLeer}>
        <div className="mkt-form-react reu-ficha-react">
          <div className="field-group-react">
            <label htmlFor="reu-titulo">Título</label>
            <input
              id="reu-titulo"
              type="text"
              value={textoDe(abierta, "titulo")}
              maxLength={MAX_TITULO_LEN}
              onChange={(e) => cambiar({ titulo: e.target.value })}
            />
          </div>
          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="reu-fecha">Fecha</label>
              <input
                id="reu-fecha"
                type="date"
                value={textoDe(abierta, "fecha")}
                onChange={(e) => cambiar({ fecha: e.target.value || null })}
              />
            </div>
            <div className="field-group-react">
              <label htmlFor="reu-hora">Hora</label>
              <input
                id="reu-hora"
                type="time"
                value={textoDe(abierta, "hora")}
                onChange={(e) => cambiar({ hora: e.target.value })}
              />
            </div>
            <div className="field-group-react">
              <label>De quién es</label>
              <p className="mkt-meta-react reu-ambito-react">{ambitoDe(abierta)}</p>
              {deDirectiva && esDirectiva ? (
                <label className="crm-tag crm-tag-check-react">
                  <input
                    type="checkbox"
                    className="crm-check"
                    checked={Boolean(abierta.solo_directiva)}
                    onChange={(e) => cambiar({ solo_directiva: e.target.checked })}
                  />
                  Solo la ve la directiva
                </label>
              ) : null}
            </div>
          </div>
          <div className="field-group-react">
            <label htmlFor="reu-asistentes">Asistentes</label>
            <SelectorMiembros
              id="reu-asistentes"
              seleccionados={asistentes}
              onCambiar={(emails) => cambiar({ asistentes: emails })}
            />
          </div>
          <div className="field-group-react">
            <label htmlFor="reu-objetivo">Objetivo</label>
            <textarea
              id="reu-objetivo"
              rows={2}
              value={textoDe(abierta, "objetivo")}
              placeholder="Para qué se convoca. Sin esto, la reunión se convierte en una puesta al día."
              onChange={(e) => cambiar({ objetivo: e.target.value })}
            />
            <ContadorCaracteres valor={textoDe(abierta, "objetivo")} maximo={MAX_TEXTO_LARGO_LEN} />
          </div>
        </div>
        </fieldset>

        <div className="reu-acta-cabecera-react">
          <h4 className="mkt-grupo-titulo-react">Acta y acuerdos</h4>
          <span className="crm-s notas-guardado-react" role="status">
            {soloLeer
              ? "Solo lectura: la edita la directiva"
              : estadoGuardado === "guardando"
              ? "Guardando…"
              : estadoGuardado === "pendiente"
                ? "Sin guardar"
                : "Guardada"}
          </span>
        </div>
        <div className="notas-editor-react reu-acta-react">
          <Suspense fallback={<Esqueleto filas={4} alto={28} />}>
            <NotaEditor
              key={`${abierta.id}-${versionActa}`}
              inicial={Array.isArray(abierta.contenido) ? abierta.contenido : []}
              editable={!soloLeer}
              onCambio={(contenido) => cambiar({ contenido })}
            />
          </Suspense>
        </div>

        {tareaCreada ? (
          <AlertBanner variant="success" message={`«${tareaCreada}» ya es una tarea: sale en Tareas y en la Mesa.`} />
        ) : null}
        {acuerdos.length > 0 ? (
          <div className="crm-c mkt-grupo-react">
            <h4 className="mkt-grupo-titulo-react">Acuerdos sin pasar a tarea</h4>
            <p className="crm-s">
              Las casillas sin marcar del acta. Dales responsable y fecha para que no se queden aquí.
            </p>
            <ul className="reu-acuerdos-react">
              {acuerdos.map((a) => (
                <PasarATarea
                  key={a.id}
                  acuerdo={a}
                  deptoInicial={deptoDeLaReunion ?? deptos[0]}
                  elegirDepto={deptoDeLaReunion === null}
                  reunion={textoDe(abierta, "titulo")}
                  onCreada={(id) => {
                    cambiar({ contenido: marcarComoTarea(abierta.contenido, id) });
                    setVersionActa((v) => v + 1);
                    setTareaCreada(a.texto);
                  }}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {soloLeer ? null : (
          <div className="mkt-zona-peligro-react">
            <button type="button" className="mkt-btn-borrar-react" onClick={() => void borrar()}>
              Enviar reunión a la papelera
            </button>
            <p className="mkt-meta-react">Con su acta: se puede restaurar durante 30 días.</p>
          </div>
        )}
      </section>
    );
  }

  // --- Listado ---
  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = reuniones.filter((r) => textoDe(r, "fecha") >= hoy || textoDe(r, "fecha") === "");
  const pasadas = reuniones.filter((r) => textoDe(r, "fecha") !== "" && textoDe(r, "fecha") < hoy);

  const tarjeta = (r: Registro, indice: number) => {
    const asistentes = listaDe(r, "asistentes");
    const pendientes = pendientesDelActa(r.contenido);
    return (
      <motion.li key={r.id} {...entradaFila(indice)}>
        <button type="button" className="mkt-campaign-card-react" onClick={() => setAbierta(r)}>
          <span className="mkt-campaign-nombre-react">
            {textoDe(r, "titulo")}
            <Badge variant="outline">{ambitoDe(r)}</Badge>
          </span>
          <span className="mkt-meta-react">
            {[
              textoDe(r, "fecha") ? formatearFecha(textoDe(r, "fecha"), true) : "Sin fecha",
              textoDe(r, "hora"),
            ]
              .filter(Boolean)
              .join(" · ")}
            {pendientes > 0 ? ` · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"} en el acta` : ""}
          </span>
          {textoDe(r, "objetivo") ? (
            <span className="mkt-campaign-objetivo-react">{textoDe(r, "objetivo")}</span>
          ) : null}
          {asistentes.length > 0 ? (
            <AvataresDeResponsables responsables={asistentes} directorio={directorio} />
          ) : null}
        </button>
      </motion.li>
    );
  };

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}
      {avisoBanner}

      <CabeceraPanel descripcion="Convocatoria, asistentes, objetivo y el acta, que se escribe como una nota. Lo que se acordó queda escrito donde se puede buscar.">
        <button type="button" className="crm-btn" onClick={() => setCreando((a) => !a)}>
          {creando ? "Cancelar" : "+ Nueva reunión"}
        </button>
      </CabeceraPanel>

      {creando ? (
        <form className="mkt-form-react" onSubmit={crear}>
          <div className="field-group-react">
            <label htmlFor="reu-nueva-titulo">Título</label>
            <input
              id="reu-nueva-titulo"
              type="text"
              autoFocus
              value={titulo}
              placeholder="Reunión semanal del club"
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="mkt-form-fila-react">
            <div className="field-group-react">
              <label htmlFor="reu-nueva-fecha">Fecha</label>
              <input id="reu-nueva-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="field-group-react">
              <label htmlFor="reu-nueva-hora">Hora</label>
              <input id="reu-nueva-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div className="field-group-react">
              <label htmlFor="reu-nueva-ambito">De quién es</label>
              <select
                id="reu-nueva-ambito"
                value={ambito}
                onChange={(e) => setAmbito(e.target.value as Ambito)}
              >
                <option value="club">Todo el club</option>
                {esDirectiva ? <option value="directiva">Directiva</option> : null}
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {DEPTO_LABEL[t]}
                  </option>
                ))}
              </select>
              {ambito === "directiva" ? (
                <label className="crm-tag crm-tag-check-react">
                  <input
                    type="checkbox"
                    className="crm-check"
                    checked={soloDirectiva}
                    onChange={(e) => setSoloDirectiva(e.target.checked)}
                  />
                  Solo la ve la directiva
                </label>
              ) : null}
            </div>
          </div>
          <p className="mkt-meta-react">
            Nace con un acta de plantilla (orden del día, acuerdos, tareas) que puedes cambiar como
            quieras.
          </p>
          <button type="submit" className="mkt-btn-react" disabled={!titulo.trim()}>
            Crear reunión
          </button>
        </form>
      ) : null}

      {reuniones.length === 0 ? (
        <p className="mkt-vacio-react">Sin reuniones apuntadas todavía.</p>
      ) : (
        <>
          {proximas.length > 0 ? (
            <>
              <h4 className="mkt-grupo-titulo-react">Próximas</h4>
              <ul className="mkt-campaigns-react">{proximas.map(tarjeta)}</ul>
            </>
          ) : null}
          {pasadas.length > 0 ? (
            <>
              <h4 className="mkt-grupo-titulo-react">Pasadas</h4>
              <ul className="mkt-campaigns-react">{pasadas.map(tarjeta)}</ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
