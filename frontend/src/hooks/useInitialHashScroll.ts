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
const REINTENTOS = [100, 400, 900];

export function useInitialHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;

    /*
     * Se cancela en cuanto la persona toca la rueda o la pantalla: si ha
     * empezado a leer por su cuenta, un salto tardío se le lleva la página de
     * debajo de las manos.
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

    window.addEventListener("wheel", cancelar, { passive: true, once: true });
    window.addEventListener("touchstart", cancelar, { passive: true, once: true });
    window.addEventListener("keydown", cancelar, { once: true });

    return () => {
      temporizadores.forEach(window.clearTimeout);
      window.removeEventListener("wheel", cancelar);
      window.removeEventListener("touchstart", cancelar);
      window.removeEventListener("keydown", cancelar);
    };
  }, []);
}
