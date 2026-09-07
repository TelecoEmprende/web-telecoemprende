/**
 * Departamento de Eventos.
 *
 * Todavía sin contenido propio: hereda el shell de `/equipo` (sidebar, barra,
 * área de trabajo), así que cuando haya paneles que montar solo hay que
 * devolverlos aquí, sin volver a resolver la navegación ni el layout.
 */
export function EventosDashboard() {
  return (
    <section>
      <header className="equipo-panel-header-react">
        <h3>Eventos</h3>
      </header>
      <p className="equipo-vacio-react">
        Este departamento aún no tiene panel. Mientras tanto, los eventos del
        club se ven en <strong>Inicio</strong> y se gestionan desde el panel de
        administración.
      </p>
    </section>
  );
}
