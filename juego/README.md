# juego/

Servicio estático independiente de Vercel, servido en `/juego` (ver el
servicio `"juego"` en `vercel.json` de la raíz del repo: `root: "juego/"`,
`framework: null`, sin build).

Ahora mismo esta carpeta solo contiene una página placeholder
(`index.html`, "Próximamente"). Cuando Memun tenga lista la build real del
juego, hay que sustituir ese `index.html` (y añadir aquí sus assets) por el
export del motor que se use — no importa si es un canvas en JS, una
exportación WebGL de Unity/Godot, o cualquier otra cosa: lo único que
necesita este servicio es terminar con un `index.html` funcional en la raíz
de esta carpeta, sin `npm install` ni paso de build en Vercel.

Si el motor elegido sí necesita un paso de build (por ejemplo, compilar a
WebAssembly), eso es un problema aparte que debe documentar el propio
README del juego — este archivo solo cubre el resultado final servido aquí.

## public/

Carpeta para los assets del juego (sprites, audio, etc.) una vez exista
contenido real. De momento solo tiene un `.gitkeep` para que Git la trackee
vacía.
