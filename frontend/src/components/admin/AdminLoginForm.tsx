import { FormEvent, useState } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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
    <div className="max-w-[540px]">
      <h1 className="mb-2.5 text-[2rem] font-black tracking-[-0.04em] max-[720px]:text-[1.7rem]">
        Acceso al panel
      </h1>
      <p className="leading-[1.7] text-muted-foreground max-[720px]:text-[0.96rem]">
        Introduce la contraseña de administración para consultar las
        inscripciones.
      </p>

      <form className="mt-6 flex flex-col gap-4 max-[720px]:mt-[18px]" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            type="password"
            id="password"
            name="password"
            placeholder="Contraseña de administrador"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
          <span aria-hidden="true">→</span>
        </Button>
      </form>
    </div>
  );
}
