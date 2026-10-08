import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Lock, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { motion } from "motion/react";

import { actualizarNota, crearNota, eliminarNota, listarNotas, obtenerNota } from "../../../api/notas";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { useEntradaDeFila } from "../../movimiento";
import { etiquetaDe } from "../marketing/Avatares";
import type { ApiFailure } from "../../../types/api";
import { DEPTO_LABEL, type Team } from "../../../types/equipo";
import type { Ambito, Nota, NotaResumen } from "../../../types/notas";
import { haceCuanto } from "../../../types/marketing";

const NotaEditor = lazy(() => import("./NotaEditor"));

type Filtro = "todas" | "club" | "privadas" | Team;

type Props = {
  email: string;
  teams: Team[];
  /** Nota que abrir al entrar (desde el Inicio). */
  notaInicial: number | null;
  onNotaAbierta: () => void;
};

/** Dónde vive la nota, como etiqueta corta. */
function ambitoDe(nota: { departamento: Ambito; privada: boolean }) {
  if (nota.privada) return "Privada";
  return nota.departamento ? DEPTO_LABEL[nota.departamento] : "Club";
}

/**
 * Notas: páginas libres tipo Notion, del club, de un departamento o
 * privadas. Lista a la izquierda, la página abierta a la derecha; en
 * pantallas estrechas, una cosa u otra.
 *
 * Se guarda sola (`GUARDADO_MS` después del último cambio): no hay botón de
 * guardar que olvidar.
 */
const GUARDADO_MS = 800;

