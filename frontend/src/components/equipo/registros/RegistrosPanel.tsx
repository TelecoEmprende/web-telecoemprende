import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useApi } from "../DeptoApi";
import { AlertBanner } from "../../feedback/AlertBanner";
import { Esqueleto } from "../../feedback/Esqueleto";
import { SelectorMiembros } from "../marketing/SelectorMiembros";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiFailure } from "../../../types/api";
import {
  listaDe,
  textoDe,
  type CampoSpec,
  type Recurso,
  type Registro,
} from "../../../types/registros";

type Props = {
  recurso: Recurso;
  titulo: string;
  /** Una línea explicando para qué sirve la pestaña. */
  descripcion: string;
  vacio: string;
  campos: readonly CampoSpec[];
  etiquetaNuevo: string;
  /** Cómo se resume una fila en el listado. */
  fila: (registro: Registro) => {
    titulo: string;
    meta?: ReactNode;
    badges?: ReactNode;
    derecha?: ReactNode;
    cuerpo?: ReactNode;
  };
  /** Bloque opcional encima del listado (los totales del presupuesto). */
  cabecera?: (registros: Registro[], recargar: () => void) => ReactNode;
};

function valorInicial(campo: CampoSpec, registro: Registro | null): string {
  if (registro === null) {
    if (campo.tipo === "opcion") return campo.opciones?.[0]?.valor ?? "";
    return "";
  }
  if (campo.tipo === "lista" || campo.tipo === "miembros") {
    return listaDe(registro, campo.clave).join("\n");
  }
  if (campo.tipo === "check") return registro[campo.clave] ? "si" : "";
  return textoDe(registro, campo.clave);
}

/**
 * El listado y el formulario de una entidad del workspace.
 *
 * Recursos, presupuesto, anuncios, reuniones y alumni son la misma pantalla
 * con campos distintos: un listado, un botón de nuevo, un diálogo para crear y
 * editar, y borrar con confirmación. Se describen con `campos` en vez de
 * escribirse cinco veces, que es lo mismo que hace el backend con `Tabla`.
 */
