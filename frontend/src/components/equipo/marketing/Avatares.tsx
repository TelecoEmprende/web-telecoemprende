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
 * Provisional a propósito: no hay tabla de perfiles todavía (está pendiente de
 * acordar con Hammad ampliar `equipo_accesos`), así que la foto se deduce del
 * email contra las imágenes que ya están en `public/` para la landing. Si no
 * hay foto, quedan las iniciales, que es lo que verá cualquiera que no salga
 * en la web. Cuando exista el perfil real, esto pasa a leer `foto_url` y se
 * borra el mapa.
 */

/** Nombres con foto en `frontend/public/equipo-*.jpg`. */
const CON_FOTO = new Set([
  "abril", "alex", "david", "diego", "guillermo", "hammad",
  "hugo", "iker", "jorge", "mamoun", "mariano",
]);

function nombreDe(email: string) {
  return email.split("@")[0].split(/[.+_-]/)[0].toLowerCase();
}

export function fotoDe(email: string) {
  const nombre = nombreDe(email);
  // Same-origin: la CSP del sitio es `img-src 'self' data:`, así que una foto
  // externa se bloquearía en silencio.
  return CON_FOTO.has(nombre) ? `/equipo-${nombre}.jpg` : undefined;
}

function inicialesDe(email: string) {
  const nombre = nombreDe(email);
  return nombre.slice(0, 2).toUpperCase();
}

function etiquetaDe(email: string) {
  const nombre = nombreDe(email);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function AvatarResponsable({ email }: { email: string }) {
  return (
    <Avatar title={email}>
      <AvatarImage src={fotoDe(email)} alt={etiquetaDe(email)} />
      <AvatarFallback>{inicialesDe(email)}</AvatarFallback>
    </Avatar>
  );
}

type Props = {
  responsables: string[];
  /** Cuántas caras antes de resumir el resto en un contador. */
  maximo?: number;
  className?: string;
};

export function AvataresDeResponsables({ responsables, maximo = 3, className }: Props) {
  if (responsables.length === 0) return null;

  const visibles = responsables.slice(0, maximo);
  const restantes = responsables.length - visibles.length;

  return (
    <AvatarGroup className={className} aria-label={`Responsables: ${responsables.join(", ")}`}>
      {visibles.map((email) => (
        <AvatarResponsable key={email} email={email} />
      ))}
      {restantes > 0 ? <AvatarGroupCount>+{restantes}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}
