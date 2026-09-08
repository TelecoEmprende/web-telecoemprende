type Props = {
  /** Cuántas filas placeholder pintar. */
  filas?: number;
  /** Alto de cada fila en px -- ajustarlo a lo que va a ocupar el contenido
   *  real evita el salto brusco cuando llegan los datos. */
  alto?: number;
};

/**
 * Placeholder de carga con la forma aproximada del contenido, en vez del
 * texto "Cargando...". No pretende calcar cada panel al píxel: solo dar la
 * sensación de que algo se está montando, sobre todo con conexión lenta en
 * móvil.
 */
export function Esqueleto({ filas = 4, alto = 72 }: Props) {
  return (
    <div className="esqueleto-react" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, indice) => (
        <div key={indice} className="esqueleto-fila-react" style={{ height: alto }} aria-hidden="true" />
      ))}
    </div>
  );
}
