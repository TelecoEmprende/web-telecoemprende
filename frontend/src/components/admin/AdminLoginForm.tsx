import { FormEvent, useState } from "react";

type AdminLoginFormProps = {
  isSubmitting: boolean;
  onSubmit: (password: string) => Promise<void>;
};

export function AdminLoginForm({
  isSubmitting,
  onSubmit,
}: AdminLoginFormProps) {
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(password);
  }

  return (
    <div className="admin-login-box-react">
      <h1>Acceso al panel</h1>
      <p>
        Introduce la contrasena de administracion para consultar las
        inscripciones.
      </p>

      <form className="admin-login-form-react" onSubmit={handleSubmit}>
        <div className="field-group-react">
          <label htmlFor="password">Contrasena</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Contrasena de administrador"
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
