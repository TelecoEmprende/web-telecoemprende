# Dónde van las imágenes

Deja aquí las fotos, carteles y capturas. Esta carpeta se publica tal cual: lo que
metas en `frontend/public/img/eventos/foto.jpg` se ve en la web como `/img/eventos/foto.jpg`.

## Cómo añadir una imagen

1. Arrastra el archivo a la subcarpeta que le toque (`tech/`, `marketing/` o `eventos/`).
2. Abre `frontend/src/data/contenido.ts` y escribe su ruta en el departamento correspondiente.
3. Guarda. La web se actualiza sola, sin reiniciar nada.

Mientras una imagen no exista, la página enseña un hueco gris con el nombre del archivo
que espera. No se rompe nada: en cuanto dejes el archivo con ese nombre, aparece.

## Qué hay ahora mismo

**No falta ninguna.** Todos los huecos de la página están cubiertos:

```
marketing/instagram.jpg        perfil de Instagram
marketing/linkedin.jpg         página de LinkedIn
marketing/logo-instagram.png   icono de Instagram
marketing/logo-linkedin.png    icono de LinkedIn
marketing/cartel1.jpg          Teleco Builders · TaxDown
marketing/cartel2.jpg          Conversaciones Alumni · AMD
marketing/reel.mp4             reel del club

eventos/evento-taxdown.jpg     charla de los fundadores de TaxDown
eventos/evento-cabify.jpg      charla de Carlos Herrera (Cabify)
eventos/evento-ignacio-garcia-carrillo.jpg   charla de Ignacio García-Carrillo (AMD)
eventos/evento-jme.jpg         foto de grupo de la charla de Samuel Gil (JME)
eventos/logo-taxdown.svg       logo de TaxDown
eventos/logo-cabify.svg        logo de Cabify
eventos/logo-amd.svg           logo de AMD
eventos/logo-jme.jpg           logo de JME Ventures

tech/red-alumni.jpg            portada de alumni.etsit.upm.es
tech/repo-web.jpg              repositorio de la web del club en GitHub
tech/logo-github.png           logo de GitHub, sobre la captura del repositorio
```

Podéis usar otros nombres: solo hay que cambiarlos también en `contenido.ts`.
Podéis añadir o quitar carteles, redes y charlas; la página se adapta al número
que haya.

### Los carteles

Los carteles van directos sobre el papel de la página, con su inclinación y su sombra.
Se mandan **limpios**, sin marco ni mockup:
añadir uno nuevo es soltar el archivo y escribir su ruta en `contenido.ts`.

### El reel

Se reproduce **en bucle y sin sonido**, porque los navegadores bloquean el vídeo
con audio que arranca solo. Formato: MP4 (H.264), vertical 1080×1920 o 720×1280,
por debajo de 8 MB. A quien tenga activado "reducir movimiento" en su sistema no
se le arranca solo: se le enseñan los controles.

### Formas de cada hueco

| Hueco | Forma | Por qué |
| --- | --- | --- |
| Capturas de redes | vertical, 9:15 | Es una pantalla de móvil |
| Carteles | vertical, 4:5 | Es el formato de publicación de Instagram |
| Reel | vertical, 9:16 | Es el formato de un reel |
| Proyectos de Tech | apaisado, 16:9 | Son capturas de pantalla de ordenador. Al pulsarlas se abre su web, no se amplían |
| Fotos de charlas | vertical, 3:4 | Entran enteras las cuatro fotos que hay, sin recortar ninguna cara |
| Logos del sello | cualquiera | El sello se mide solo: círculo si el logo es cuadrado, pastilla si es una tira alargada |

Si una imagen no tiene exactamente esa forma no pasa nada: se recorta por el centro
para llenar el hueco. La proporción es para que no se recorte nada importante.

## Consejos prácticos

- **Formato:** `.jpg` para fotos de eventos, `.png` para capturas de pantalla y carteles.
- **Tamaño:** que el lado más largo no pase de 2000 píxeles. Más grande no se ve mejor
  y hace que la página tarde en cargar, que en una feria con wifi malo se nota.
- **Peso:** intenta que cada archivo baje de 500 KB.
- **Sin espacios ni tildes en el nombre del archivo:** `charla-taxdown.jpg`, no `Charla TaxDown.jpg`.
- **Extensión en minúsculas:** `.jpg`, no `.JPG`. En tu Mac da igual, pero el servidor
  donde se publica distingue mayúsculas y la imagen no aparecería.
- **Permiso:** si en una foto se reconoce a alguien, asegúrate de que le parece bien
  que salga en la web antes de subirla.
