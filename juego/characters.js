// Datos de los 7 personajes del juego "Elige tu camino".
// Cada personaje: { id, nombre, rol, retrato, iniciales, colorSprite, paginas, cierre, departamentos, posicion }
// - retrato: ruta a una foto real, o null si no hay foto (se dibuja un sprite
//   pixel-art placeholder con las iniciales y `colorSprite`, ver game.js).
// - colorSprite: color de acento del sprite/retrato pixelado (placeholder o marco de la foto real).
// - paginas: párrafos de la historia, se muestran uno a uno con efecto máquina de escribir.
// - cierre: texto final que conecta la historia con un departamento del club.
// - departamentos: ids de departamentos con los que conecta (ver DEPARTAMENTOS abajo).
// - posicion: {col, row} en el mapa del mundo (ver MAPA en world.js), en tiles.
//
// Fuentes verificadas por búsqueda web (septiembre 2026) para cada persona real:
// Juan de Antonio (Crunchbase, StartupGrind, TheOrg, ETSIT.upm.es), TaxDown/Enrique
// García Moreno (LinkedIn, Economia3, El Español, taxdown.es/blog), Rebeca Minguela
// (Wikipedia, WEF, Crunchbase, Santander biography), Nuria Oliver (ellisalicante.org,
// ResearchGate), Samuel Gil (LinkedIn, TheOrg, El Español), Ignacio García-Carrillo
// (LinkedIn, ETSIT alumni "Conversaciones Alumni").

export const DEPARTAMENTOS = {
  tech: { nombre: "Tech/Ingeniería", icono: "💻" },
  marketing: { nombre: "Marketing/Comms", icono: "📣" },
  eventos: { nombre: "Eventos/Logística", icono: "🎤" },
};

