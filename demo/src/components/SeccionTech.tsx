import { rutaImagen, tech } from '../data/contenido'
import { useTexto } from '../i18n/texto'
import { CabeceraDepartamento } from './CabeceraDepartamento'
import { Figura } from './Figura'
import { IconoFlecha } from './Iconos'

/*
 * Tech / Ingeniería
 * Resumen a la izquierda; los proyectos apilados a la derecha, cada uno
 * ligeramente girado, como fichas dejadas una sobre otra.
 */
export function SeccionTech() {
  const t = useTexto()

  return (
    <section className="depto depto--tech" id={tech.id}>
      <div className="depto__reja">
        <CabeceraDepartamento
          nombre={tech.nombre}
          gancho={tech.gancho}
          resumen={tech.resumen}
        />

        <div className="proyectos">
          {tech.proyectos.map((proyecto, indice) => (
            <article className="proyecto" key={proyecto.nombre.es} data-orden={indice}>
              <div className="proyecto__marco">
                <Figura
                  imagen={proyecto.imagen}
                  relacion="16 / 9"
                  className="proyecto__imagen"
                  href={proyecto.enlace}
                />
                {proyecto.logo && (
                  <span className="proyecto__sello">
                    <img src={rutaImagen(proyecto.logo.src)} alt={t(proyecto.logo.alt)} />
                  </span>
                )}
              </div>

              <div className="proyecto__texto">
                <span className="proyecto__estado">{t(proyecto.estado)}</span>
                <h3 className="proyecto__nombre">{t(proyecto.nombre)}</h3>
                <p className="proyecto__descripcion">{t(proyecto.descripcion)}</p>

                <a
                  className="proyecto__enlace"
                  href={proyecto.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {proyecto.direccion}
                  <IconoFlecha />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      {tech.pendiente && (
        <p className="pendiente" role="note">
          {tech.pendiente}
        </p>
      )}
    </section>
  )
}
