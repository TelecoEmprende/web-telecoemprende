import { useCallback, useEffect, useState } from "react";

import { CabeceraPanel } from "../CabeceraPanel";
import { Esqueleto } from "../../feedback/Esqueleto";
import { borrarParaSiempre, getPapelera, restaurar } from "../../../api/club";
import { AlertBanner } from "../../feedback/AlertBanner";
import { etiquetaDe } from "../marketing/Avatares";
import type { ApiFailure } from "../../../types/api";
import type { ElementoPapelera } from "../../../types/club";
import { haceCuanto } from "../../../types/marketing";

const TIPO: Record<ElementoPapelera["entidad"], string> = {
  proyecto: "Proyecto",
  entregable: "Entregable",
  tarea: "Tarea",
  nota: "Nota",
  reunion: "Reunión",
};

/**
 * Lo borrado de Proyectos, Tareas y Notas: se queda aquí 30 días y cualquiera
 * puede restaurarlo (un proyecto vuelve con sus entregables y tareas). Solo un
 * admin lo borra para siempre antes de tiempo.
 */
export function PapeleraPanel({ esAdmin }: { esAdmin: boolean }) {
  const [elementos, setElementos] = useState<ElementoPapelera[] | null>(null);
  const [dias, setDias] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getPapelera();
      setElementos(r.elementos);
      setDias(r.dias);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar la papelera.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function accion(e: ElementoPapelera, tipo: "restaurar" | "borrar") {
    const clave = `${e.entidad}:${e.id}`;
    setOcupado(clave);
    setError(null);
    setAviso(null);
    try {
      if (tipo === "restaurar") {
        await restaurar(e.entidad, e.id);
        setAviso(`«${e.titulo}» ha vuelto.`);
      } else {
        await borrarParaSiempre(e.entidad, e.id);
        setAviso(`«${e.titulo}» se ha borrado para siempre.`);
      }
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo completar la acción.");
    } finally {
      setOcupado(null);
    }
  }

  if (elementos === null) return error ? <AlertBanner variant="error" message={error} /> : <Esqueleto filas={4} />;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}
      {aviso ? <AlertBanner variant="success" message={aviso} /> : null}

      <CabeceraPanel
        descripcion={`Lo que se borra de Proyectos, Tareas y Notas se queda aquí ${dias} días, y cualquiera puede devolverlo. Un proyecto vuelve con sus entregables y tareas. Pasado ese tiempo se borra solo.`}
      />

      {elementos.length === 0 ? (
        <p className="mkt-vacio-react">La papelera está vacía.</p>
      ) : (
        <ul className="papelera-lista-react crm-c">
          {elementos.map((e) => {
            const clave = `${e.entidad}:${e.id}`;
            return (
              <li key={clave}>
                <span className="papelera-tipo-react">{TIPO[e.entidad]}</span>
                <span className="papelera-textos-react">
                  <strong>{e.titulo || "Sin título"}</strong>
                  <em>
                    {e.padre ? `De «${e.padre}» · ` : ""}
                    {e.borrado_por ? `Lo borró ${etiquetaDe(e.borrado_por, e.borrado_por_nombre)} ` : "Borrado "}
                    {haceCuanto(e.borrado_en)}
                  </em>
                </span>
                <span className="papelera-acciones-react">
                  <button
                    type="button"
                    className="mkt-btn-mini-react"
                    disabled={ocupado === clave}
                    onClick={() => void accion(e, "restaurar")}
                  >
                    Restaurar
                  </button>
                  {esAdmin ? (
                    <button
                      type="button"
                      className="mkt-btn-mini-peligro-react"
                      disabled={ocupado === clave}
                      onClick={() => void accion(e, "borrar")}
                    >
                      Borrar para siempre
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