export const PERSONAJES = [
  {
    id: "juan-de-antonio",
    nombre: "Juan de Antonio",
    rol: "Founder & CEO de Cabify",
    retrato: null,
    iniciales: "JA",
    colorSprite: "#e0680e",
    paginas: [
      "Juan de Antonio es Ingeniero de Telecomunicación por la ETSIT-UPM, la misma escuela de la que nace TelecoEmprende.",
      "Empezó como desarrollador en Ericsson y Nokia, y después pasó tres años como consultor de gestión en Boston Consulting Group.",
      "Una beca Fulbright lo llevó a hacer el MBA en Stanford, donde vivió de cerca el ecosistema startup de Silicon Valley.",
      "En 2011 fundó Cabify: hoy es una de las plataformas de movilidad más grandes nacidas en España, presente en varios países. Ha vuelto a la ETSIT a contarlo en las jornadas del club.",
    ],
    cierre:
      "Empezó exactamente donde tú puedes estar ahora, estudiando Teleco en la ETSIT. Si te imaginas construyendo algo así desde cero, tu sitio está en el departamento de Tech/Ingeniería.",
    departamentos: ["tech"],
    posicion: { col: 9, row: 7 },
  },
  {
    id: "ignacio-garcia-carrillo",
    nombre: "Ignacio García-Carrillo",
    rol: "Account Executive en AMD",
    retrato: "public/retratos/ignacio-garcia-carrillo.jpg",
    iniciales: "IG",
    colorSprite: "#88a5b7",
    paginas: [
      "Ignacio García-Carrillo es alumni de la ETSIT-UPM y hoy trabaja como Account Executive en AMD, una de las mayores tecnológicas del mundo.",
      "Tiene más de 25 años de experiencia internacional en telecomunicaciones y tecnología, con paso por puestos de responsabilidad en Europa, Estados Unidos y Latinoamérica.",
      "Su día a día no es escribir código: es el lado comercial y estratégico de la tecnología, entender qué necesita el mercado y llevar ahí lo que la ingeniería construye.",
      "Visitó la ETSIT para compartir con los estudiantes su visión del sector tecnológico global, vista desde dentro de una multinacional del semiconductor.",
    ],
    cierre:
      "Si lo tuyo es contar y vender lo que otros construyen, encajas en el departamento de Marketing/Comms del club.",
    departamentos: ["marketing"],
    posicion: { col: 5, row: 3 },
  },
  {
    id: "samuel-gil",
    nombre: "Samuel Gil",
    rol: "Managing Partner y CEO de JME Ventures",
    retrato: "public/retratos/samuel-gil.jpg",
    iniciales: "SG",
    colorSprite: "#f4b044",
    paginas: [
      "Samuel Gil es Ingeniero de Telecomunicación por la UPM y Managing Partner y CEO de JME Ventures, uno de los fondos de capital riesgo más conocidos del ecosistema español, desde 2014.",
      "Antes fue Investment Manager en Faraday Venture Partners, Energy Trading Manager en Iberdrola y consultor tecnológico en Accenture.",
      "Invierte en startups en fase muy temprana: ha visto de cerca qué hace que un proyecto despegue y qué hace que se quede a medio camino.",
      "En su visita a la ETSIT habló de inversión y de ecosistema emprendedor, del otro lado de la mesa que casi nadie ve cuando solo conoce el resultado final de una startup.",
    ],
    cierre:
      "Ningún proyecto convence a alguien como Samuel sin producto, sin comunicación y sin que alguien lo ejecute. Su camino no apunta a un único departamento: explora los tres y encuentra el tuyo.",
    departamentos: ["tech", "marketing", "eventos"],
    posicion: { col: 13, row: 7 },
  },
  {
    id: "enrique-garcia-moreno",
    nombre: "Enrique García Moreno",
    rol: "Founder & CEO de TaxDown",
    retrato: null,
    iniciales: "EG",
    colorSprite: "#1a9c5c",
    paginas: [
      "Enrique García Moreno cofundó TaxDown en 2019 junto con Álvaro Falcones y Joaquín Fernández, en una pequeña oficina del madrileño Malasaña.",
      "La idea nació de algo muy concreto: mucha gente presenta la declaración de la renta sin aprovechar todas las deducciones a las que tiene derecho, por desconocimiento o por lo complicado del sistema fiscal.",
      "Empezaron gestionando 400 declaraciones. Hoy TaxDown es una de las fintechs de referencia en España, con más de cuatro millones de usuarios en España y México.",
      "El equipo de TaxDown visitó la ETSIT para contar cómo se construye una empresa que quita, literalmente, un dolor de cabeza a millones de personas.",
    ],
    cierre:
      "Convertir un problema cotidiano en un producto que usan millones de personas es, sobre todo, saber contarlo y hacer que la gente confíe en él: el departamento de Marketing/Comms conecta directamente con esa parte del camino de Enrique.",
    departamentos: ["marketing"],
    posicion: { col: 16, row: 6 },
  },
  {
    id: "rebeca-minguela",
    nombre: "Rebeca Minguela",
    rol: "Founder & CEO de Clarity AI",
    retrato: null,
    iniciales: "RM",
    colorSprite: "#b95208",
    paginas: [
      "Rebeca Minguela tiene un doble grado en Ingeniería de Telecomunicación por la UPM y la Universidad de Stuttgart, y un MBA por Harvard Business School.",
      "Fundó Blink Booking, la app líder en Europa de reservas de última hora en hoteles, con más de 800.000 descargas y 3.000 hoteles — adquirida por Groupon en 2013.",
      "Después trabajó como Global Head of Digital Transformation en Banco Santander y como directora de producto y operaciones en Groupon, antes de fundar su siguiente empresa.",
      "Hoy es Founder y CEO de Clarity AI, una plataforma que usa inteligencia artificial para medir el impacto social y ambiental de las inversiones, con más de 300 empleados e inversores como BlackRock y SoftBank. En 2017 fue nombrada Young Global Leader por el Foro Económico Mundial.",
    ],
    cierre:
      "Empezó exactamente donde tú puedes estar ahora: estudiando Teleco. Construyó una empresa, la vendió, y construyó otra todavía más grande. Su formación técnica conecta con el departamento de Tech/Ingeniería del club.",
    departamentos: ["tech"],
    posicion: { col: 12, row: 9 },
  },
  {
    id: "nuria-oliver",
    nombre: "Nuria Oliver",
    rol: "Directora Científica y cofundadora de ELLIS Alicante",
    retrato: null,
    iniciales: "NO",
    colorSprite: "#18374b",
    paginas: [
      "Nuria Oliver es doctora en Inteligencia Artificial por el MIT y una de las científicas de datos más influyentes de España.",
      "Antes de dedicarse por completo a la investigación, trabajó en Microsoft Research, Telefónica y Vodafone, cruzando el mundo de la empresa privada.",
      "Es directora científica y cofundadora de ELLIS Alicante, una fundación europea de excelencia en inteligencia artificial, y también preside el Patronato de la UNED.",
      "En 2025 recibió el Premio Nacional de Investigación Julio Rey Pastor por sus contribuciones en IA, especialmente en el análisis del comportamiento humano y la interacción persona-máquina. En 2024 la Comisión Europea la nombró presidenta del grupo de trabajo de transparencia para el primer Código de Buenas Prácticas de IA de uso general.",
    ],
    cierre:
      "Si la ingeniería y la investigación te llaman la atención como a Nuria, el departamento de Tech/Ingeniería es tu sitio.",
    departamentos: ["tech"],
    posicion: { col: 11, row: 3 },
  },
  {
    id: "natalia-rodriguez",
    nombre: "Natalia Rodríguez",
    rol: "Emprendedora",
    // TODO: verificar biografía exacta de Natalia Rodríguez antes de publicar —
    // hay varias personas con este nombre en el ecosistema español y no hay
    // datos verificados que confirmen a cuál se refiere. Ver nota en
    // CONTEXTO_EQUIPO.md o preguntar a Hammad. No inventar cargos, empresas
    // ni cifras hasta confirmarlo.
    retrato: null,
    iniciales: "NR",
    colorSprite: "#9a5b06",
    paginas: [
      "Natalia Rodríguez forma parte del ecosistema emprendedor español, ese espacio donde una idea se convierte poco a poco en un proyecto real.",
      "Su camino, como el de tantos emprendedores, no fue una línea recta: estuvo hecho de intentos, ajustes y aprender sobre la marcha.",
      "Lo que define a alguien así no es un único logro, sino la manera de sostener un proyecto cuando todavía nadie más cree en él.",
      "Esa misma actitud, la de construir algo desde cero y contarlo bien, es la que TelecoEmprende busca acercar a sus estudiantes.",
    ],
    cierre:
      "Si te gusta contar historias como la de un proyecto que arranca desde cero, el departamento de Marketing/Comms te espera.",
    departamentos: ["marketing"],
    posicion: { col: 2, row: 8 },
  },
];
