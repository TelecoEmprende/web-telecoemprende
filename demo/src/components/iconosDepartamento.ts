/*
 * Qué icono le toca a cada departamento.
 * Vive aparte de Iconos.tsx para que ese archivo solo exporte componentes.
 */
import { IconoCodigo, IconoMegafono, IconoPersonas } from './Iconos'

/*
 * Están elegidos por silueta, no por tema: en la barra se ven a 19 píxeles
 * y los tres juntos, así que lo que tiene que distinguirlos de un vistazo es
 * la forma. Uno es angular y ancho, otro es un triángulo tumbado y el otro
 * son dos redondeles. A ese tamaño eso se nota antes que el dibujo.
 */
export const iconoDeDepartamento = {
  tech: IconoCodigo,
  marketing: IconoMegafono,
  eventos: IconoPersonas,
} as const