export function NotasPanel({ email, teams, notaInicial, onNotaAbierta }: Props) {
  const entradaFila = useEntradaDeFila();
  const [notas, setNotas] = useState<NotaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<Nota | null>(null);
  const [estadoGuardado, setEstadoGuardado] = useState<"guardado" | "guardando" | "pendiente">("guardado");
  const [porBorrar, setPorBorrar] = useState(false);

  const pendiente = useRef<Partial<Nota>>({});
  const temporizador = useRef<number | undefined>(undefined);

  const cargar = useCallback(async () => {
    try {
      const r = await listarNotas();
      setNotas(r.ok ? r.notas : []);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudieron cargar las notas.");
    } finally {
      setCargando(false);
    }
  }, []);

  async function guardarYa() {
    window.clearTimeout(temporizador.current);
    const cambios = pendiente.current;
    pendiente.current = {};
    if (!abierta || Object.keys(cambios).length === 0) return;
    setEstadoGuardado("guardando");
    try {
      await actualizarNota(abierta.id, cambios);
      setEstadoGuardado("guardado");
      void cargar();
    } catch (err) {
      setEstadoGuardado("pendiente");
      setError((err as ApiFailure)?.message || "No se pudo guardar la nota.");
    }
  }

  function cambiar(cambios: Partial<Nota>) {
    if (!abierta) return;
    pendiente.current = { ...pendiente.current, ...cambios };
    if (!("contenido" in cambios)) setAbierta({ ...abierta, ...cambios });
    setEstadoGuardado("pendiente");
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarYa(), GUARDADO_MS);
  }

  async function abrir(id: number) {
    await guardarYa();
    setPorBorrar(false);
    try {
      const r = await obtenerNota(id);
      if (r.ok) {
        setAbierta(r.nota);
      }
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo abrir la nota.");
    }
  }

  useEffect(() => {
    void cargar();
    return () => window.clearTimeout(temporizador.current);
  }, [cargar]);

  useEffect(() => {
    if (notaInicial === null) return;
    void abrir(notaInicial);
    onNotaAbierta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notaInicial]);

  // Lo que quede sin guardar al salir de la sección no se pierde.
  const abiertaRef = useRef(abierta);
  abiertaRef.current = abierta;
  useEffect(
    () => () => {
      const cambios = pendiente.current;
      if (abiertaRef.current && Object.keys(cambios).length > 0) {
        void actualizarNota(abiertaRef.current.id, cambios);
      }
    },
    [],
  );

  async function nueva() {
    await guardarYa();
    const departamento: Ambito = filtro !== "todas" && filtro !== "club" && filtro !== "privadas" ? filtro : "";
    try {
      const r = await crearNota({ titulo: "", departamento, privada: filtro === "privadas" });
      if (r.ok) {
        setAbierta(r.nota);
        await cargar();
      }
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo crear la nota.");
    }
  }

  async function borrar() {
    if (!abierta) return;
    window.clearTimeout(temporizador.current);
    pendiente.current = {};
    try {
      await eliminarNota(abierta.id);
      setAbierta(null);
      setPorBorrar(false);
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo borrar la nota.");
    }
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtro === "club" && (n.departamento || n.privada)) return false;
      if (filtro === "privadas" && !n.privada) return false;
      if (filtro !== "todas" && filtro !== "club" && filtro !== "privadas" && (n.departamento !== filtro || n.privada)) {
        return false;
      }
      return !q || `${n.titulo} ${n.resumen}`.toLowerCase().includes(q);
    });
  }, [notas, filtro, busqueda]);

  const filtros: { id: Filtro; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "club", label: "Club" },
    ...teams.map((t) => ({ id: t as Filtro, label: DEPTO_LABEL[t] })),
    { id: "privadas", label: "Privadas" },
  ];

  const esAutora = abierta?.creado_por === email;
  const valorAmbito = abierta ? (abierta.privada ? "privada" : abierta.departamento || "club") : "club";

  function cambiarAmbito(valor: string) {
    if (valor === "privada") cambiar({ privada: true, departamento: "" });
    else cambiar({ privada: false, departamento: valor === "club" ? "" : (valor as Team) });
  }

  if (cargando) return <Esqueleto filas={5} alto={56} />;

  return (
    <section className={`notas-react${abierta ? " notas-con-abierta-react" : ""}`}>
      <aside className="notas-lista-react crm-c" aria-label="Notas">
        <div className="crm-cabecera-react">
          <p className="crm-k">{visibles.length} {visibles.length === 1 ? "nota" : "notas"}</p>
          <button type="button" className="crm-btn crm-btn-icono-react" onClick={() => void nueva()}>
            <Plus aria-hidden="true" /> Nueva
          </button>
        </div>
        <label className="notas-buscar-react">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar en notas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <div className="crm-tags-react" role="group" aria-label="Filtrar notas">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`crm-tag${filtro === f.id ? " crm-tag-azul-react" : ""}`}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="crm-s notas-vacio-react">
            {notas.length === 0
              ? "Todavía no hay notas. Crea la primera: un acta, una lluvia de ideas, la lista de lo que falta…"
              : "Nada coincide con el filtro."}
          </p>
        ) : (
          <ul className="notas-items-react">
            {visibles.map((n, i) => (
              <motion.li key={n.id} {...entradaFila(i)}>
                <button
                  type="button"
                  className={`notas-item-react${abierta?.id === n.id ? " notas-item-activa-react" : ""}`}
                  aria-current={abierta?.id === n.id ? "true" : undefined}
                  onClick={() => void abrir(n.id)}
                >
                  <span className="notas-item-titulo-react">
                    {n.fijada ? <Pin aria-label="Fijada" /> : null}
                    {n.privada ? <Lock aria-label="Privada" /> : null}
                    {n.titulo || "Sin título"}
                  </span>
                  {n.resumen ? <span className="crm-s notas-item-resumen-react">{n.resumen}</span> : null}
                  <span className="notas-item-meta-react">
                    <span>{ambitoDe(n)}</span>
                    <span>{haceCuanto(n.updated_at)}</span>
                    {n.checks_pendientes > 0 ? (
                      <span className="notas-item-checks-react">
                        {n.checks_pendientes} por hacer
                      </span>
                    ) : null}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </aside>

      <div className="notas-pagina-react crm-c">
        {error ? <AlertBanner variant="error" message={error} /> : null}

        {abierta === null ? (
          <div className="notas-placeholder-react">
            <p className="notas-placeholder-titulo-react">Elige una nota o empieza una nueva</p>
            <p className="crm-s">
              Escribe <kbd>/</kbd> dentro de una nota para insertar títulos, listas, casillas o citas.
              Las casillas sin marcar salen en el Inicio como pendientes.
            </p>
            <button type="button" className="crm-btn" onClick={() => void nueva()}>
              Nueva nota
            </button>
          </div>
        ) : (
          <>
            <div className="notas-barra-react">
              <button
                type="button"
                className="crm-btn crm-btn-ghost-react notas-volver-react"
                onClick={() => {
                  void guardarYa();
                  setAbierta(null);
                }}
              >
                <ArrowLeft aria-hidden="true" /> Notas
              </button>
              <select
                className="crm-select-react"
                aria-label="Quién la ve"
                value={valorAmbito}
                onChange={(e) => cambiarAmbito(e.target.value)}
                disabled={abierta.privada && !esAutora}
              >
                <option value="club">Club entero</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {DEPTO_LABEL[t]}
                  </option>
                ))}
                {esAutora ? <option value="privada">Solo yo</option> : null}
              </select>
              <button
                type="button"
                className="crm-btn crm-btn-ghost-react crm-btn-icono-react"
                aria-pressed={abierta.fijada}
                onClick={() => cambiar({ fijada: !abierta.fijada })}
              >
                {abierta.fijada ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                {abierta.fijada ? "Desfijar" : "Fijar"}
              </button>
              <span className="crm-s notas-guardado-react" role="status">
                {estadoGuardado === "guardando"
                  ? "Guardando…"
                  : estadoGuardado === "pendiente"
                    ? "Sin guardar"
                    : "Guardado"}
              </span>
              {porBorrar ? (
                <span className="crm-tags-react">
                  <button type="button" className="crm-btn crm-btn-peligro-react" onClick={() => void borrar()}>
                    Sí, borrar
                  </button>
                  <button type="button" className="crm-btn crm-btn-ghost-react" onClick={() => setPorBorrar(false)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="crm-btn crm-btn-ghost-react crm-btn-icono-react"
                  aria-label="Borrar nota"
                  onClick={() => setPorBorrar(true)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </div>

            <input
              className="notas-titulo-react"
              placeholder="Sin título"
              aria-label="Título de la nota"
              maxLength={160}
              value={abierta.titulo}
              onChange={(e) => cambiar({ titulo: e.target.value })}
            />
            <p className="crm-s notas-autoria-react">
              Creada por {etiquetaDe(abierta.creado_por, undefined)}
              {abierta.editado_por && abierta.editado_por !== abierta.creado_por
                ? ` · editada por ${etiquetaDe(abierta.editado_por, undefined)}`
                : ""}{" "}
              · {haceCuanto(abierta.updated_at)}
            </p>

            <div className="notas-editor-react">
              <Suspense fallback={<Esqueleto filas={4} alto={28} />}>
                <NotaEditor
                  key={abierta.id}
                  inicial={abierta.contenido}
                  editable
                  onCambio={(contenido) => cambiar({ contenido })}
                />
              </Suspense>
            </div>

          </>
        )}
      </div>
    </section>
  );
}
