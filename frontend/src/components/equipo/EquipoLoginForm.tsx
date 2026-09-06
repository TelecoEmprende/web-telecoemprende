import { FormEvent, useState } from "react";

type EquipoLoginFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
};

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
    <div className="equipo-login-box-react">
      <h1>Acceso equipo</h1>
      <p>Inicia sesión con tu cuenta de equipo para ver tu panel.</p>

      {errorMessage ? <p className="equipo-login-error-react">{errorMessage}</p> : null}

      <form className="equipo-login-form-react" onSubmit={handleSubmit}>
        <div className="field-group-react">
          <label htmlFor="equipo-email">Email</label>
          <input
            type="email"
            id="equipo-email"
            name="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field-group-react">
          <label htmlFor="equipo-password">Contraseña</label>
          <input
            type="password"
            id="equipo-password"
            name="password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="submit-btn-react" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  );
}
