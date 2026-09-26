// Noticias del news-bot (repo internal-tools/news-bot). La API es de solo
// lectura y pública; la CSP la permite en connect-src (app.py y vercel.json).
export const NEWS_API = import.meta.env.DEV ? "/noticias-api" : "https://n8n.telecoemprende.es/webhook/noticias";

export const TEMAS = ["inversion", "ia", "startups", "finanzas", "tech"] as const;
export type Tema = (typeof TEMAS)[number];

export type Fuente = { medio: string | null; titulo: string | null; url: string };

export type Noticia = {
  id: number;
  fecha: string; // YYYY-MM-DD, día UTC en que se analizó
  tema: Tema;
  relevancia: number | null;
  fuentes_count: number;
  titular: string | null;
  que_paso: string | null;
  por_que_importa: string | null;
  fuentes: Fuente[];
};

export type Dia = { fecha: string; noticias: Noticia[] };

export async function fetchNoticias(dias: number, limite: number, signal?: AbortSignal): Promise<Noticia[]> {
  const res = await fetch(`${NEWS_API}?dias=${dias}&limite=${limite}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { noticias?: Noticia[] };
  return (data.noticias ?? []).filter((n) => (TEMAS as readonly string[]).includes(n.tema));
}

/** Agrupa por día (el más reciente primero) y ordena cada día por relevancia. */
export function agruparPorDia(noticias: Noticia[], tema: Tema | null = null): Dia[] {
  const porDia = new Map<string, Noticia[]>();
  for (const n of noticias) {
    if (tema && n.tema !== tema) continue;
    porDia.set(n.fecha, [...(porDia.get(n.fecha) ?? []), n]);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, lista]) => ({
      fecha,
      noticias: lista.sort((a, b) => (b.relevancia ?? -1) - (a.relevancia ?? -1) || b.fuentes_count - a.fuentes_count),
    }));
}

/** «Hoy», «Ayer» o nada, comparando con la fecha de hoy en UTC (el mismo corte que la API). */
export function relativo(fecha: string, hoy: Date = new Date()): "hoy" | "ayer" | null {
  const d0 = hoy.toISOString().slice(0, 10);
  const ayer = new Date(hoy.getTime() - 86_400_000).toISOString().slice(0, 10);
  return fecha === d0 ? "hoy" : fecha === ayer ? "ayer" : null;
}
