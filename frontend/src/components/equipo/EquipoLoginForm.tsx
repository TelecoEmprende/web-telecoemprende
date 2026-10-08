import { ArrowRight, MailCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { FormEvent, useState } from "react";

import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export type ModoAcceso = "login" | "registro";

type EquipoLoginFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  onSubmit: (email: string, password: string, modo: ModoAcceso) => Promise<void>;
  /** Se llama al cambiar de modo, para que el padre limpie los mensajes. */
  onModeChange: () => void;
};

const MODOS: { id: ModoAcceso; label: string }[] = [
  { id: "login", label: "Entrar" },
  { id: "registro", label: "Crear cuenta" },
];

/**
 * La tarjeta de acceso a `/equipo`: entrar o crear cuenta, con un selector de
 * dos posiciones y la misma píldora que se desliza en el sidebar. Tras crear
 * la cuenta el formulario deja paso a un "cuenta creada": la persona no puede
 * entrar hasta que un admin le dé departamento, así que no tiene sentido
 * dejarle el botón de entrar delante.
 *
 * Input/Label son de shadcn (foco visible y `aria` ya resueltos); sus tokens
 * se re-encadenan en `.equipo-login-react` (`equipo.css`).
 */
export function EquipoLoginForm({
  isSubmitting,
  errorMessage,
  successMessage,
  onSubmit,
  onModeChange,
}: EquipoLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<ModoAcceso>("login");
  const menos = useReducedMotion();

  const esRegistro = modo === "registro";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password, modo);
  }

  function cambiarModo(siguiente: ModoAcceso) {
    if (siguiente === modo) return;
    setModo(siguiente);
    setPassword("");
    onModeChange();
  }

  if (esRegistro && successMessage) {
    return (
      <section className="equipo-login-react acceso-hecho-react" aria-live="polite">
        <span className="acceso-hecho-icono-react" aria-hidden="true">
          <MailCheck />
        </span>
        <h2>Cuenta creada</h2>
        <p>
          Un admin tiene que asignarte departamento antes de que puedas entrar. Cuando lo haga,
          entra con <strong>{email}</strong>.
        </p>
        <button type="button" className="acceso-boton-react" onClick={() => cambiarModo("login")}>
          Ir a entrar
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="equipo-login-react" aria-labelledby="acceso-titulo">
      <h2 id="acceso-titulo" className="sr-only">
        {esRegistro ? "Crear cuenta de equipo" : "Entrar al área del equipo"}
      </h2>

      <div className="acceso-modos-react" role="group" aria-label="Qué quieres hacer">
        {MODOS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={modo === id}
            className="acceso-modo-react"
            onClick={() => cambiarModo(id)}
          >
            {modo === id ? (
              <motion.span
                layoutId="acceso-modo-activo"
                className="acceso-modo-pildora-react"
                aria-hidden="true"
                transition={menos ? { duration: 0 } : SPRING_DEFAULT}
              />
            ) : null}
            <span className="acceso-modo-texto-react">{label}</span>
          </button>
        ))}
      </div>

      <p className="acceso-ayuda-react">
        {esRegistro
          ? "Con el correo que uses en el club. Un admin te asignará departamento antes de que puedas entrar."
          : "Con tu cuenta de equipo."}
      </p>

      {/* `role="alert"` para que un lector de pantalla anuncie el fallo: sin
          él, el mensaje aparece en silencio y el foco sigue en el botón. */}
      {errorMessage ? (
        <p className="equipo-login-error-react" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form className="acceso-form-react" onSubmit={handleSubmit}>
        <div className="acceso-campo-react">
          <Label htmlFor="equipo-email">Email</Label>
          <Input
            type="email"
            id="equipo-email"
            name="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="acceso-campo-react">
          <Label htmlFor="equipo-password">Contraseña</Label>
          <Input
            type="password"
            id="equipo-password"
            name="password"
            autoComplete={esRegistro ? "new-password" : "current-password"}
            minLength={esRegistro ? 8 : undefined}
            placeholder={esRegistro ? "Mínimo 8 caracteres" : "Tu contraseña"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="acceso-boton-react" disabled={isSubmitting}>
          {isSubmitting
            ? esRegistro
              ? "Creando..."
              : "Entrando..."
            : esRegistro
              ? "Crear cuenta"
              : "Entrar"}
          {isSubmitting ? null : <ArrowRight aria-hidden="true" />}
        </button>
      </form>
    </section>
  );
}
