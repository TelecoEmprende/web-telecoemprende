type Props = { valor: string; maximo: number };

/**
 * "180/200" junto a un campo de texto -- pero solo cerca del límite. Antes
 * el único aviso era el guardado fallando al pasarse; esto avisa mientras se
 * escribe, sin ensuciar un campo que la mayoría del tiempo se queda corto.
 */
export function ContadorCaracteres({ valor, maximo }: Props) {
  const usados = valor.length;
  if (usados < maximo * 0.8) return null;

  const excedido = usados > maximo;
  return (
    <span
      className={`contador-caracteres-react${excedido ? " contador-caracteres-excedido-react" : ""}`}
    >
      {usados}/{maximo}
    </span>
  );
}
