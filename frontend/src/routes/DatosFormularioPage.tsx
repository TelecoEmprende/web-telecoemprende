import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import {
  getDatosFormulario,
  guardarDatosFormulario,
  loginEquipo,
  registrarEquipo,
  type DatosFormulario,
} from "../api/equipo";
import { EquipoLoginForm, type ModoAcceso } from "../components/equipo/EquipoLoginForm";
import { AlertBanner } from "../components/feedback/AlertBanner";
import { Header } from "../components/layout/Header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { ApiFailure } from "../types/api";
import { aAvatarCuadrado } from "../utils/imagen";

const VACIO: DatosFormulario = { nombre: "", apellidos: "", dni: "", correo: "", foto: "" };

/**
 * `/equipo/datosformulario`: cada miembro rellena sus propios datos (nombre,
 * apellidos, documento, correo y foto). Admin los descarga en Excel desde
 * /admin/equipo. Sin sesión pide login con el mismo formulario que /equipo.
 */
export function DatosFormularioPage() {
  const [estado, setEstado] = useState<"cargando" | "login" | "listo">("cargando");
  const [datos, setDatos] = useState<DatosFormulario>(VACIO);
  // Solo si la persona elige una foto nueva; si no, el backend conserva la guardada.
  const [fotoNueva, setFotoNueva] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function cargar() {
    try {
      const r = await getDatosFormulario();
      setDatos({ ...r, correo: r.correo || r.email });
      setEstado("listo");
    } catch {
      setEstado("login");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function handleLogin(email: string, password: string, modo: ModoAcceso) {
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      if (modo === "registro") {
        const r = await registrarEquipo(email, password);
        setExito(r.message ?? "Cuenta creada.");
        return;
      }
      await loginEquipo(email, password);
      await cargar();
    } catch (e) {
      setError((e as ApiFailure).message || "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  }

  async function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    try {
      setFotoNueva(await aAvatarCuadrado(archivo));
    } catch {
      setError("No se ha podido leer la imagen. Prueba con otra.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fotoNueva && !datos.foto) {
      setError("Sube una foto.");
      return;
    }
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      const { nombre, apellidos, dni, correo } = datos;
      const r = await guardarDatosFormulario({
        nombre, apellidos, dni, correo, ...(fotoNueva ? { foto: fotoNueva } : {}),
      });
      setExito(r.message ?? "Datos guardados.");
    } catch (e) {
      setError((e as ApiFailure).message || "No se han podido guardar los datos.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = (clave: keyof DatosFormulario) => ({
    id: `datos-${clave}`,
    name: clave,
    required: true,
    value: datos[clave],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDatos((d) => ({ ...d, [clave]: event.target.value })),
  });

  const fotoVista = fotoNueva ?? datos.foto;

  return (
    <div className="shadcn-scope dark equipo-shell-react bg-background font-sans text-foreground">
      <Header teamMode />
      <main className="equipo-content-react">
        {estado === "cargando" ? (
          <p className="text-center text-muted-foreground">Comprobando sesión...</p>
        ) : estado === "login" ? (
          <EquipoLoginForm
            isSubmitting={enviando}
            errorMessage={error}
            successMessage={exito}
            onSubmit={handleLogin}
            onModeChange={() => {
              setError(null);
              setExito(null);
            }}
          />
        ) : (
          <section className="equipo-login-react">
            <h1>Tus datos</h1>
            <p>Rellena tus datos para el registro de miembros del club.</p>

            {error ? (
              <p className="equipo-login-error-react" role="alert">
                {error}
              </p>
            ) : null}
            {exito ? <AlertBanner variant="success" message={exito} /> : null}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datos-nombre">Nombre</Label>
                <Input {...campo("nombre")} autoComplete="given-name" maxLength={80} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datos-apellidos">Apellidos</Label>
                <Input {...campo("apellidos")} autoComplete="family-name" maxLength={80} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datos-dni">DNI / NIE / Pasaporte</Label>
                <Input {...campo("dni")} maxLength={20} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datos-correo">Correo (personal o UPM)</Label>
                <Input {...campo("correo")} type="email" autoComplete="email" maxLength={120} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datos-foto">Foto</Label>
                {fotoVista ? (
                  <img src={fotoVista} alt="Tu foto actual" width={72} height={72} className="rounded-full" />
                ) : null}
                <Input
                  id="datos-foto"
                  name="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void elegirFoto(event.target.files?.[0])}
                />
              </div>

              <Button type="submit" disabled={enviando} className="mt-2">
                {enviando ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
