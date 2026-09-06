import { useEffect } from "react";

/*
 * Lleva la página a la sección del enlace cuando se llega de fuera con un
 * ancla puesta: telecoemprende.es/#inscripcion desde la demo, desde WhatsApp
 * o desde un marcador.
 *
 * Hace falta porque esto es una SPA. El HTML que sirve el servidor solo trae
 * `<div id="root"></div>`: cuando el navegador busca `#inscripcion`, esa
 * sección todavía no existe, así que se queda arriba. React la pinta un
 * instante después y el navegador ya no vuelve a intentarlo.
 *
 * Los enlaces de la barra no pasan por aquí: cuando se pulsan, la página ya
 * está pintada y el salto del navegador funciona solo.
 */

/* Cuántas veces se repite el salto mientras la página termina de asentarse. */
const REINTENTOS = [100, 400, 900, 1800];

export function useInitialHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;

    /*
     * Se cancela si la persona empieza a desplazarse por su cuenta: un salto
     * tardío le llevaría la página de debajo de las manos.
     *
     * Lo que cuenta es el desplazamiento, no el contacto. Cancelar con
     * `touchstart` era demasiado: en el móvil, un dedo apoyado un instante
     * sobre la pantalla mientras carga no dice que nadie quiera quedarse
     * arriba, y dejaba la página a mitad de camino. La sección se mueve
     * mucho mientras cargan las imágenes —la portada pasa de 7.200 a 9.900
     * píxeles de alto—, así que quedarse sin reintentos deja a la persona a
     * dos mil píxeles del formulario.
     */
    let cancelado = false;
    const cancelar = () => {
      cancelado = true;
    };

    const saltar = () => {
      if (cancelado) return;

      const destino = document.getElementById(id);
      if (!destino) return;

      /*
       * `smooth` recorrería miles de píxeles mientras las imágenes van
       * cargando y cambiando la altura, y se cancela a medio camino. Al
       * llegar de fuera, además, la persona no ha visto lo de arriba: no hay
       * nada que enseñarle por el camino.
       */
      destino.scrollIntoView({ behavior: "instant", block: "start" });
    };

    // El primero, en cuanto React ha pintado; los demás, por si las imágenes
    // perezosas mueven la sección de sitio al cargar.
    saltar();
    const temporizadores = REINTENTOS.map((espera) => window.setTimeout(saltar, espera));

    /*
     * Y uno más cuando ha cargado todo. Con la wifi de la escuela las
     * imágenes pueden tardar más que el último reintento, y son ellas las que
     * mueven la sección: la portada pasa de 7.200 a 9.900 píxeles de alto
     * mientras cargan. Si `load` ya ha pasado, se salta en el siguiente
     * hueco, porque el evento ya no va a volver a dispararse.
     */
    if (document.readyState === "complete") {
      temporizadores.push(window.setTimeout(saltar, 0));
    } else {
      window.addEventListener("load", saltar, { once: true });
    }

    window.addEventListener("wheel", cancelar, { passive: true, once: true });
    window.addEventListener("touchmove", cancelar, { passive: true, once: true });
    window.addEventListener("keydown", cancelar, { once: true });

    return () => {
      temporizadores.forEach(window.clearTimeout);
      window.removeEventListener("load", saltar);
      window.removeEventListener("wheel", cancelar);
      window.removeEventListener("touchmove", cancelar);
      window.removeEventListener("keydown", cancelar);
    };
  }, []);
}
