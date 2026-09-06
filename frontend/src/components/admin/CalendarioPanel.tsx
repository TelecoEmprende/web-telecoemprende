import { FormEvent, useEffect, useState } from "react";

import {
  createCalendarioEvento,
  deleteCalendarioEvento,
  getCalendarioEventos,
  updateCalendarioEvento,
} from "../../api/admin";
import { AlertBanner } from "../feedback/AlertBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { ApiFailure } from "../../types/api";
import type { EventoCalendario } from "../../types/equipo";

const EVENTO_VACIO = { titulo: "", descripcion: "", fecha: "", hora: "" };

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function CalendarioPanel() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<EventoCalendario | null>(null);
  const [form, setForm] = useState(EVENTO_VACIO);
  const [borrando, setBorrando] = useState<EventoCalendario | null>(null);

  async function cargar() {
    setIsLoading(true);
    try {
      const response = await getCalendarioEventos();
      if (response.ok) {
        setEventos(response.eventos);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudieron cargar los eventos del calendario.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm(EVENTO_VACIO);
    setDialogOpen(true);
  }

  function abrirEditar(evento: EventoCalendario) {
    setEditando(evento);
    setForm({
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fecha: evento.fecha,
      hora: evento.hora,
    });
    setDialogOpen(true);
  }

  async function handleGuardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = editando
        ? await updateCalendarioEvento(editando.id, form)
        : await createCalendarioEvento(form);

      if (response.ok) {
        setMessageVariant("success");
        setMessage(editando ? "Evento actualizado." : "Evento creado.");
        setDialogOpen(false);
        await cargar();
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo guardar el evento.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEliminar() {
    if (!borrando) return;

    try {
      const response = await deleteCalendarioEvento(borrando.id);
      if (response.ok) {
        setEventos((prev) => prev.filter((e) => e.id !== borrando.id));
        setMessageVariant("success");
        setMessage("Evento eliminado.");
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setMessageVariant("error");
      setMessage(apiError.message || "No se pudo eliminar el evento.");
    } finally {
      setBorrando(null);
    }
  }

  return (
    <section className="admin-card-react shadcn-scope mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Calendario del equipo</h2>
          <p>Eventos compartidos visibles para cualquiera con sesión en /equipo.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" onClick={abrirCrear}>
              Nuevo evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleGuardar} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{editando ? "Editar evento" : "Nuevo evento"}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="evento-titulo">Título</Label>
                <Input
                  id="evento-titulo"
                  value={form.titulo}
                  maxLength={150}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="evento-descripcion">Descripción</Label>
                <Input
                  id="evento-descripcion"
                  value={form.descripcion}
                  maxLength={500}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="evento-fecha">Fecha</Label>
                  <Input
                    id="evento-fecha"
                    type="date"
                    value={form.fecha}
                    required
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="evento-hora">Hora (opcional)</Label>
                  <Input
                    id="evento-hora"
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message ? <AlertBanner variant={messageVariant} message={message} /> : null}

      {isLoading ? (
        <p className="mt-4">Cargando eventos...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {eventos.map((evento) => (
            <div
              key={evento.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <div>
                <p className="font-medium">
                  {evento.titulo}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {formatearFecha(evento.fecha)}
                    {evento.hora ? ` · ${evento.hora}` : ""}
                  </span>
                </p>
                {evento.descripcion ? (
                  <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => abrirEditar(evento)}>
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setBorrando(evento)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
          {eventos.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay eventos en el calendario.</p>
          ) : null}
        </div>
      )}

      <AlertDialog open={borrando !== null} onOpenChange={(open) => !open && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{borrando?.titulo}» del calendario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleEliminar()}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
