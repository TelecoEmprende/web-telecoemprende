import { FormEvent, useState } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type EquipoLoginFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
};

/**
 * Acceso a `/equipo`.
 *
 * La tarjeta va en la paleta del área de trabajo (crema sobre el navy de la
 * página), no en la oscura de shadcn: ver `.equipo-login-react` en
 * `equipo.css`, que es donde se re-encadenan sus tokens. Input/Label/Button
 * siguen siendo de shadcn -- el foco visible y el `aria` ya están resueltos
 * ahí y no merece la pena reescribirlos.
 */
export function EquipoLoginForm({
  isSubmitting,
  errorMessage,
  onSubmit,
}: EquipoLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  return (
    <section className="equipo-login-react">
      <h1>Acceso equipo</h1>
      <p>Inicia sesión con tu cuenta de equipo para ver tu panel.</p>

      {/* `role="alert"` para que un lector de pantalla anuncie el fallo: sin
          él, el mensaje aparece en silencio y el foco sigue en el botón. */}
      {errorMessage ? (
        <p className="equipo-login-error-react" role="alert">
          {errorMessage}
        </p>
      ) : null}

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
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </section>
  );
}
