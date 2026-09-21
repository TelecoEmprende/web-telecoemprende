import { ExternalLink, Pin } from "lucide-react";
import { useEffect, useState } from "react";

import { useApi, useDirectorio } from "../DeptoApi";
import { RegistrosPanel } from "./RegistrosPanel";
import { AvataresDeResponsables } from "../marketing/Avatares";
import { diasHasta, formatearFecha, haceCuanto } from "../../../types/marketing";
import {
  formatearEuros,
  listaDe,
  textoDe,
  type CampoSpec,
  type Registro,
  type ResumenPresupuesto,
} from "../../../types/registros";

/** Etiqueta legible de un valor de `opcion`, para el listado. */
function etiqueta(campos: readonly CampoSpec[], clave: string, valor: string) {
  const campo = campos.find((c) => c.clave === clave);
  return campo?.opciones?.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

/** Un enlace externo se abre fuera y sin filtrar el referer. */
function Enlace({ url, texto }: { url: string; texto?: string }) {
  if (!url) return null;
  return (
    <a className="reg-enlace-react" href={url} target="_blank" rel="noreferrer noopener">
      <ExternalLink aria-hidden="true" /> {texto ?? "Abrir"}
    </a>
  );
}

// --------------------------------------------------------------------------
// Recursos / Docs
// --------------------------------------------------------------------------

const CAMPOS_RECURSOS: readonly CampoSpec[] = [
  { clave: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, esTitulo: true },
  {
    clave: "tipo",
    etiqueta: "Tipo",
    tipo: "opcion",
    opciones: [
      { valor: "documento", etiqueta: "Documento" },
      { valor: "enlace", etiqueta: "Enlace" },
      { valor: "carpeta", etiqueta: "Carpeta" },
      { valor: "plantilla", etiqueta: "Plantilla" },
      { valor: "otro", etiqueta: "Otro" },
    ],
  },
  {
    clave: "url",
    etiqueta: "Enlace",
    tipo: "url",
    ayuda: "Drive, Notion, Canva... lo que sea, pega la URL.",
  },
  { clave: "notas", etiqueta: "Notas", tipo: "parrafo" },
];

export function RecursosPanel() {
  return (
    <RegistrosPanel
      recurso="recursos"
      descripcion="Los archivos y enlaces del departamento, en un sitio en vez de repartidos por chats."
      vacio="Todavía no hay ningún recurso. Añade el primero: el plano del espacio, la carpeta de Drive, la plantilla de cartelería..."
      etiquetaNuevo="Nuevo recurso"
      campos={CAMPOS_RECURSOS}
      fila={(r) => ({
        titulo: textoDe(r, "titulo"),
        meta: `${etiqueta(CAMPOS_RECURSOS, "tipo", textoDe(r, "tipo"))} · añadido ${haceCuanto(textoDe(r, "created_at"))}`,
        derecha: <Enlace url={textoDe(r, "url")} />,
        cuerpo: textoDe(r, "notas") ? <p>{textoDe(r, "notas")}</p> : null,
      })}
    />
  );
}

// --------------------------------------------------------------------------
// Presupuesto
// --------------------------------------------------------------------------

const CAMPOS_PRESUPUESTO: readonly CampoSpec[] = [
  { clave: "concepto", etiqueta: "Concepto", tipo: "texto", requerido: true, esTitulo: true },
  {
    clave: "tipo",
    etiqueta: "Tipo",
    tipo: "opcion",
    opciones: [
      { valor: "gasto", etiqueta: "Gasto" },
      { valor: "ingreso", etiqueta: "Ingreso" },
    ],
  },
  { clave: "importe", etiqueta: "Importe (€)", tipo: "importe" },
  {
    clave: "estado",
    etiqueta: "Estado",
    tipo: "opcion",
    opciones: [
      { valor: "previsto", etiqueta: "Previsto" },
      { valor: "aprobado", etiqueta: "Aprobado" },
      { valor: "pagado", etiqueta: "Pagado" },
      { valor: "cancelado", etiqueta: "Cancelado" },
    ],
    ayuda: "Lo cancelado se queda en la lista pero no suma en los totales.",
  },
  { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
  { clave: "notas", etiqueta: "Notas", tipo: "parrafo" },
];

/** Los totales se piden al backend, que los suma en SQL: sumarlos aquí sobre
 *  los importes en texto es justo donde se cuelan los céntimos.
 *
 *  Se recalculan cuando cambia `registros`, que es un array nuevo después de
 *  cada alta, edición o borrado -- así el panel no tiene que avisar. */
function TotalesPresupuesto({ registros }: { registros: Registro[] }) {
  const { getResumenPresupuesto } = useApi();
  const [resumen, setResumen] = useState<ResumenPresupuesto | null>(null);

  useEffect(() => {
    let activo = true;
    void getResumenPresupuesto()
      .then((r) => activo && setResumen(r.resumen))
      .catch(() => activo && setResumen(null));
    return () => {
      activo = false;
    };
  }, [getResumenPresupuesto, registros]);

  if (resumen === null) return null;

  const balance = Number(resumen.balance);

  return (
    <dl className="reg-totales-react">
      <div>
        <dd>{formatearEuros(resumen.ingresos)}</dd>
        <dt>Ingresos</dt>
      </div>
      <div>
        <dd>{formatearEuros(resumen.gastos)}</dd>
        <dt>Gastos</dt>
      </div>
      <div>
        <dd>{formatearEuros(resumen.pagado)}</dd>
        <dt>Gastos ya pagados</dt>
      </div>
      <div className={balance < 0 ? "reg-total-negativo-react" : undefined}>
        <dd>{formatearEuros(resumen.balance)}</dd>
        <dt>Balance</dt>
      </div>
    </dl>
  );
}

export function PresupuestoPanel() {
  return (
    <RegistrosPanel
      recurso="presupuesto"
      descripcion="Partidas del departamento: qué se va a gastar, qué entra y qué está ya pagado."
      vacio="Sin partidas todavía. Añade la primera y los totales aparecen solos."
      etiquetaNuevo="Nueva partida"
      campos={CAMPOS_PRESUPUESTO}
      cabecera={(registros) => <TotalesPresupuesto registros={registros} />}
      fila={(r) => {
        const esGasto = textoDe(r, "tipo") === "gasto";
        const estado = textoDe(r, "estado");
        return {
          titulo: textoDe(r, "concepto"),
          meta: textoDe(r, "fecha") ? formatearFecha(textoDe(r, "fecha"), true) : "Sin fecha",
          badges: (
            <span className="mkt-tags-react">
              <span className={`reg-estado-react reg-estado-${estado}-react`}>
                {etiqueta(CAMPOS_PRESUPUESTO, "estado", estado)}
              </span>
            </span>
          ),
          derecha: (
            <span
              className={`reg-importe-react ${esGasto ? "reg-importe-gasto-react" : "reg-importe-ingreso-react"}`}
            >
              {esGasto ? "−" : "+"}
              {formatearEuros(textoDe(r, "importe"))}
            </span>
          ),
          cuerpo: textoDe(r, "notas") ? <p>{textoDe(r, "notas")}</p> : null,
        };
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Anuncios (del club entero, no de un departamento)
// --------------------------------------------------------------------------

const CAMPOS_ANUNCIOS: readonly CampoSpec[] = [
  { clave: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, esTitulo: true },
  { clave: "cuerpo", etiqueta: "Mensaje", tipo: "parrafo" },
  {
    clave: "fijado",
    etiqueta: "Fijar arriba del todo",
    tipo: "check",
    ayuda: "Para lo que no se puede perder entre los demás.",
  },
];

export function AnunciosPanel() {
  return (
    <RegistrosPanel
      recurso="anuncios"
      descripcion="Comunicados para todo el club. Se ven desde cualquier departamento, no solo desde este."
      vacio="No hay anuncios. El primero que publiques lo verá todo el equipo al entrar."
      etiquetaNuevo="Nuevo anuncio"
      campos={CAMPOS_ANUNCIOS}
      fila={(r) => ({
        titulo: textoDe(r, "titulo"),
        meta: `${textoDe(r, "creado_por").split("@")[0] || "alguien"} · ${haceCuanto(textoDe(r, "created_at"))}`,
        badges: r.fijado ? (
          <span className="mkt-tags-react">
            <span className="reg-fijado-react">
              <Pin aria-hidden="true" /> Fijado
            </span>
          </span>
        ) : null,
        cuerpo: textoDe(r, "cuerpo") ? (
          <p className="reg-cuerpo-largo-react">{textoDe(r, "cuerpo")}</p>
        ) : null,
      })}
    />
  );
}

// --------------------------------------------------------------------------
// Reuniones
// --------------------------------------------------------------------------

const CAMPOS_REUNIONES: readonly CampoSpec[] = [
  { clave: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, esTitulo: true },
  { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
  { clave: "hora", etiqueta: "Hora", tipo: "hora" },
  {
    clave: "objetivo",
    etiqueta: "Objetivo",
    tipo: "parrafo",
    ayuda: "Para qué se convoca. Sin esto, la reunión se convierte en una puesta al día.",
  },
  {
    clave: "asistentes",
    etiqueta: "Asistentes",
    tipo: "miembros",
  },
  { clave: "acta", etiqueta: "Acta y acuerdos", tipo: "parrafo" },
];

export function ReunionesPanel() {
  const directorio = useDirectorio();
  return (
    <RegistrosPanel
      recurso="reuniones"
      descripcion="Convocatorias, objetivo y acta. Lo que se acordó queda escrito donde se puede buscar."
      vacio="Sin reuniones apuntadas todavía."
      etiquetaNuevo="Nueva reunión"
      campos={CAMPOS_REUNIONES}
      fila={(r) => {
        const asistentes = listaDe(r, "asistentes");
        return {
          titulo: textoDe(r, "titulo"),
          meta: [
            textoDe(r, "fecha") ? formatearFecha(textoDe(r, "fecha"), true) : "Sin fecha",
            textoDe(r, "hora"),
          ]
            .filter(Boolean)
            .join(" · "),
          derecha:
            asistentes.length > 0 ? (
              <AvataresDeResponsables responsables={asistentes} directorio={directorio} />
            ) : null,
          cuerpo: (
            <>
              {textoDe(r, "objetivo") ? (
                <p>
                  <b>Objetivo:</b> {textoDe(r, "objetivo")}
                </p>
              ) : null}
              {textoDe(r, "acta") ? (
                <p className="reg-cuerpo-largo-react">{textoDe(r, "acta")}</p>
              ) : null}
            </>
          ),
        };
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Red Alumni
// --------------------------------------------------------------------------

const CAMPOS_ALUMNI: readonly CampoSpec[] = [
  { clave: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true, esTitulo: true },
  { clave: "promocion", etiqueta: "Promoción", tipo: "texto", ayuda: "El año en que salió." },
  { clave: "empresa", etiqueta: "Empresa", tipo: "texto" },
  { clave: "puesto", etiqueta: "Puesto", tipo: "texto" },
  { clave: "email", etiqueta: "Email", tipo: "texto" },
  { clave: "linkedin", etiqueta: "LinkedIn", tipo: "url" },
  {
    clave: "estado",
    etiqueta: "Estado del contacto",
    tipo: "opcion",
    opciones: [
      { valor: "pendiente", etiqueta: "Pendiente" },
      { valor: "contactado", etiqueta: "Contactado" },
      { valor: "en_conversacion", etiqueta: "En conversación" },
      { valor: "colabora", etiqueta: "Colabora" },
      { valor: "descartado", etiqueta: "Descartado" },
    ],
  },
  {
    clave: "notas",
    etiqueta: "Notas",
    tipo: "parrafo",
    ayuda: "De qué se habló, qué podría aportar, cuándo volver a escribirle.",
  },
];

export function AlumniPanel() {
  return (
    <RegistrosPanel
      recurso="alumni"
      descripcion="Quién pasó por el club o por la escuela, dónde está ahora y por dónde va la conversación."
      vacio="La red está vacía. Empieza por quien ya conocéis: es más fácil que se apunte quien ya estuvo."
      etiquetaNuevo="Nuevo contacto"
      campos={CAMPOS_ALUMNI}
      fila={(r) => {
        const estado = textoDe(r, "estado");
        return {
          titulo: textoDe(r, "nombre"),
          meta: [textoDe(r, "puesto"), textoDe(r, "empresa"), textoDe(r, "promocion")]
            .filter(Boolean)
            .join(" · "),
          badges: (
            <span className="mkt-tags-react">
              <span className={`reg-estado-react reg-estado-${estado}-react`}>
                {etiqueta(CAMPOS_ALUMNI, "estado", estado)}
              </span>
            </span>
          ),
          derecha: <Enlace url={textoDe(r, "linkedin")} texto="LinkedIn" />,
          cuerpo: textoDe(r, "notas") ? <p>{textoDe(r, "notas")}</p> : null,
        };
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Decisiones técnicas (Ingeniería)
// --------------------------------------------------------------------------

const CAMPOS_DECISIONES: readonly CampoSpec[] = [
  { clave: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, esTitulo: true },
  {
    clave: "estado",
    etiqueta: "Estado",
    tipo: "opcion",
    opciones: [
      { valor: "propuesta", etiqueta: "Propuesta" },
      { valor: "aceptada", etiqueta: "Aceptada" },
      { valor: "descartada", etiqueta: "Descartada" },
      { valor: "reemplazada", etiqueta: "Reemplazada" },
    ],
    ayuda: "Reemplazada: una decisión posterior la deja sin efecto.",
  },
  { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
  {
    clave: "contexto",
    etiqueta: "Contexto",
    tipo: "parrafo",
    ayuda: "El problema y las alternativas que se barajaron.",
  },
  {
    clave: "decision",
    etiqueta: "Decisión y motivos",
    tipo: "parrafo",
    ayuda: "Lo que habrá que saber dentro de un año, cuando ya no esté quien lo decidió.",
  },
];

export function DecisionesPanel() {
  return (
    <RegistrosPanel
      recurso="decisiones"
      descripcion="Qué se decidió en lo técnico y por qué. Cuando cambie el equipo, esto evita rehacer la discusión desde cero."
      vacio="Sin decisiones apuntadas. Empieza por las gordas: dónde está alojada la web, la base de datos, por qué Flask."
      etiquetaNuevo="Nueva decisión"
      campos={CAMPOS_DECISIONES}
      fila={(r) => {
        const estado = textoDe(r, "estado");
        const contexto = textoDe(r, "contexto");
        const decision = textoDe(r, "decision");
        return {
          titulo: textoDe(r, "titulo"),
          meta: textoDe(r, "fecha") ? formatearFecha(textoDe(r, "fecha"), true) : "Sin fecha",
          badges: (
            <span className="mkt-tags-react">
              <span className={`reg-estado-react reg-estado-${estado}-react`}>
                {etiqueta(CAMPOS_DECISIONES, "estado", estado)}
              </span>
            </span>
          ),
          cuerpo:
            contexto || decision ? (
              <>
                {contexto ? (
                  <p className="reg-cuerpo-largo-react">
                    <b>Contexto:</b> {contexto}
                  </p>
                ) : null}
                {decision ? (
                  <p className="reg-cuerpo-largo-react">
                    <b>Decisión:</b> {decision}
                  </p>
                ) : null}
              </>
            ) : null,
        };
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Servicios e infraestructura (Ingeniería)
// --------------------------------------------------------------------------

const CAMPOS_SERVICIOS: readonly CampoSpec[] = [
  { clave: "nombre", etiqueta: "Servicio", tipo: "texto", requerido: true, esTitulo: true },
  {
    clave: "tipo",
    etiqueta: "Tipo",
    tipo: "opcion",
    opciones: [
      { valor: "alojamiento", etiqueta: "Alojamiento" },
      { valor: "base_datos", etiqueta: "Base de datos" },
      { valor: "dominio", etiqueta: "Dominio / DNS" },
      { valor: "correo", etiqueta: "Correo" },
      { valor: "codigo", etiqueta: "Código" },
      { valor: "mensajeria", etiqueta: "Mensajería" },
      { valor: "otro", etiqueta: "Otro" },
    ],
  },
  {
    clave: "estado",
    etiqueta: "Estado",
    tipo: "opcion",
    opciones: [
      { valor: "activo", etiqueta: "Activo" },
      { valor: "pendiente", etiqueta: "Pendiente de configurar" },
      { valor: "baja", etiqueta: "Dado de baja" },
    ],
  },
  {
    clave: "url",
    etiqueta: "Panel",
    tipo: "url",
    ayuda: "Donde se gestiona: el dashboard, no la web pública.",
  },
  {
    clave: "responsables",
    etiqueta: "Responsables",
    tipo: "miembros",
    ayuda: "Quién tiene el acceso y sabe tocarlo.",
  },
  {
    clave: "renovacion",
    etiqueta: "Renovación",
    tipo: "fecha",
    ayuda: "Dominios y planes de pago: el día en que caducan.",
  },
  {
    clave: "notas",
    etiqueta: "Notas",
    tipo: "parrafo",
    ayuda: "Qué hay ahí y qué hay que saber. Nunca pegues aquí contraseñas ni claves.",
  },
];

/** Días de margen para avisar de una renovación. Un dominio que caduca sin
 *  que nadie se entere es el clásico de los clubes.
 *  ponytail: el aviso solo se ve al abrir el panel; si nadie lo abre no sirve
 *  de nada. Cuando pese, engancharlo a `backend/api/cron.py` (ya avisa a Slack). */
const AVISO_RENOVACION_DIAS = 30;

export function ServiciosPanel() {
  const directorio = useDirectorio();
  return (
    <RegistrosPanel
      recurso="servicios"
      descripcion="Dónde vive cada cosa, quién tiene la llave y cuándo caduca. Sin contraseñas: eso va al gestor del equipo."
      vacio="Sin servicios apuntados. Empieza por lo que ya usáis: Vercel, Supabase, el dominio, Resend, Slack."
      etiquetaNuevo="Nuevo servicio"
      campos={CAMPOS_SERVICIOS}
      fila={(r) => {
        const estado = textoDe(r, "estado");
        const responsables = listaDe(r, "responsables");
        const renovacion = textoDe(r, "renovacion");
        const dias = diasHasta(renovacion || null);
        const vigilar = estado !== "baja" && dias !== null && dias <= AVISO_RENOVACION_DIAS;
        return {
          titulo: textoDe(r, "nombre"),
          meta: [
            etiqueta(CAMPOS_SERVICIOS, "tipo", textoDe(r, "tipo")),
            renovacion ? `renueva ${formatearFecha(renovacion, true)}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          badges: (
            <span className="mkt-tags-react">
              <span className={`reg-estado-react reg-estado-${estado}-react`}>
                {etiqueta(CAMPOS_SERVICIOS, "estado", estado)}
              </span>
              {vigilar ? (
                <span
                  className={`reg-estado-react${dias < 0 ? " reg-estado-caducado-react" : ""}`}
                >
                  {dias < 0
                    ? "Caducado"
                    : dias === 0
                      ? "Renueva hoy"
                      : `Renueva en ${dias} d`}
                </span>
              ) : null}
            </span>
          ),
          derecha: (
            <>
              {responsables.length > 0 ? (
                <AvataresDeResponsables responsables={responsables} directorio={directorio} />
              ) : null}
              <Enlace url={textoDe(r, "url")} texto="Panel" />
            </>
          ),
          cuerpo: textoDe(r, "notas") ? (
            <p className="reg-cuerpo-largo-react">{textoDe(r, "notas")}</p>
          ) : null,
        };
      }}
    />
  );
}
