/** Registros del workspace: recursos, presupuesto, anuncios, reuniones, alumni
 *  y, de Ingeniería, decisiones técnicas y servicios.
 *
 *  Comparten CRUD en el backend (`services/registros.py`) y aquí
 *  comparten panel, así que lo único propio de cada una es qué campos tiene.
 */

export type Recurso =
  | "recursos"
  | "presupuesto"
  | "anuncios"
  | "reuniones"
  | "alumni"
  | "decisiones"
  | "servicios";

/** Una fila cualquiera. Los campos concretos los declara cada `CampoSpec`. */
export type Registro = {
  id: number;
  creado_por: string;
  created_at: string;
  updated_at: string;
  [clave: string]: unknown;
};

export type TipoCampo =
  | "texto"
  | "parrafo"
  | "opcion"
  | "fecha"
  | "hora"
  | "importe"
  | "url"
  | "lista"
  | "check"
  /** Como "lista" (emails, uno por línea) pero elegidos del roster del
   *  departamento por nombre y foto, no tecleados de memoria. */
  | "miembros";

export type CampoSpec = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: readonly { valor: string; etiqueta: string }[];
  ayuda?: string;
  requerido?: boolean;
  /** Marca el campo del que sale el título de la fila en el listado. */
  esTitulo?: boolean;
};

export type ResumenPresupuesto = {
  gastos: string;
  ingresos: string;
  pagado: string;
  balance: string;
};

/** Lo que dice `GET /api/ingenieria/plataforma`: solo sí/no y datos públicos
 *  del despliegue, nunca el valor de una clave. */
export type EstadoPlataforma = {
  /** production / preview / development, o "local" fuera de Vercel. */
  entorno: string;
  /** Los 7 primeros caracteres del commit desplegado, o "" en local. */
  commit: string;
  rama: string;
  base_de_datos: { ok: boolean; ms: number | null };
  integraciones: {
    nombre: string;
    variable: string;
    configurada: boolean;
    /** Qué deja de funcionar si falta. */
    efecto: string;
  }[];
};

/** Importe en texto (viene así del backend para no perder exactitud). */
export function formatearEuros(valor: string | number | undefined) {
  const numero = Number(valor ?? 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(numero) ? numero : 0);
}

export function textoDe(registro: Registro, clave: string): string {
  const valor = registro[clave];
  return typeof valor === "string" ? valor : valor == null ? "" : String(valor);
}

export function listaDe(registro: Registro, clave: string): string[] {
  const valor = registro[clave];
  return Array.isArray(valor) ? (valor as string[]) : [];
}
