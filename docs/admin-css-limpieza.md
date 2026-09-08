# `/admin`: CSS muerta y dos estilos conviviendo

Nota para Hammad, de un repaso de estilo por `/admin`. Nada urgente ni
roto — dos cosas de limpieza/consistencia, baratas de arreglar cuando se
toque esa zona a fondo. No las he tocado.

## 1. CSS muerta en `admin.css`

`.equipo-accesos-table-react`, `.equipo-accesos-checkboxes-react` y
`.equipo-accesos-form-react` (`frontend/src/styles/admin.css:630-662`, 33
líneas) no las usa ningún componente:

```css
.equipo-accesos-table-react { ... }        /* admin.css:630 */
.equipo-accesos-table-react th, td { ... } /* admin.css:636 */
.equipo-accesos-checkboxes-react { ... }   /* admin.css:644 */
.equipo-accesos-checkboxes-react label { ... } /* admin.css:650 */
.equipo-accesos-form-react { ... }         /* admin.css:657 */
```

`EquipoAccesosPanel.tsx` (que es quien pintaba esa tabla) se reescribió en
algún momento con Tailwind + shadcn directamente:

```tsx
// EquipoAccesosPanel.tsx:262
<table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
```

y esas clases quedaron huérfanas. Solo sigue viva
`.equipo-accesos-panel-react` (`admin.css:626`, el `<section>` envolvente).

**Arreglo**: borrar las 33 líneas de `admin.css:630-662`, dejar el
comentario de sección (`admin.css:624`) y la regla de `panel-react`.

## 2. Dos estilos de componente conviviendo en `/admin`

`AdminStats`, `AdminToolbar`, `RecordsTable`, `EstadoTabs` y
`AdminLoginForm` están escritos con clases CSS propias (`.admin-*-react`,
`.records-table-react`...) a mano en `admin.css`. `CalendarioPanel.tsx` y
`EquipoAccesosPanel.tsx` están escritos con utilidades de Tailwind +
componentes de shadcn (`shadcn-scope`, `w-full`, `overflow-x-auto`...).

Ninguno de los dos está mal — los dos funcionan y se ven bien — pero es la
costura de dos épocas del código, y si se sigue construyendo en `/admin`
vale la pena decidir hacia cuál converger en vez de sumar una tercera
variante.

## 3. Los colores de estado se separaron de `tokens.css` (relacionado, no pedido explícitamente, lo dejo aquí para no perderlo)

`admin.css` tiene sus propios hex para pendiente/aceptado/rechazado en vez
de los tokens que usa el resto del sitio (`marketing.css`, `equipo.css`), y
ya no coinciden exactamente:

| | `tokens.css` | `admin.css` |
|---|---|---|
| verde (éxito) fondo | `#e3f6e8` | `#eefaf2` |
| verde texto | `#1d7a3d` | `#1a9c5c` |
| ámbar (aviso) fondo | `#fdf1dd` | `#fef8ec` |
| ámbar texto | `#9a5b06` | `#a3690a` |

**Arreglo**: sustituir esos hex por `var(--color-success-bg)` /
`var(--color-success-text)` / `var(--color-info-bg)` / `var(--color-info-text)`
(`tokens.css:21-24`).
