import { FormEvent, useState } from "react";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Acceso equipo</CardTitle>
        <CardDescription>
          Inicia sesión con tu cuenta de equipo para ver tu panel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <p className="mb-4 text-sm font-medium text-destructive">{errorMessage}</p>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipo-email">Email</Label>
            <Input
              type="email"
              id="equipo-email"
              name="email"
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
              placeholder="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
