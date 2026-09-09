import { FormEvent, useState } from "react";

import { AlertBanner } from "../feedback/AlertBanner";
import { Button } from "../ui/button";
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

/**
 * Acceso a `/equipo`.
 *
 * La tarjeta va en la paleta del área de trabajo (crema sobre el navy de la
 * página), no en la oscura de shadcn: ver `.equipo-login-react` en
 * `equipo.css`, que es donde se re-encadenan sus tokens. Input/Label/Button
 * siguen siendo de shadcn -- el foco visible y el `aria` ya están resueltos
 * ahí y no merece la pena reescribirlos.
 *
 * ponytail: el modo "registro" es temporal, mientras el equipo se da de alta.
 * Para quitarlo: borrar `modo`, el bloque del pie y la prop `onModeChange`, y
 * dejar `onSubmit` con dos argumentos.
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

  const esRegistro = modo === "registro";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password, modo);
  }

  function cambiarModo() {
    setModo(esRegistro ? "login" : "registro");
    setPassword("");
    onModeChange();
  }

  return (
    <section className="equipo-login-react">
      <h1>{esRegistro ? "Crear cuenta de equipo" : "Acceso equipo"}</h1>
      <p>
        {esRegistro
          ? "Crea tu cuenta con el correo que uses en el club. Un admin te asignará tu departamento antes de que puedas entrar."
          : "Inicia sesión con tu cuenta de equipo para ver tu panel."}
      </p>

      {/* `role="alert"` para que un lector de pantalla anuncie el fallo: sin
          él, el mensaje aparece en silencio y el foco sigue en el botón. */}
      {errorMessage ? (
        <p className="equipo-login-error-react" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? <AlertBanner variant="success" message={successMessage} /> : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipo-email">Email</Label>
          <Input
            type="email"
            id="equipo-email"
            name="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipo-password">Contraseña</Label>
          <Input
            type="password"
            id="equipo-password"
            name="password"
            autoComplete={esRegistro ? "new-password" : "current-password"}
            minLength={esRegistro ? 8 : undefined}
            placeholder={esRegistro ? "Mínimo 8 caracteres" : "Contraseña"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting
            ? esRegistro
              ? "Creando..."
              : "Entrando..."
            : esRegistro
              ? "Crear cuenta"
              : "Entrar"}
        </Button>
      </form>

      <Button type="button" variant="link" className="mt-3 px-0" onClick={cambiarModo}>
        {esRegistro ? "Ya tengo cuenta" : "No tengo cuenta todavía"}
      </Button>
    </section>
  );
}
