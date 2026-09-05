import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import { club, departamentos, rutaImagen, test } from './data/contenido'
import type { FichaDepartamento, Imagen } from './data/contenido'
import { NombreClub } from './components/NombreClub'
import { SelectorDepartamentos } from './components/SelectorDepartamentos'
import { SeccionTech } from './components/SeccionTech'
import { SeccionMarketing } from './components/SeccionMarketing'
import { SeccionEventos } from './components/SeccionEventos'
import { Pie } from './components/Pie'
import { Visor } from './components/Visor'
import { Test } from './components/Test'
import { iconoDeDepartamento } from './components/iconosDepartamento'

/*
 * Deja delante el departamento que ha salido en el test y detrás los otros
 * dos, sin cambiar el orden entre ellos. Así quien contesta "Marketing"
 * aterriza en Marketing y sigue leyendo hacia abajo, en vez de tener que
 * subir para no perderse Tech.
 */
function reordenar(id: FichaDepartamento['id']) {
  return [
    ...departamentos.filter((depto) => depto.id === id),
    ...departamentos.filter((depto) => depto.id !== id),
  ]
}

/** Parte el titular para poder pintar en naranja el trozo destacado. */
function partirTitular(titular: string, destacado: string) {
  const corte = titular.indexOf(destacado)
  if (corte === -1) return { antes: titular, medio: '', despues: '' }
  return {
    antes: titular.slice(0, corte),
    medio: destacado,
    despues: titular.slice(corte + destacado.length),
  }
}

