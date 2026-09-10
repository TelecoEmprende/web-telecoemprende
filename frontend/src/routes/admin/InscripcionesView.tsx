import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { enviarNotificaciones, getAdminRegistrations } from "../../api/admin";
import { AdminStats } from "../../components/admin/AdminStats";
import { AdminToolbar } from "../../components/admin/AdminToolbar";
import { EstadoTabs, type EstadoFiltro } from "../../components/admin/EstadoTabs";
import { RecordsTable } from "../../components/admin/RecordsTable";
import { Button } from "../../components/ui/button";
import type { Registro } from "../../types/admin";
import { useAdmin } from "./AdminLayout";

const ESTADOS: EstadoFiltro[] = ["todos", "pendiente", "aceptado", "rechazado", "waitlist"];

/** Minúsculas y sin tildes, para que "Nunez" encuentre a "Núñez". */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function coincide(registro: Registro, busqueda: string) {
  const campos = [
    registro.nombre,
    registro.apellidos,
    registro.email,
    registro.escuela,
    registro.estudios,
    registro.departamento,
  ];
  return campos.some((campo) => normalizar(campo ?? "").includes(busqueda));
}

export function InscripcionesView() {
  const { avisar, avisarError } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [eventos, setEventos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifying, setIsNotifying] = useState(false);

  // Los tres filtros viven en la URL: así /admin/inscripciones?estado=pendiente
  // se puede recargar, compartir y volver atrás con el botón del navegador.
  const evento = params.get("evento") ?? "";
  const busqueda = normalizar(params.get("q") ?? "");
  const estadoParam = params.get("estado") ?? "todos";
  const estado = (ESTADOS as string[]).includes(estadoParam)
    ? (estadoParam as EstadoFiltro)
    : "todos";

  function setFiltro(cambios: Record<string, string>) {
    const siguiente = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
    }
    // replace: escribir en el buscador no debe dejar una entrada de historial
    // por cada tecla.
    setParams(siguiente, { replace: true });
  }

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAdminRegistrations(evento || undefined);
      if (response.ok) {
        setRegistros(response.registros ?? []);
        setEventos(response.eventos ?? []);
      }
    } catch (error) {
      avisarError(error, "No se pudieron cargar las inscripciones.");
    } finally {
      setIsLoading(false);
    }
  }, [evento, avisarError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const encontrados = useMemo(
    () => (busqueda ? registros.filter((r) => coincide(r, busqueda)) : registros),
    [registros, busqueda],
  );

  const visibles = useMemo(
    () => (estado === "todos" ? encontrados : encontrados.filter((r) => r.estado === estado)),
    [encontrados, estado],
  );

  // Los emails de lo que se está viendo ahora mismo: el filtro es la
  // selección, así que "copiar" no necesita casillas por fila.
  const emails = useMemo(
    () => [...new Set(visibles.map((r) => r.email).filter(Boolean))],
    [visibles],
  );

  async function copiarEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      avisar("success", `${emails.length} emails copiados al portapapeles.`);
    } catch {
      avisar("error", "El navegador no ha dejado copiar al portapapeles.");
    }
  }

  const pendientesNotificar =
    estado === "todos" || estado === "pendiente"
      ? 0
      : visibles.filter((r) => !r.notificado).length;

  async function handleNotificar() {
    if (estado === "todos" || estado === "pendiente") return;

    setIsNotifying(true);
    try {
      const response = await enviarNotificaciones(estado);
      if (response.ok) {
        avisar("success", `${response.enviados} de ${response.total} emails enviados.`);
        await cargar();
      }
    } catch (error) {
      avisarError(error, "No se pudieron enviar las notificaciones.");
    } finally {
      setIsNotifying(false);
    }
  }

  return (
    <>
      <AdminToolbar
        total={registros.length}
        mostrados={visibles.length}
        eventos={eventos}
        eventoActivo={evento}
        busqueda={params.get("q") ?? ""}
        emails={emails.length}
        onBusquedaChange={(q) => setFiltro({ q })}
        onCopiarEmails={() => void copiarEmails()}
        onEventoChange={(ev) => setFiltro({ evento: ev, estado: "" })}
      />

      {isLoading ? (
        <div className="section-card admin-placeholder">
          <p className="eyebrow">Cargando</p>
          <h1>Obteniendo inscripciones...</h1>
        </div>
      ) : (
        <>
          <AdminStats registros={encontrados} />

          <EstadoTabs
            registros={encontrados}
            estadoActivo={estado}
            onEstadoChange={(e) => setFiltro({ estado: e === "todos" ? "" : e })}
          />

          {estado !== "todos" && estado !== "pendiente" ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[var(--color-paper-line)] bg-[var(--color-paper)] px-[18px] py-3.5">
              <p className="text-[0.92rem] text-muted-foreground">
                <strong>{pendientesNotificar}</strong> pendientes de enviar en esta pestaña.
                Reclasificar a alguien vuelve a dejarlo pendiente de un nuevo envío.
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 px-[18px] font-bold max-[720px]:w-full"
                disabled={isNotifying || pendientesNotificar === 0}
                onClick={() => void handleNotificar()}
              >
                {isNotifying ? "Enviando..." : "Enviar notificaciones"}
              </Button>
            </div>
          ) : null}

          <RecordsTable
            registros={visibles}
            onUpdate={(id, data) =>
              setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)))
            }
            onDelete={(id) => setRegistros((prev) => prev.filter((r) => r.id !== id))}
            onEstadoChange={(id, nuevo) =>
              setRegistros((prev) =>
                prev.map((r) => (r.id === id ? { ...r, estado: nuevo, notificado: false } : r)),
              )
            }
          />
        </>
      )}
    </>
  );
}
