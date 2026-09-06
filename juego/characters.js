// Datos de los 8 personajes del juego "Elige tu camino".
// Cada personaje: { id, nombre, rol, retrato, iniciales, colorSprite, paginas, cierre, departamentos, posicion }
// - retrato: ruta ABSOLUTA (empieza por /juego/...) a una foto real, o null si
//   no hay foto (se dibuja un sprite pixel-art placeholder con las iniciales y
//   `colorSprite`, ver game.js). Tiene que ser absoluta: se usa como
//   `img.src` desde JS, que resuelve contra la URL de la página (/juego), no
//   contra este módulo — una ruta relativa aquí se rompía en producción.
// - colorSprite: color de acento del sprite/retrato pixelado (placeholder o marco de la foto real).
// - paginas: la historia contada en primera persona por el propio personaje,
//   se muestra página a página con efecto máquina de escribir.
// - cierre: texto final que conecta la historia con un departamento del club.
// - departamentos: ids de departamentos con los que conecta (ver DEPARTAMENTOS abajo).
// - posicion: {col, row} en el mapa del mundo (ver MAPA en world.js), en tiles.
//
// Fuentes verificadas por búsqueda web (septiembre 2026) para cada persona real:
// Juan de Antonio (Crunchbase, StartupGrind, TheOrg, ETSIT.upm.es), TaxDown —
// Enrique García Moreno y Joaquín Fernández (LinkedIn, TheOrg, Crunchbase,
// Economia3, El Español, taxdown.es/blog), Rebeca Minguela (Wikipedia, WEF,
// Crunchbase, Santander biography), Nuria Oliver (ellisalicante.org,
// ResearchGate), Samuel Gil (LinkedIn, TheOrg, El Español), Ignacio
// García-Carrillo (LinkedIn, ETSIT alumni "Conversaciones Alumni").

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
      "Soy Juan de Antonio. Estudié Ingeniería de Telecomunicación aquí, en la ETSIT-UPM, exactamente donde tú estás ahora.",
      "Al terminar trabajé como desarrollador en Ericsson y en Nokia, y después pasé tres años como consultor en Boston Consulting Group. Quería entender cómo funcionaban las empresas por dentro antes de montar la mía.",
      "Una beca Fulbright me llevó a hacer el MBA en Stanford. Allí, en Silicon Valley, vi de cerca cómo se construye una startup desde cero.",
      "En 2011 fundé Cabify. Hoy es una de las plataformas de movilidad más grandes nacidas en España, presente en varios países. He vuelto a la ETSIT a contarlo porque quiero que sepáis que esto se puede hacer desde aquí.",
    ],
    cierre:
      "Empecé exactamente donde tú puedes estar ahora, estudiando Teleco en la ETSIT. Si te imaginas construyendo algo así desde cero, tu sitio está en el departamento de Tech/Ingeniería.",
    departamentos: ["tech"],
    posicion: { col: 11, row: 8 },
  },
  {
    id: "ignacio-garcia-carrillo",
    nombre: "Ignacio García-Carrillo",
    rol: "Account Executive en AMD",
    retrato: "/juego/public/retratos/ignacio-garcia-carrillo.jpg",
    iniciales: "IG",
    colorSprite: "#88a5b7",
    paginas: [
      "Soy Ignacio García-Carrillo, alumni de la ETSIT-UPM. Hoy trabajo como Account Executive en AMD, una de las mayores tecnológicas del mundo.",
      "Llevo más de 25 años en telecomunicaciones y tecnología, con paso por Europa, Estados Unidos y Latinoamérica en puestos de responsabilidad.",
      "Mi día a día no es escribir código: es el lado comercial y estratégico de la tecnología, entender qué necesita el mercado y llevar ahí lo que la ingeniería construye.",
      "He vuelto a la ETSIT para compartir con vosotros mi visión del sector tecnológico global, vista desde dentro de una multinacional del semiconductor.",
    ],
    cierre:
      "Si lo tuyo es contar y vender lo que otros construyen, encajas en el departamento de Marketing/Comms del club.",
    departamentos: ["marketing"],
    posicion: { col: 7, row: 4 },
  },
  {
    id: "samuel-gil",
    nombre: "Samuel Gil",
    rol: "Managing Partner y CEO de JME Ventures",
    retrato: "/juego/public/retratos/samuel-gil.jpg",
    iniciales: "SG",
    colorSprite: "#f4b044",
    paginas: [
      "Soy Samuel Gil, Ingeniero de Telecomunicación por la UPM. Desde 2014 soy Managing Partner y CEO de JME Ventures, uno de los fondos de capital riesgo más conocidos del ecosistema español.",
      "Antes pasé por Faraday Venture Partners como Investment Manager, por Iberdrola en trading de energía y por Accenture como consultor tecnológico.",
      "Invierto en startups en fase muy temprana. He visto de cerca qué hace que un proyecto despegue y qué hace que se quede a medio camino.",
      "Vengo a la ETSIT a hablaros del otro lado de la mesa: el de invertir, el que casi nadie ve cuando solo conoce el resultado final de una startup.",
    ],
    cierre:
      "Ningún proyecto me convence sin producto, sin comunicación y sin que alguien lo ejecute. Mi camino no apunta a un único departamento: explora los tres y encuentra el tuyo.",
    departamentos: ["tech", "marketing", "eventos"],
    posicion: { col: 15, row: 8 },
  },
  {
    id: "enrique-garcia-moreno",
    nombre: "Enrique García Moreno",
    rol: "Founder & CEO de TaxDown",
    retrato: null,
    iniciales: "EG",
    colorSprite: "#1a9c5c",
    paginas: [
      "Soy Enrique García Moreno. En 2019 cofundé TaxDown junto con Álvaro Falcones y Joaquín Fernández, en una pequeña oficina del madrileño Malasaña.",
      "La idea nació de algo muy concreto: mucha gente presenta la declaración de la renta sin aprovechar todas las deducciones a las que tiene derecho, por desconocimiento o porque el sistema fiscal es un lío.",
      "Empezamos gestionando 400 declaraciones. Hoy TaxDown es una de las fintechs de referencia en España, con más de cuatro millones de usuarios en España y México.",
      "He vuelto a la ETSIT para contar cómo se construye una empresa que quita, literalmente, un dolor de cabeza a millones de personas.",
    ],
    cierre:
      "Convertir un problema cotidiano en un producto que usan millones de personas es, sobre todo, saber contarlo y hacer que la gente confíe en él: el departamento de Marketing/Comms conecta directamente con esa parte de mi camino.",
    departamentos: ["marketing"],
    posicion: { col: 18, row: 7 },
  },
  {
    id: "joaquin-fernandez",
    nombre: "Joaquín Fernández",
    rol: "Founder & CTO de TaxDown",
    retrato: null,
    iniciales: "JF",
    colorSprite: "#0f8a6f",
    paginas: [
      "Soy Joaquín Fernández, cofundador y CTO de TaxDown, junto a Enrique García y Álvaro Falcones.",
      "Antes de TaxDown pasé por SAP, IBM y Aspera (una empresa de IBM), construyendo software para clientes muy distintos entre sí.",
      "Estudié Information Technology & Management en el Illinois Institute of Technology, especializándome en ingeniería de software.",
      "Mi trabajo en TaxDown es que la tecnología aguante: automatizar algo tan complicado como una declaración de la renta para más de cuatro millones de usuarios sin que se caiga nada.",
    ],
    cierre:
      "Si te imaginas construyendo la tecnología que hace posible un producto usado por millones de personas, tu sitio está en el departamento de Tech/Ingeniería.",
    departamentos: ["tech"],
    posicion: { col: 19, row: 7 },
  },
  {
    id: "rebeca-minguela",
    nombre: "Rebeca Minguela",
    rol: "Founder & CEO de Clarity AI",
    retrato: null,
    iniciales: "RM",
    colorSprite: "#b95208",
    paginas: [
      "Soy Rebeca Minguela. Tengo un doble grado en Ingeniería de Telecomunicación por la UPM y la Universidad de Stuttgart, y un MBA por Harvard Business School.",
      "Fundé Blink Booking, la app líder en Europa de reservas de última hora en hoteles, con más de 800.000 descargas y 3.000 hoteles. La vendimos a Groupon en 2013.",
      "Después trabajé como Global Head of Digital Transformation en Banco Santander y como directora de producto y operaciones en Groupon, antes de fundar mi siguiente empresa.",
      "Hoy soy Founder y CEO de Clarity AI, una plataforma que usa inteligencia artificial para medir el impacto social y ambiental de las inversiones, con más de 300 empleados e inversores como BlackRock y SoftBank. En 2017 el Foro Económico Mundial me nombró Young Global Leader.",
    ],
    cierre:
      "Empecé exactamente donde tú puedes estar ahora: estudiando Teleco. Construí una empresa, la vendí, y construí otra todavía más grande. Mi formación técnica conecta con el departamento de Tech/Ingeniería del club.",
    departamentos: ["tech"],
    posicion: { col: 14, row: 10 },
  },
  {
    id: "nuria-oliver",
    nombre: "Nuria Oliver",
    rol: "Directora Científica y cofundadora de ELLIS Alicante",
    retrato: null,
    iniciales: "NO",
    colorSprite: "#18374b",
    paginas: [
      "Soy Nuria Oliver, doctora en Inteligencia Artificial por el MIT y una de las científicas de datos más influyentes de España.",
      "Antes de dedicarme por completo a la investigación, trabajé en Microsoft Research, Telefónica y Vodafone, cruzando el mundo de la empresa privada.",
      "Soy directora científica y cofundadora de ELLIS Alicante, una fundación europea de excelencia en inteligencia artificial, y también presido el Patronato de la UNED.",
      "En 2025 recibí el Premio Nacional de Investigación Julio Rey Pastor por mis contribuciones en IA, sobre todo en el análisis del comportamiento humano y la interacción persona-máquina. En 2024 la Comisión Europea me nombró presidenta del grupo de trabajo de transparencia para el primer Código de Buenas Prácticas de IA de uso general.",
    ],
    cierre:
      "Si la ingeniería y la investigación te llaman la atención como a mí, el departamento de Tech/Ingeniería es tu sitio.",
    departamentos: ["tech"],
    posicion: { col: 13, row: 4 },
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
      "Soy Natalia Rodríguez y formo parte del ecosistema emprendedor español, ese espacio donde una idea se convierte poco a poco en un proyecto real.",
      "Mi camino, como el de tantos emprendedores, no fue una línea recta: estuvo hecho de intentos, ajustes y aprender sobre la marcha.",
      "Lo que define a alguien así no es un único logro, sino la manera de sostener un proyecto cuando todavía nadie más cree en él.",
      "Esa misma actitud, la de construir algo desde cero y contarlo bien, es la que quiero acercaros hoy.",
    ],
    cierre:
      "Si te gusta contar historias como la de un proyecto que arranca desde cero, el departamento de Marketing/Comms te espera.",
    departamentos: ["marketing"],
    posicion: { col: 4, row: 9 },
  },
];