function App() {
  // Al abrir /#marketing directamente, ese departamento arranca ya marcado.
  const [activo, setActivo] = useState<FichaDepartamento['id'] | null>(() => {
    const desdeLaUrl = window.location.hash.replace('#', '')
    return departamentos.some((depto) => depto.id === desdeLaUrl)
      ? (desdeLaUrl as FichaDepartamento['id'])
      : null
  })
  // Quien no hace el test ve siempre el orden de siempre: Tech, Marketing,
  // Eventos. Solo el resultado del test lo cambia.
  const [orden, setOrden] = useState<FichaDepartamento[]>(departamentos)
  const [imagenAbierta, setImagenAbierta] = useState<Imagen | null>(null)
  const [testAbierto, setTestAbierto] = useState(false)
  const [barraVisible, setBarraVisible] = useState(false)
  const portadaRef = useRef<HTMLElement>(null)

  const { antes, medio, despues } = partirTitular(club.titular, club.titularDestacado)

  /*
   * El enlace pone la dirección en la barra, pero el desplazamiento se hace
   * a mano y de golpe. Dejárselo al navegador no funciona: su salto usa el
   * `scroll-behavior: smooth` del CSS, y esa animación recorre miles de
   * píxeles mientras las imágenes van cargando y cambiando la altura, con
   * lo que se cancela a medio camino. En un stand, además, un salto seco es
   * mejor: tocas y ya estás, sin tres segundos de animación.
   */
  const irADepartamento = useCallback((id: FichaDepartamento['id']) => {
    setActivo(id)

    const destino = document.getElementById(id)
    if (!destino) return

    const y = destino.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: y, behavior: 'instant' })
  }, [])

  /*
   * El salto que sale del test. La página se recoloca antes de medir dónde
   * está el departamento: `flushSync` obliga a que el nuevo orden esté ya
   * dibujado en pantalla. Sin eso se mediría la posición que tenía antes y
   * el salto caería en el departamento equivocado.
   */
  const irDesdeElTest = useCallback(
    (id: FichaDepartamento['id']) => {
      flushSync(() => setOrden(reordenar(id)))
      irADepartamento(id)
    },
    [irADepartamento],
  )

  /*
   * Al abrir /#marketing en frío hay que saltar a mano, por dos motivos:
   *
   * 1. El navegador busca el ancla antes de que React haya dibujado la
   *    sección, no encuentra nada y se queda arriba.
   * 2. El salto del navegador usa el `scroll-behavior: smooth` del CSS, y
   *    esa animación se cancela cuando las imágenes cambian la altura de la
   *    página a mitad de recorrido. Medido: se quedaba en 11 píxeles.
   *
   * Así que el salto inicial es instantáneo y se repite una vez cuando las
   * imágenes ya han asentado la altura.
   */
  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (!id) return

    const destino = document.getElementById(id)
    if (!destino) return

    const saltar = () => {
      const y = destino.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: y, behavior: 'instant' })
    }

    saltar()
    // Las imágenes perezosas cambian la altura al cargar: se repite una vez.
    const reintento = setTimeout(saltar, 400)

    return () => clearTimeout(reintento)
  }, [])

  // La barra compacta aparece en cuanto la portada sale de pantalla.
  useEffect(() => {
    const portada = portadaRef.current
    if (!portada) return

    // Al volver arriba se limpian la marca y el orden del test, para que el
    // siguiente visitante empiece de cero y no herede el departamento del
    // anterior. Pero solo cuando se ha salido de la portada antes: si no,
    // abrir /#marketing lo borraría al cargar.
    let seHaSalido = false

    const observador = new IntersectionObserver(
      ([entrada]) => {
        setBarraVisible(!entrada.isIntersecting)

        if (!entrada.isIntersecting) {
          seHaSalido = true
        } else if (seHaSalido) {
          setActivo(null)
          setOrden(departamentos)
        }
      },
      { rootMargin: '-72px 0px 0px 0px' },
    )
    observador.observe(portada)
    return () => observador.disconnect()
  }, [])

  // Marca el departamento por el que se va pasando al deslizar.
  useEffect(() => {
    const elementos = departamentos
      .map((depto) => document.getElementById(depto.id))
      .filter((elemento): elemento is HTMLElement => elemento !== null)

    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible) setActivo(visible.target.id as FichaDepartamento['id'])
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    elementos.forEach((seccion) => observador.observe(seccion))
    return () => observador.disconnect()
  }, [])

  const secciones = {
    tech: <SeccionTech />,
    marketing: <SeccionMarketing onAbrirImagen={setImagenAbierta} />,
    eventos: <SeccionEventos onAbrirImagen={setImagenAbierta} />,
  }

  return (
    <>
      <header className={`barra ${barraVisible ? 'barra--compacta' : ''}`}>
        {/* El logo lleva a la web principal del club, no al principio de
            esta página: para volver arriba están las tres puertas. */}
        <a
          className="barra__marca"
          href={club.web}
          target="_blank"
          rel="noopener noreferrer"
          title={`Ir a la web de ${club.nombre}`}
        >
          <img src={rutaImagen('/logo.png')} alt="" width={34} height={34} />
          <b>
            <NombreClub />
          </b>
        </a>

        <nav className="barra__saltos" aria-label="Ir a un departamento">
          {orden.map((depto) => {
            const Icono = iconoDeDepartamento[depto.id]
            return (
              <a
                key={depto.id}
                className="barra__salto"
                href={`#${depto.id}`}
                aria-current={activo === depto.id}
                onClick={() => irADepartamento(depto.id)}
              >
                <Icono className="barra__salto-icono" />
                <span className="barra__salto-nombre">{depto.nombre}</span>
              </a>
            )
          })}
        </nav>

        <span className="barra__origen">
          {club.procedencia} — {club.curso}
        </span>
      </header>

      <main>
        <section className="portada" id="portada" ref={portadaRef}>
          <div className="portada__mensaje">
            <h1 className="portada__titular">
              {antes}
              <em>{medio}</em>
              {despues}
            </h1>
            <p className="portada__aclaracion">{club.aclaracion}</p>

            <p className="portada__invitacion">{club.invitacion}</p>
            <SelectorDepartamentos
              departamentos={orden}
              activo={activo}
              onElegir={irADepartamento}
            />
          </div>

          {/* El test manda en la portada: es lo que queremos que se toque. */}
          <div className="portada__test">
            <p className="portada__test-gancho">{test.gancho}</p>
            <p className="portada__test-texto">{test.descripcion}</p>
            <button
              type="button"
              className="portada__test-boton"
              onClick={() => setTestAbierto(true)}
            >
              {test.boton}
            </button>
          </div>
        </section>

        {/* El orden lo manda el test: por defecto Tech, Marketing y Eventos. */}
        {orden.map((depto) => (
          <Fragment key={depto.id}>{secciones[depto.id]}</Fragment>
        ))}
      </main>

      <Pie departamentos={orden} onElegir={irADepartamento} />

      <Visor imagen={imagenAbierta} onCerrar={() => setImagenAbierta(null)} />

      {testAbierto && (
        <Test onCerrar={() => setTestAbierto(false)} onElegir={irDesdeElTest} />
      )}
    </>
  )
}

export default App
