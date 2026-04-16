import type { Registro } from "../../types/admin";

type RecordsTableProps = {
  registros: Registro[];
};

export function RecordsTable({ registros }: RecordsTableProps) {
  return (
    <div className="table-wrapper-react">
      <table className="records-table-react">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellidos</th>
            <th>Estudios / Procedencia</th>
            <th>Email</th>
            <th>Privacidad</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr
              key={`${registro.email}-${registro.fecha}-${registro.nombre}`}
            >
              <td>{registro.nombre}</td>
              <td>{registro.apellidos}</td>
              <td>{registro.estudios}</td>
              <td>{registro.email}</td>
              <td>{registro.privacidad}</td>
              <td>{registro.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
