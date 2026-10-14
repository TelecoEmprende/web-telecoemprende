import { FormEvent, useEffect, useState } from "react";

import { cambiarPassword, getPerfil, guardarPerfil } from "../../../api/equipo";
import { AlertBanner } from "../../feedback/AlertBanner";
import type { ApiFailure } from "../../../types/api";

type Datos = { nombre: string; apellidos: string; dni: string; linkedin: string };

type Props = {
  /** Para que el directorio y la ficha enseñen ya el nombre corregido. */
  onGuardado: () => void;
};

/**
 * Los datos personales de quien tiene la sesión: nombre, apellidos, documento
 * y LinkedIn, y la contraseña. Cargo, departamentos y permisos no están aquí a
 * propósito: los pone un admin en Cuentas. El DNI solo lo ven su dueño y los
 * admins; ni el directorio ni la ficha de otra persona lo traen.
 */
export function MisDatos({ onGuardado }: Props) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [avisoClave, setAvisoClave] = useState<{ tipo: "success" | "error"; texto: string } | null>(
    null,
  );

  useEffect(() => {
    let activo = true;
    void getPerfil()
      .then((r) => {
        if (activo) setDatos({ nombre: r.nombre, apellidos: r.apellidos, dni: r.dni, linkedin: r.linkedin });
      })
      .catch((err: ApiFailure) => {
        if (activo) setAviso({ tipo: "error", texto: err?.message || "No se pudieron cargar tus datos." });
      });
    return () => {
      activo = false;
    };
  }, []);

  if (datos === null) {
    return aviso ? <AlertBanner variant="error" message={aviso.texto} /> : null;
  }

  function cambiar(campo: keyof Datos, valor: string) {
    setDatos((d) => (d ? { ...d, [campo]: valor } : d));
    setAviso(null);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!datos) return;
    setGuardando(true);
    setAviso(null);
    try {
      await guardarPerfil(datos);
      setAviso({ tipo: "success", texto: "Datos guardados." });
      onGuardado();
    } catch (err) {
      setAviso({ tipo: "error", texto: (err as ApiFailure)?.message || "No se pudieron guardar." });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarClave(event: FormEvent) {
    event.preventDefault();
    setCambiando(true);
    setAvisoClave(null);
    try {
      await cambiarPassword(actual, nueva);
      setActual("");
      setNueva("");
      setAvisoClave({ tipo: "success", texto: "Contraseña cambiada." });
    } catch (err) {
      setAvisoClave({
        tipo: "error",
        texto: (err as ApiFailure)?.message || "No se pudo cambiar la contraseña.",
      });
    } finally {
      setCambiando(false);
    }
  }

  return (
    <section className="mkt-ficha-bloque-react">
      <h4>Mis datos</h4>
      <form className="mkt-misdatos-react" onSubmit={guardar}>
        <div className="field-group-react">
          <label htmlFor="md-nombre">Nombre</label>
          <input
            id="md-nombre"
            value={datos.nombre}
            maxLength={80}
            required
            onChange={(e) => cambiar("nombre", e.target.value)}
          />
        </div>
        <div className="field-group-react">
          <label htmlFor="md-apellidos">Apellidos</label>
          <input
            id="md-apellidos"
            value={datos.apellidos}
            maxLength={80}
            required
            onChange={(e) => cambiar("apellidos", e.target.value)}
          />
        </div>
        <div className="field-group-react">
          <label htmlFor="md-dni">DNI / NIE / pasaporte</label>
          <input
            id="md-dni"
            value={datos.dni}
            maxLength={20}
            onChange={(e) => cambiar("dni", e.target.value)}
          />
          <p className="mkt-meta-react">Solo lo ves tú y quienes administran la web.</p>
        </div>
        <div className="field-group-react">
          <label htmlFor="md-linkedin">LinkedIn</label>
          <input
            id="md-linkedin"
            type="url"
            value={datos.linkedin}
            placeholder="https://www.linkedin.com/in/..."
            onChange={(e) => cambiar("linkedin", e.target.value)}
          />
        </div>
        {aviso ? <AlertBanner variant={aviso.tipo} message={aviso.texto} /> : null}
        <div className="mkt-ficha-acciones-react">
          <button type="submit" className="mkt-btn-mini-react" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar mis datos"}
          </button>
        </div>
      </form>

      <h4 className="mkt-misdatos-titulo-react">Contraseña</h4>
      <form className="mkt-misdatos-react" onSubmit={cambiarClave}>
        <div className="field-group-react">
          <label htmlFor="md-actual">Contraseña actual</label>
          <input
            id="md-actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div className="field-group-react">
          <label htmlFor="md-nueva">Contraseña nueva</label>
          <input
            id="md-nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <p className="mkt-meta-react">Mínimo 8 caracteres.</p>
        </div>
        {avisoClave ? <AlertBanner variant={avisoClave.tipo} message={avisoClave.texto} /> : null}
        <div className="mkt-ficha-acciones-react">
          <button
            type="submit"
            className="mkt-btn-mini-react"
            disabled={cambiando || !actual || nueva.length < 8}
          >
            {cambiando ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}
