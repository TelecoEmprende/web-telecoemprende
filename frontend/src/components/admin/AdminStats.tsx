import { useMemo, type ReactNode } from "react";

import type { Registro } from "../../types/admin";

type AdminStatsProps = {
  registros: Registro[];
};

function porcentaje(parte: number, total: number) {
  if (total === 0) return 0;
  return Math.round((parte / total) * 100);
}

function agruparPorDia(registros: Registro[]) {
  const porDia = new Map<string, number>();
  for (const r of registros) {
    const dia = r.fecha.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function agruparPor(registros: Registro[], campo: (r: Registro) => string) {
  const conteo = new Map<string, number>();
  for (const r of registros) {
    const clave = campo(r) || "Sin especificar";
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()].sort(([, a], [, b]) => b - a);
}

function StatCard({
  value,
  label,
  className = "border-[#e2e9f3] bg-[#f8fbff]",
  valueClassName = "text-[var(--color-navy)]",
}: {
  value: number;
  label: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-[18px] border px-[18px] py-4 ${className}`}>
      <span className={`text-[1.7rem] font-black tracking-[-0.03em] ${valueClassName}`}>
        {value}
      </span>
      <span className="text-[0.82rem] font-bold text-muted-foreground">{label}</span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[#e2e9f3] bg-white px-5 py-[18px]">
      <h2 className="mb-3.5 text-[0.92rem] font-extrabold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Breakdown({ filas, total }: { filas: [string, number][]; total: number }) {
  return (
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {filas.map(([nombre, count]) => (
        <li
          key={nombre}
          className="grid grid-cols-[minmax(110px,1.3fr)_minmax(50px,1fr)_28px] items-center gap-2.5 text-[0.86rem]"
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-bold text-foreground">
            {nombre}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-[#eef2f7]">
            <span
              className="block h-full rounded-full bg-[var(--color-navy)]"
              style={{ width: `${porcentaje(count, total)}%` }}
            />
          </span>
          <span className="text-right font-bold text-muted-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Panel de estadísticas del evento activo. Se calcula todo a partir de los
 * `registros` que llegan (ya filtrados por evento en AdminPage), así que
 * sirve igual para cualquier evento futuro sin tocar este componente.
 */
export function AdminStats({ registros }: AdminStatsProps) {
  const total = registros.length;

  const porEstado = useMemo(() => {
    const conteo: Record<string, number> = { pendiente: 0, aceptado: 0, rechazado: 0, waitlist: 0 };
    for (const r of registros) conteo[r.estado] = (conteo[r.estado] ?? 0) + 1;
    return conteo;
  }, [registros]);

  const pendientesNotificar = useMemo(
    () => registros.filter((r) => r.estado !== "pendiente" && !r.notificado).length,
    [registros],
  );

  const ultimas24h = useMemo(() => {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return registros.filter((r) => new Date(r.fecha.replace(" ", "T")).getTime() >= limite).length;
  }, [registros]);

  const porDia = useMemo(() => agruparPorDia(registros), [registros]);
  const maxDia = Math.max(1, ...porDia.map(([, count]) => count));

  const porDepartamento = useMemo(
    () => agruparPor(registros, (r) => r.departamento),
    [registros],
  );
  const porEscuela = useMemo(
    () => agruparPor(registros, (r) => r.escuela).slice(0, 6),
    [registros],
  );

  if (total === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <StatCard value={total} label="Solicitudes totales" />
        <StatCard value={ultimas24h} label="Últimas 24h" />
        <StatCard
          value={porEstado.aceptado}
          label={`Aceptados · ${porcentaje(porEstado.aceptado, total)}%`}
          className="border-[#cdedd9] bg-[var(--color-success-bg)]"
          valueClassName="text-[var(--color-success-text)]"
        />
        <StatCard
          value={porEstado.waitlist}
          label={`Waitlist · ${porcentaje(porEstado.waitlist, total)}%`}
          className="border-[#f5e3bc] bg-[var(--color-info-bg)]"
          valueClassName="text-[var(--color-info-text)]"
        />
        <StatCard
          value={porEstado.rechazado}
          label={`Rechazados · ${porcentaje(porEstado.rechazado, total)}%`}
          className="border-[#f6cfd2] bg-[var(--color-error-bg)]"
          valueClassName="text-[var(--color-error-text)]"
        />
        <StatCard
          value={pendientesNotificar}
          label="Por notificar"
          valueClassName="text-slate-600"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <ChartCard title="Solicitudes en el tiempo">
          <div
            className="flex h-24 items-end gap-[3px] overflow-x-auto pb-0.5"
            role="img"
            aria-label={`Solicitudes por día, del ${porDia[0]?.[0]} al ${porDia[porDia.length - 1]?.[0]}`}
          >
            {porDia.map(([dia, count]) => (
              <span
                key={dia}
                className="min-w-2 flex-[0_0_8px] rounded-t-[3px] bg-gradient-to-b from-[var(--color-orange)] to-[var(--color-gold)]"
                style={{ height: `${Math.max(6, (count / maxDia) * 100)}%` }}
                title={`${dia}: ${count}`}
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Por departamento">
          <Breakdown filas={porDepartamento} total={total} />
        </ChartCard>

        <ChartCard title="Por escuela">
          <Breakdown filas={porEscuela} total={total} />
        </ChartCard>
      </div>
    </div>
  );
}
