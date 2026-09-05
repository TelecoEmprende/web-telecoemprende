import { club } from '../data/contenido'

/*
 * El nombre del club con la segunda mitad en naranja, como en la web
 * principal.
 *
 * El primer trozo no lleva color propio: hereda el de donde esté puesto, y
 * así vale igual sobre el papel de la barra que sobre la tinta del pie. El
 * naranja sí cambia, y de eso se encarga el CSS: el del logo no se lee sobre
 * fondo claro.
 */
export function NombreClub() {
  const corte = club.nombre.indexOf(club.nombreDestacado)
  if (corte === -1) return <>{club.nombre}</>

  return (
    <>
      {club.nombre.slice(0, corte)}
      <span className="marca__naranja">{club.nombreDestacado}</span>
      {club.nombre.slice(corte + club.nombreDestacado.length)}
    </>
  )
}
