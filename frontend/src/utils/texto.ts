/** Minúsculas y sin tildes, para que "Nunez" encuentre a "Núñez". */
export function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