export function RegistrosPanel({
  recurso,
  titulo,
  descripcion,
  vacio,
  campos,
  etiquetaNuevo,
  fila,
  cabecera,
}: Props) {
  const { listarRegistros, crearRegistro, actualizarRegistro, eliminarRegistro } = useApi();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Registro | null>(null);
  const [creando, setCreando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await listarRegistros(recurso);
      setRegistros(respuesta[recurso] ?? []);
      setError(null);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo cargar la lista.");
    } finally {
      setIsLoading(false);
    }
  }, [listarRegistros, recurso]);

  useEffect(() => {
    setIsLoading(true);
    void cargar();
  }, [cargar]);

  async function borrar(id: number) {
    try {
      await eliminarRegistro(recurso, id);
      setPorBorrar(null);
      await cargar();
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo eliminar.");
    }
  }

  const abierto = creando || editando !== null;

  if (isLoading) return <Esqueleto filas={4} alto={64} />;

  return (
    <section className="mkt-panel-react">
      {error ? <AlertBanner variant="error" message={error} /> : null}

      <header className="mkt-panel-header-react">
        <div>
          <h3>{titulo}</h3>
          <p className="mkt-meta-react">{descripcion}</p>
        </div>
        <button
          type="button"
          className="mkt-btn-mini-react"
          onClick={() => setCreando(true)}
        >
          <Plus aria-hidden="true" /> {etiquetaNuevo}
        </button>
      </header>

      {cabecera ? cabecera(registros, () => void cargar()) : null}

      {registros.length === 0 ? (
        <p className="mkt-vacio-react">{vacio}</p>
      ) : (
        <ul className="reg-lista-react">
          {registros.map((registro) => {
            const resumen = fila(registro);
            return (
              <li key={registro.id} className="reg-item-react">
                <div className="reg-item-cabecera-react">
                  <div className="reg-item-texto-react">
                    <p className="reg-item-titulo-react">{resumen.titulo}</p>
                    {resumen.meta ? (
                      <p className="mkt-meta-react">{resumen.meta}</p>
                    ) : null}
                    {resumen.badges}
                  </div>

                  {resumen.derecha ? (
                    <div className="reg-item-derecha-react">{resumen.derecha}</div>
                  ) : null}

                  <div className="reg-item-acciones-react">
                    <button
                      type="button"
                      className="mkt-btn-mini-react"
                      onClick={() => setEditando(registro)}
                      aria-label={`Editar ${resumen.titulo}`}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="mkt-btn-mini-peligro-react"
                      onClick={() => setPorBorrar(registro.id)}
                      aria-label={`Eliminar ${resumen.titulo}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {resumen.cuerpo ? (
                  <div className="reg-item-cuerpo-react">{resumen.cuerpo}</div>
                ) : null}

                {porBorrar === registro.id ? (
                  // En la propia fila y no en un window.confirm, que bloquea
                  // la pestaña y se ve como un aviso del navegador.
                  <p className="reg-confirmar-react">
                    ¿Eliminar «{resumen.titulo}»?{" "}
                    <button
                      type="button"
                      className="mkt-btn-mini-peligro-react"
                      onClick={() => void borrar(registro.id)}
                    >
                      Sí, eliminar
                    </button>{" "}
                    <button
                      type="button"
                      className="mkt-btn-mini-react"
                      onClick={() => setPorBorrar(null)}
                    >
                      Cancelar
                    </button>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {abierto ? (
        <RegistroDialog
          campos={campos}
          registro={editando}
          titulo={editando ? "Editar" : etiquetaNuevo}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={async (datos) => {
            if (editando) await actualizarRegistro(recurso, editando.id, datos);
            else await crearRegistro(recurso, datos);
            setCreando(false);
            setEditando(null);
            await cargar();
          }}
        />
      ) : null}
    </section>
  );
}

type DialogProps = {
  campos: readonly CampoSpec[];
  registro: Registro | null;
  titulo: string;
  onCerrar: () => void;
  onGuardar: (datos: Record<string, unknown>) => Promise<void>;
};

function RegistroDialog({ campos, registro, titulo, onCerrar, onGuardar }: DialogProps) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.clave, valorInicial(c, registro)])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(clave: string, valor: string) {
    setValores((previos) => ({ ...previos, [clave]: valor }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setIsSaving(true);
    setError(null);

    const datos: Record<string, unknown> = {};
    for (const campo of campos) {
      const bruto = valores[campo.clave] ?? "";
      if (campo.tipo === "lista" || campo.tipo === "miembros") {
        datos[campo.clave] = bruto
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
      } else if (campo.tipo === "check") {
        datos[campo.clave] = bruto === "si";
      } else {
        datos[campo.clave] = bruto;
      }
    }

    try {
      await onGuardar(datos);
    } catch (err) {
      setError((err as ApiFailure)?.message || "No se pudo guardar.");
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="mkt-dialogo-react">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {registro ? "Cambia lo que necesites y guarda." : "Rellena los datos."}
          </DialogDescription>
        </DialogHeader>

        {error ? <AlertBanner variant="error" message={error} /> : null}

        <form className="mkt-form-react mkt-form-dialogo-react" onSubmit={enviar}>
          {campos.map((campo) => {
            const id = `reg-${campo.clave}`;
            return (
              <div className="field-group-react" key={campo.clave}>
                {campo.tipo === "check" ? (
                  <label className="reg-check-react" htmlFor={id}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={valores[campo.clave] === "si"}
                      onChange={(e) => set(campo.clave, e.target.checked ? "si" : "")}
                    />
                    {campo.etiqueta}
                  </label>
                ) : (
                  <>
                    <label htmlFor={id}>{campo.etiqueta}</label>
                    {campo.tipo === "miembros" ? (
                      <SelectorMiembros
                        id={id}
                        seleccionados={
                          valores[campo.clave] ? valores[campo.clave].split("\n").filter(Boolean) : []
                        }
                        onCambiar={(emails) => set(campo.clave, emails.join("\n"))}
                      />
                    ) : campo.tipo === "parrafo" || campo.tipo === "lista" ? (
                      <textarea
                        id={id}
                        rows={campo.tipo === "lista" ? 3 : 4}
                        value={valores[campo.clave] ?? ""}
                        required={campo.requerido}
                        onChange={(e) => set(campo.clave, e.target.value)}
                      />
                    ) : campo.tipo === "opcion" ? (
                      <select
                        id={id}
                        value={valores[campo.clave] ?? ""}
                        onChange={(e) => set(campo.clave, e.target.value)}
                      >
                        {campo.opciones?.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.etiqueta}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={
                          campo.tipo === "fecha"
                            ? "date"
                            : campo.tipo === "hora"
                              ? "time"
                              : campo.tipo === "url"
                                ? "url"
                                : campo.tipo === "importe"
                                  ? "number"
                                  : "text"
                        }
                        step={campo.tipo === "importe" ? "0.01" : undefined}
                        min={campo.tipo === "importe" ? "0" : undefined}
                        value={valores[campo.clave] ?? ""}
                        required={campo.requerido}
                        onChange={(e) => set(campo.clave, e.target.value)}
                      />
                    )}
                  </>
                )}
                {campo.ayuda ? <p className="mkt-meta-react">{campo.ayuda}</p> : null}
              </div>
            );
          })}

          <div className="mkt-ficha-acciones-react">
            <button type="submit" className="mkt-btn-mini-react" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="mkt-btn-mini-react" onClick={onCerrar}>
              Cancelar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
