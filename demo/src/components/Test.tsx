import { useEffect, useRef, useState } from 'react'
import { departamentos, test } from '../data/contenido'
import type { FichaDepartamento, Rol } from '../data/contenido'
import { iconoDeDepartamento } from './iconosDepartamento'
import { IconoCerrar, IconoFlecha } from './Iconos'

type Props = {
  onCerrar: () => void
  /** Se llama al elegir departamento desde el resultado. */
  onElegir: (id: FichaDepartamento['id']) => void
}

type Recuento = Record<FichaDepartamento['id'], number>

const LETRAS = ['A', 'B', 'C']

/** Las cinco de departamento más la del papel de equipo. */
const TOTAL = test.preguntas.length + 1

/*
 * Cuenta cuántas veces se ha elegido cada departamento y lo pasa a
 * porcentaje. Con cinco preguntas cada una vale un 20% exacto y los tres suman
 * 100 clavado. Con otro número de preguntas la división no sale redonda, así
 * que la cifra se redondea al pintarla: mejor un 33% que un
 * 33,333333333333336%, aunque los tres sumen 99 o 101.
 */
function contar(respuestas: FichaDepartamento['id'][]): Recuento {
  const cuenta: Recuento = { tech: 0, marketing: 0, eventos: 0 }
  for (const id of respuestas) cuenta[id] += 1
  return cuenta
}

/*
 * Quién gana. Con cinco preguntas y tres departamentos puede salir un 2-2-1,
 * así que devuelve una lista: si hay empate arriba, vienen los dos y se lo
 * decimos al visitante en vez de elegir por él.
 */
function ganadores(cuenta: Recuento): FichaDepartamento['id'][] {
  const maximo = Math.max(...Object.values(cuenta))
  return departamentos.map((d) => d.id).filter((id) => cuenta[id] === maximo)
}

/*
 * Se monta solo mientras está abierto, así que cada visitante lo empieza de
 * cero sin tener que reiniciar nada a mano.
 */
export function Test({ onCerrar, onElegir }: Props) {
  const [respuestas, setRespuestas] = useState<FichaDepartamento['id'][]>([])
  const [rol, setRol] = useState<Rol['id'] | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  const indice = respuestas.length
  const pregunta = test.preguntas[indice]
  // Contestadas las cinco, queda la del papel de equipo; después, el resultado.
  const tocaElRol = !pregunta && rol === null
  const terminado = !pregunta && rol !== null

  useEffect(() => {
    const origen = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)

    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = ''
      origen?.focus()
    }
  }, [onCerrar])

  // Al pasar de pregunta, el foco viaja con ella.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('.test__opcion, .test__ir')?.focus()
  }, [indice, tocaElRol, terminado])

  const ficha = test.roles.find((r) => r.id === rol)
  const cuenta = contar(respuestas)
  const primeros = terminado ? ganadores(cuenta) : []
  const hayEmpate = primeros.length > 1
  // Con un solo ganador el título lo nombra: "Encajas en" a secas se quedaba
  // colgado, porque el departamento no aparecía hasta el botón de abajo.
  const soloUno = hayEmpate ? undefined : departamentos.find((d) => d.id === primeros[0])

  return (
    <div className="test" role="dialog" aria-modal="true" aria-label={test.gancho}>
      <div className="test__barra">
        {!terminado && (
          <p className="test__paso">
            Pregunta {indice + 1} de {TOTAL}
          </p>
        )}

        <button ref={cerrarRef} type="button" className="test__cerrar" onClick={onCerrar}>
          <IconoCerrar />
          <span>Cerrar</span>
        </button>
      </div>

      {!terminado && (
        <div className="test__progreso" aria-hidden="true">
          <span style={{ transform: `scaleX(${indice / TOTAL})` }} />
        </div>
      )}

      <div className="test__panel" ref={panelRef}>
        {pregunta ? (
          <>
            <h2 className="test__titulo">{pregunta.titulo}</h2>
            <p className="test__enunciado">{pregunta.enunciado}</p>

            <ul className="test__opciones">
              {pregunta.opciones.map((opcion, i) => (
                <li key={opcion.texto}>
                  <button
                    type="button"
                    className="test__opcion"
                    onClick={() => setRespuestas([...respuestas, opcion.departamento])}
                  >
                    <span className="test__letra" aria-hidden="true">
                      {LETRAS[i]}
                    </span>
                    {opcion.texto}
                  </button>
                </li>
              ))}
            </ul>

            {indice > 0 && (
              <button
                type="button"
                className="test__atras"
                onClick={() => setRespuestas(respuestas.slice(0, -1))}
              >
                Volver a la anterior
              </button>
            )}
          </>
        ) : tocaElRol ? (
          <>
            <h2 className="test__titulo">{test.preguntaRol.titulo}</h2>
            <p className="test__enunciado">{test.preguntaRol.enunciado}</p>

            <ul className="test__opciones">
              {test.preguntaRol.opciones.map((opcion, i) => (
                <li key={opcion.texto}>
                  <button
                    type="button"
                    className="test__opcion"
                    onClick={() => setRol(opcion.rol)}
                  >
                    <span className="test__letra" aria-hidden="true">
                      {LETRAS[i]}
                    </span>
                    {opcion.texto}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="test__atras"
              onClick={() => setRespuestas(respuestas.slice(0, -1))}
            >
              Volver a la anterior
            </button>
          </>
        ) : (
          <div className="test__resultado">
            <h2 className="test__titulo">
              {soloUno
                ? `${test.resultado.titulo} ${soloUno.nombre}`
                : test.resultado.tituloEmpate}
            </h2>

            <ul className="marcador">
              {departamentos.map((depto) => {
                const parte = cuenta[depto.id] / test.preguntas.length
                const porcentaje = Math.round(parte * 100)
                const gana = primeros.includes(depto.id)

                return (
                  <li className="marcador__fila" key={depto.id} data-gana={gana}>
                    <span className="marcador__nombre">{depto.nombre}</span>
                    <span className="marcador__barra" aria-hidden="true">
                      <span style={{ transform: `scaleX(${parte})` }} />
                    </span>
                    <span className="marcador__cifra">
                      {porcentaje}% <small>{test.resultado.piePorcentaje}</small>
                    </span>
                  </li>
                )
              })}
            </ul>

            {ficha && (
              <div className="papel">
                <p className="papel__etiqueta">{test.resultado.tituloRol}</p>
                <p className="papel__nombre">{ficha.nombre}</p>
                <p className="papel__texto">{ficha.texto}</p>
                <p className="papel__pie">{test.resultado.pieRol}</p>
              </div>
            )}

            <div className="test__salidas">
              {primeros.map((id) => {
                const depto = departamentos.find((d) => d.id === id)
                const Icono = iconoDeDepartamento[id]
                if (!depto) return null

                return (
                  <button
                    key={id}
                    type="button"
                    className="test__ir"
                    onClick={() => {
                      onCerrar()
                      onElegir(id)
                    }}
                  >
                    <Icono className="test__ir-icono" />
                    {test.resultado.verDepartamento} {depto.nombre}
                    <IconoFlecha className="test__ir-flecha" />
                  </button>
                )
              })}
            </div>

            <div className="test__secundarias">
              <button
                type="button"
                className="test__atras"
                onClick={() => {
                  setRespuestas([])
                  setRol(null)
                }}
              >
                {test.resultado.repetir}
              </button>
              <button type="button" className="test__atras" onClick={onCerrar}>
                {test.resultado.explorar}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
