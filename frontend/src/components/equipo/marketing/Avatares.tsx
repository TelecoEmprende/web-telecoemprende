import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";

/**
 * Caras de los responsables.
 *
 * `equipo_accesos.nombre` (perfil real, ver `/admin` → Accesos de equipo) es
 * la fuente cuando está rellena -- se pasa como segundo argumento/prop desde
 * quien ya tiene el directorio a mano (`useDirectorio()`, ver `DeptoApi.tsx`,
 * o un `Miembro`/`FichaMiembro` ya cargado). Si está vacía (perfil sin
 * completar todavía), se cae al viejo truco de adivinar por el email contra
 * las fotos que ya hay en `public/` -- así nadie se queda sin nombre ni foto
 * mientras se rellenan los perfiles.
 */

/** Nombres con foto en `frontend/public/equipo-*.jpg`.
 *
 *  Cuando dos personas comparten nombre de pila la clave es `nombre-apellido`
 *  (`david-garcia`): con solo "david", David Martín salía con la cara de David
 *  García. Quien no tenga foto se queda en iniciales, que es mejor que la cara
 *  de otra persona -- para darle la suya basta con dejar el .jpg en `public/`
 *  con este mismo nombre y añadirlo a la lista. */
const CON_FOTO = [
  "abril", "alex", "david-garcia", "diego", "guillermo", "hammad",
  "hugo", "iker", "jorge", "mamoun", "mariano", "marta",
];

/** La misma lista, del nombre más largo al más corto: así una entrada futura
 *  de "david" a secas no puede robarle el prefijo a "david-garcia". */
const POR_LONGITUD = [...CON_FOTO].sort((a, b) => b.length - a.length);

function nombreAdivinado(email: string) {
  const local = email.split("@")[0].toLowerCase();
  // "nombre.apellido@..." o "nombre_apellido@...": el separador ya lo parte.
  const tokens = local.split(/[.+_-]/).filter(Boolean);

  // "david.garcia" antes que "david": el nombre de pila a solas es justo lo
  // que confundía a los dos Davids.
  const exacto = [tokens.slice(0, 2).join("-"), tokens[0]].find((c) =>
    CON_FOTO.includes(c),
  );
  if (exacto) return exacto;

  // Sin separador (p. ej. "abrilespinosatortuero@gmail.com") el email entero
  // es un solo token: buscar qué nombre conocido empieza el local-part.
  const prefijo = POR_LONGITUD.find(
    (nombre) =>
      local.startsWith(nombre) || local.startsWith(nombre.replace(/-/g, "")),
  );
  return prefijo ?? tokens[0] ?? local;
}

export type NivelCarga = "libre" | "media" | "alta";

/** A partir de cuántas tareas abiertas alguien está "cargado". Un solo sitio
 *  para el umbral: lo usan el chip del directorio (`Carga`, en
 *  `MembersPanel.tsx`) y su filtro, para no repetir `abiertas >= 4` en dos
 *  sitios. Cuatro o más ya no es "va cargado", es "no le eches nada más". */
export function nivelCarga(abiertas: number): NivelCarga {
  if (abiertas === 0) return "libre";
  return abiertas >= 4 ? "alta" : "media";
}

export function fotoDe(email: string) {
  const nombre = nombreAdivinado(email);
  // Same-origin: la CSP del sitio es `img-src 'self' data:`, así que una foto
  // externa se bloquearía en silencio.
  return CON_FOTO.includes(nombre) ? `/equipo-${nombre}.jpg` : undefined;
}

function inicialesDe(email: string, nombreReal?: string) {
  if (nombreReal?.trim()) {
    const palabras = nombreReal.trim().split(/\s+/);
    return (palabras[0][0] + (palabras[1]?.[0] ?? palabras[0][1] ?? "")).toUpperCase();
  }
  // "david-garcia" -> "DG", no "DA": las iniciales son lo único que separa a
  // dos personas que comparten nombre y no tienen foto.
  const partes = nombreAdivinado(email).split("-");
  const iniciales =
    partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2);
  return iniciales.toUpperCase();
}

export function etiquetaDe(email: string, nombreReal?: string) {
  if (nombreReal?.trim()) return nombreReal.trim();
  return nombreAdivinado(email)
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

export function AvatarResponsable({
  email,
  nombre,
  className,
}: {
  email: string;
  /** Nombre real del perfil, si ya se conoce (ver comentario arriba). */
  nombre?: string;
  className?: string;
}) {
  const etiqueta = etiquetaDe(email, nombre);
  return (
    <Avatar title={nombre?.trim() ? `${etiqueta} · ${email}` : email} className={className}>
      <AvatarImage src={fotoDe(email)} alt={etiqueta} />
      <AvatarFallback>{inicialesDe(email, nombre)}</AvatarFallback>
    </Avatar>
  );
}

type Props = {
  responsables: string[];
  /** email → nombre real, de `useDirectorio()`. Sin ella, cae al nombre adivinado. */
  directorio?: Record<string, string>;
  /** Cuántas caras antes de resumir el resto en un contador. */
  maximo?: number;
  className?: string;
};

export function AvataresDeResponsables({
  responsables,
  directorio,
  maximo = 3,
  className,
}: Props) {
  if (responsables.length === 0) return null;

  const visibles = responsables.slice(0, maximo);
  const restantes = responsables.length - visibles.length;
  const etiquetas = responsables.map((email) => etiquetaDe(email, directorio?.[email]));

  return (
    <AvatarGroup className={className} aria-label={`Responsables: ${etiquetas.join(", ")}`}>
      {visibles.map((email) => (
        <AvatarResponsable key={email} email={email} nombre={directorio?.[email]} />
      ))}
      {restantes > 0 ? <AvatarGroupCount>+{restantes}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}
