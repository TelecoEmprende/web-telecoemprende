import { useEffect, useState } from "react";

import {
  enviarNotificaciones,
  getAdminRegistrations,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "../api/admin";
import { AlertBanner } from "../components/feedback/AlertBanner";
import { Header } from "../components/layout/Header";
import { AdminLoginForm } from "../components/admin/AdminLoginForm";
import { AdminStats } from "../components/admin/AdminStats";
import { AdminToolbar } from "../components/admin/AdminToolbar";
import { EstadoTabs, type EstadoFiltro } from "../components/admin/EstadoTabs";
import { RecordsTable } from "../components/admin/RecordsTable";
import type { ApiFailure } from "../types/api";
import type { Registro } from "../types/admin";

export function AdminPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [eventos, setEventos] = useState<string[]>([]);
  const [eventoActivo, setEventoActivo] = useState<string>("");
  const [estadoActivo, setEstadoActivo] = useState<EstadoFiltro>("todos");
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"info" | "success" | "error">(
    "info",
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const session = await getAdminSession();

        if (!active) {
          return;
        }

        if (!session.authenticated) {
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        await loadRegistrations("");
      } catch {
        if (active) {
          setMessageVariant("error");
          setMessage("No se pudo comprobar la sesión de administración.");
        }
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function loadRegistrations(evento: string) {
    setIsLoadingRecords(true);

    try {
      const response = await getAdminRegistrations(evento || undefined);

      if (response.ok) {
        setRegistros(response.registros ?? []);
        setEventos(response.eventos ?? []);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudieron cargar las inscripciones.");
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function handleEventoChange(evento: string) {
    setEventoActivo(evento);
    await loadRegistrations(evento);
  }

  async function handleLogin(password: string) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await loginAdmin(password);

      if (response.ok) {
        setIsAuthenticated(true);
        setMessageVariant("success");
        setMessage(response.message ?? "Sesión iniciada.");
        await loadRegistrations("");
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
      setIsCheckingSession(false);
    }
  }

  async function handleNotificar() {
    if (estadoActivo === "todos" || estadoActivo === "pendiente") return;

    setIsNotifying(true);
    try {
      const response = await enviarNotificaciones(estadoActivo);
      if (response.ok) {
        setMessageVariant("success");
        setMessage(`${response.enviados} de ${response.total} emails enviados.`);
        await loadRegistrations(eventoActivo);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudieron enviar las notificaciones.");
    } finally {
      setIsNotifying(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const response = await logoutAdmin();

      if (response.ok) {
        setIsAuthenticated(false);
        setRegistros([]);
        setEventos([]);
        setEventoActivo("");
        setEstadoActivo("todos");
        setMessageVariant("success");
        setMessage(response.message ?? "Sesión cerrada correctamente.");
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo cerrar la sesión.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="page-shell">
      <Header adminMode />
      <main className="page-content">
        <section className="admin-shell-react">
          <div className="container-react">
            <section className="admin-card-react">
              {message ? (
                <AlertBanner variant={messageVariant} message={message} />
              ) : null}

              {isCheckingSession ? (
                <div className="section-card admin-placeholder">
                  <p className="eyebrow">Cargando</p>
                  <h1>Comprobando sesión de administración...</h1>
                </div>
              ) : null}

              {!isCheckingSession && !isAuthenticated ? (
                <AdminLoginForm
                  isSubmitting={isSubmitting}
                  onSubmit={handleLogin}
                />
              ) : null}

              {!isCheckingSession && isAuthenticated ? (
                <>
                  <AdminToolbar
                    total={registros.length}
                    eventos={eventos}
                    eventoActivo={eventoActivo}
                    isLoggingOut={isLoggingOut}
                    onLogout={handleLogout}
                    onEventoChange={(e) => {
                      setEstadoActivo("todos");
                      void handleEventoChange(e);
                    }}
                  />

                  {isLoadingRecords ? null : <AdminStats registros={registros} />}

                  <EstadoTabs
                    registros={registros}
                    estadoActivo={estadoActivo}
                    onEstadoChange={setEstadoActivo}
                  />

                  {estadoActivo !== "todos" && estadoActivo !== "pendiente"
                    ? (() => {
                        const pendientesNotificar = registros.filter(
                          (r) => r.estado === estadoActivo && !r.notificado,
                        ).length;
                        return (
                          <div className="admin-notify-bar-react">
                            <p>
                              <strong>{pendientesNotificar}</strong> pendientes de enviar en esta
                              pestaña. Reclasificar a alguien vuelve a dejarlo pendiente de un nuevo
                              envío.
                            </p>
                            <button
                              type="button"
                              className="secondary-btn-react"
                              disabled={isNotifying || pendientesNotificar === 0}
                              onClick={() => void handleNotificar()}
                            >
                              {isNotifying ? "Enviando..." : "Enviar notificaciones"}
                            </button>
                          </div>
                        );
                      })()
                    : null}

                  {isLoadingRecords ? (
                    <div className="section-card admin-placeholder">
                      <p className="eyebrow">Cargando</p>
                      <h1>Obteniendo inscripciones...</h1>
                    </div>
                  ) : (
                    <RecordsTable
                      registros={
                        estadoActivo === "todos"
                          ? registros
                          : registros.filter((r) => r.estado === estadoActivo)
                      }
                      onUpdate={(id, data) => {
                        setRegistros((prev) =>
                          prev.map((r) => (r.id === id ? { ...r, ...data } : r)),
                        );
                      }}
                      onDelete={(id) => {
                        setRegistros((prev) => prev.filter((r) => r.id !== id));
                      }}
                      onEstadoChange={(id, estado) => {
                        setRegistros((prev) =>
                          prev.map((r) => (r.id === id ? { ...r, estado, notificado: false } : r)),
                        );
                      }}
                    />
                  )}
                </>
              ) : null}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
