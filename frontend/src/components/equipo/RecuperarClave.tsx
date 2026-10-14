import { ArrowRight, MailCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import { cambiarPassword, olvideClave, restablecerClave } from "../../api/equipo";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { ApiFailure } from "../../types/api";

/** Estados de un formulario de una sola acción. */
type Estado = { enviando: boolean; error: string | null };

function useAccion() {
  const [estado, setEstado] = useState<Estado>({ enviando: false, error: null });
  async function ejecutar(accion: () => Promise<void>, porDefecto: string) {
    setEstado({ enviando: true, error: null });
    try {
      await accion();
      setEstado({ enviando: false, error: null });
      return true;
    } catch (err) {
      setEstado({ enviando: false, error: (err as ApiFailure)?.message || porDefecto });
      return false;
    }
  }
  return { ...estado, ejecutar };
}

/**
 * «¿Olvidaste tu contraseña?»: pide el enlace por correo. La respuesta es
 * siempre la misma, exista o no la cuenta, así que aquí tampoco se dice nada
 * más. Si el correo no llega, un admin puede poner una contraseña provisional
 * desde Cuentas del equipo.
 */
export function PedirEnlaceClave({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const ok = await ejecutar(async () => {
      await olvideClave(email);
    }, "No se pudo pedir el enlace.");
    if (ok) setEnviado(true);
  }

  if (enviado) {
    return (
      <section className="equipo-login-react acceso-hecho-react" aria-live="polite">
        <span className="acceso-hecho-icono-react" aria-hidden="true">
          <MailCheck />
        </span>
        <h2>Revisa tu correo</h2>
        <p>
          Si hay una cuenta con <strong>{email}</strong>, te hemos enviado un enlace para elegir
          otra contraseña. Vale una hora. Si no te llega, pídele a un admin una contraseña
          provisional.
        </p>
        <button type="button" className="acceso-boton-react" onClick={onVolver}>
          Volver a entrar
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="equipo-login-react" aria-labelledby="recuperar-titulo">
      <h2 id="recuperar-titulo" className="acceso-subtitulo-react">
        Recuperar la contraseña
      </h2>
      <p className="acceso-ayuda-react">
        Escribe el correo de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
      </p>
      {error ? (
        <p className="equipo-login-error-react" role="alert">
          {error}
        </p>
      ) : null}
      <form className="acceso-form-react" onSubmit={enviar}>
        <div className="acceso-campo-react">
          <Label htmlFor="recuperar-email">Email</Label>
          <Input
            type="email"
            id="recuperar-email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="acceso-boton-react" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviarme el enlace"}
          {enviando ? null : <ArrowRight aria-hidden="true" />}
        </button>
        <button type="button" className="acceso-enlace-react" onClick={onVolver}>
          Volver a entrar
        </button>
      </form>
    </section>
  );
}

/** Elegir contraseña nueva con el enlace del correo (`/equipo?recuperar=…`). */
export function ElegirClaveNueva({ token, onHecho }: { token: string; onHecho: () => void }) {
  const [nueva, setNueva] = useState("");
  const [hecho, setHecho] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const ok = await ejecutar(async () => {
      await restablecerClave(token, nueva);
    }, "No se pudo cambiar la contraseña.");
    if (ok) setHecho(true);
  }

  if (hecho) {
    return (
      <section className="equipo-login-react acceso-hecho-react" aria-live="polite">
        <span className="acceso-hecho-icono-react" aria-hidden="true">
          <MailCheck />
        </span>
        <h2>Contraseña cambiada</h2>
        <p>Ya puedes entrar con la nueva.</p>
        <button type="button" className="acceso-boton-react" onClick={onHecho}>
          Ir a entrar
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="equipo-login-react" aria-labelledby="nueva-clave-titulo">
      <h2 id="nueva-clave-titulo" className="acceso-subtitulo-react">
        Elige una contraseña nueva
      </h2>
      {error ? (
        <p className="equipo-login-error-react" role="alert">
          {error}
        </p>
      ) : null}
      <form className="acceso-form-react" onSubmit={enviar}>
        <div className="acceso-campo-react">
          <Label htmlFor="nueva-clave">Contraseña nueva</Label>
          <Input
            type="password"
            id="nueva-clave"
            autoComplete="new-password"
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            required
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <button type="submit" className="acceso-boton-react" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar contraseña"}
          {enviando ? null : <ArrowRight aria-hidden="true" />}
        </button>
        <button type="button" className="acceso-enlace-react" onClick={onHecho}>
          Volver a entrar
        </button>
      </form>
    </section>
  );
}

/**
 * Cuando un admin ha puesto la contraseña (provisional o al crear la cuenta),
 * hay que cambiarla antes de seguir: se pide la que acaba de usarse y la nueva.
 */
export function CambiarClaveObligatorio({ onHecho }: { onHecho: () => void }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const { enviando, error, ejecutar } = useAccion();

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const ok = await ejecutar(async () => {
      await cambiarPassword(actual, nueva);
    }, "No se pudo cambiar la contraseña.");
    if (ok) onHecho();
  }

  return (
    <section className="equipo-login-react" aria-labelledby="cambiar-clave-titulo">
      <h2 id="cambiar-clave-titulo" className="acceso-subtitulo-react">
        Elige tu contraseña
      </h2>
      <p className="acceso-ayuda-react">
        La que usaste para entrar la puso un admin. Elige una tuya antes de seguir.
      </p>
      {error ? (
        <p className="equipo-login-error-react" role="alert">
          {error}
        </p>
      ) : null}
      <form className="acceso-form-react" onSubmit={enviar}>
        <div className="acceso-campo-react">
          <Label htmlFor="cc-actual">La que acabas de usar</Label>
          <Input
            type="password"
            id="cc-actual"
            autoComplete="current-password"
            required
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div className="acceso-campo-react">
          <Label htmlFor="cc-nueva">Contraseña nueva</Label>
          <Input
            type="password"
            id="cc-nueva"
            autoComplete="new-password"
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            required
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <button type="submit" className="acceso-boton-react" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar y entrar"}
          {enviando ? null : <ArrowRight aria-hidden="true" />}
        </button>
      </form>
    </section>
  );
}
