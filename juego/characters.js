// Datos de los 8 personajes del juego "Elige tu camino".
//
// Cada personaje: { id, nombre, rol, retrato, crop, iniciales, colorSprite,
//                   paginas, pregunta, despues, cierre, departamentos, posicion }
//
// - retrato: ruta ABSOLUTA (empieza por /juego/...) a su foto, o null si no hay
//   foto (entonces se dibuja un sprite pixel-art con las iniciales y
//   `colorSprite`, ver game.js). Tiene que ser absoluta: se usa como
//   `img.src` desde JS, que resuelve contra la URL de la página (/juego), no
//   contra este módulo — una ruta relativa aquí se rompía en producción.
// - crop: qué cuadrado de la foto se pixela, para encuadrar la cara. `cx`/`cy`
//   son el centro (fracción del ancho/alto) y `size` el lado del cuadrado como
//   fracción del lado corto de la imagen. Sin `crop` se usa el cuadrado
//   centrado más grande posible. Ajusta estos números si una cara queda
//   descuadrada: no hace falta reeditar la foto.
// - paginas: primera parte de la conversación, en primera persona.
// - pregunta: { texto, opciones: [{ texto, respuesta: [...páginas] }] }. La
//   conversación se para aquí y quien juega elige; cada opción tiene su
//   respuesta. No hay opción "correcta": todas continúan la charla.
// - despues: páginas finales, después de responder a la pregunta.
// - cierre: texto que conecta la historia con un departamento del club.
// - departamentos: ids de departamentos con los que conecta (ver DEPARTAMENTOS).
// - posicion: {col, row} en el mapa del mundo (ver MAPA en world.js), en tiles.
//
// SOBRE EL CONTENIDO: los datos biográficos (estudios, empresas, cargos,
// premios) están verificados por búsqueda web (septiembre 2026). Fuentes: Juan
// de Antonio (Crunchbase, StartupGrind, TheOrg, etsit.upm.es), TaxDown —
// Enrique García Moreno y Joaquín Fernández (LinkedIn, TheOrg, Crunchbase,
// Economia3, El Español, taxdown.es/blog), Rebeca Minguela (Wikipedia, WEF,
// Crunchbase, Santander), Nuria Oliver (ellisalicante.org, ResearchGate),
// Samuel Gil (LinkedIn, TheOrg, El Español), Ignacio García-Carrillo (LinkedIn,
// ETSIT alumni), Natalia Rodríguez Núñez-Milara (Wikipedia, ICEX, innovaspain,
// saturnolabs.com).
//
// Las conversaciones (y sobre todo las respuestas a las preguntas) son una
// RECREACIÓN del club a partir de esa información pública: no son citas
// literales de estas personas. El aviso está también a la vista en la pantalla
// de inicio del juego (index.html). Si añades contenido, mantén esa separación:
// datos verificables en la biografía, opinión general en la conversación.
//
// Las fotos las aportó el club (carpeta UPM/TelecoEmprende 2026-2027).

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
    retrato: "/juego/public/retratos/juan-de-antonio.png",
    crop: { cx: 0.528, cy: 0.238, size: 0.476 },
    iniciales: "JA",
    colorSprite: "#e0680e",
    paginas: [
      "Soy Juan de Antonio. Estudié Ingeniería de Telecomunicación aquí, en la ETSIT-UPM, exactamente donde tú estás ahora.",
      "Al terminar trabajé como desarrollador en Ericsson y en Nokia. Después pasé tres años como consultor en Boston Consulting Group: quería entender cómo funcionan las empresas por dentro antes de montar la mía.",
      "Una beca Fulbright me llevó a hacer el MBA en Stanford. Estando allí ayudé a crecer la red internacional de ventas de Zero Motorcycles, una empresa californiana de motos eléctricas, y vi de cerca cómo se construye una startup desde cero.",
      "En 2011 fundé Cabify. Hoy es una de las plataformas de movilidad más grandes nacidas en España, presente en varios países.",
    ],
    pregunta: {
      texto:
        "Antes de fundar Cabify pasé por una multinacional, una consultora y una escuela de negocios al otro lado del mundo. ¿Qué dirías que sirve más para acabar montando algo propio?",
      opciones: [
        {
          texto: "Lo técnico: saber construir el producto",
          respuesta: [
            "Es la base, y en una escuela como esta la vas a tener. Pero saber construir no te dice qué construir: eso solo lo aprendes hablando con quien tiene el problema.",
          ],
        },
        {
          texto: "Entender cómo funciona un negocio por dentro",
          respuesta: [
            "Ayuda muchísimo, sí. Ver desde dentro cómo se toman las decisiones en una empresa grande te ahorra cometer tú solo todos los errores.",
            "Aunque ningún análisis sustituye a lanzar algo y ver qué pasa. En algún momento hay que dejar la diapositiva y montarlo.",
          ],
        },
        {
          texto: "Salir fuera y ver que otros ya lo estaban haciendo",
          respuesta: [
            "Eso cambia la cabeza. Cuando ves de cerca a gente parecida a ti montando empresas, deja de parecer algo reservado a otros.",
            "Y esa es la parte que sí puedes tener aquí sin cruzar el charco: rodearte de gente que está construyendo.",
          ],
        },
      ],
    },
    despues: [
      "Montar Cabify no fue una idea genial en una servilleta: fue mucho tiempo entendiendo un problema que la gente tenía todos los días y muchas decisiones difíciles después.",
      "He vuelto a la ETSIT a contarlo porque quiero que sepas que esto se puede hacer desde aquí, con la formación que estás recibiendo ahora mismo.",
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
    crop: { cx: 0.5, cy: 0.411, size: 0.821 },
    iniciales: "IG",
    colorSprite: "#88a5b7",
    paginas: [
      "Soy Ignacio García-Carrillo, alumni de la ETSIT-UPM. Hoy trabajo como Account Executive en AMD, una de las mayores tecnológicas del mundo.",
      "Llevo más de 25 años en telecomunicaciones y tecnología, con puestos de responsabilidad en Europa, Estados Unidos y Latinoamérica.",
      "Mi día a día no es escribir código: es el lado comercial y estratégico de la tecnología. Entender qué necesita el mercado y llevar ahí lo que la ingeniería construye.",
    ],
    pregunta: {
      texto:
        "Cuando trabajas con clientes grandes, hay algo que pesa más que el resto. ¿Qué dirías que decide un acuerdo?",
      opciones: [
        {
          texto: "Tener el mejor producto",
          respuesta: [
            "El producto tiene que estar a la altura, claro. Pero he visto perder acuerdos a productos mejores que el del competidor, y ganarlos a productos peores.",
            "La diferencia casi nunca está en la ficha técnica.",
          ],
        },
        {
          texto: "Entender de verdad su problema",
          respuesta: [
            "Ahí está. La mayor parte de este trabajo es escuchar hasta entender el problema mejor de lo que te lo saben contar.",
            "Y para eso, ser ingeniero ayuda más de lo que parece: entiendes lo que se puede y lo que no.",
          ],
        },
        {
          texto: "El precio",
          respuesta: [
            "Importa, pero si la conversación acaba siendo solo el precio, normalmente es que no has conseguido explicar el valor de lo que llevas.",
          ],
        },
      ],
    },
    despues: [
      "Vengo a la ETSIT a contaros esto porque en tecnología no todo es programar: hace falta también quien entienda el negocio y sepa contarlo.",
      "Y esa parte se aprende, como todo, practicando: hablando con gente, presentando, equivocándote delante de otros.",
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
    retrato: "/juego/public/retratos/samuel-gil.png",
    crop: { cx: 0.462, cy: 0.314, size: 0.575 },
    iniciales: "SG",
    colorSprite: "#f4b044",
    paginas: [
      "Soy Samuel Gil, Ingeniero de Telecomunicación por la UPM. Desde 2014 soy Managing Partner y CEO de JME Ventures, uno de los fondos de capital riesgo más conocidos del ecosistema español.",
      "Antes pasé por Faraday Venture Partners como Investment Manager, por Iberdrola en trading de energía y por Accenture como consultor tecnológico.",
      "Invierto en startups en fase muy temprana: cuando llego, casi nada está demostrado todavía.",
    ],
    pregunta: {
      texto:
        "Imagina que estás en mi silla. Te llega un proyecto en el que casi nada funciona aún. ¿En qué te fijarías antes de invertir?",
      opciones: [
        {
          texto: "En la idea",
          respuesta: [
            "Las ideas son más baratas de lo que parecen: casi siempre hay varios equipos con la misma al mismo tiempo.",
            "Además, la idea con la que empiezas rara vez es con la que acabas.",
          ],
        },
        {
          texto: "En el equipo",
          respuesta: [
            "Eso es lo que miro yo. La idea va a cambiar; el equipo es quien decide cómo cambia.",
            "Busco gente que aprenda rápido y que aguante cuando la cosa se pone fea, que es la mayor parte del tiempo.",
          ],
        },
        {
          texto: "En los números",
          respuesta: [
            "En fase temprana casi no hay números que mirar, y los que hay se pueden maquillar sin mentir.",
            "Sirven más para entender cómo piensa el equipo que para saber si el negocio funciona.",
          ],
        },
      ],
    },
    despues: [
      "He visto de cerca qué hace que un proyecto despegue y qué hace que se quede a medio camino, y casi nunca es lo que la gente cree desde fuera.",
      "Por eso vengo a la ETSIT: para contaros el otro lado de la mesa, ese que casi nadie ve cuando solo conoce el resultado final de una startup.",
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
    retrato: "/juego/public/retratos/enrique-garcia-moreno.png",
    crop: { cx: 0.496, cy: 0.313, size: 0.583 },
    iniciales: "EG",
    colorSprite: "#1a9c5c",
    paginas: [
      "Soy Enrique García Moreno. En 2019 cofundé TaxDown junto con Álvaro Falcones y Joaquín Fernández, en una oficina pequeña del madrileño barrio de Malasaña.",
      "La idea nació de algo muy concreto: mucha gente presenta la declaración de la renta sin aprovechar todas las deducciones a las que tiene derecho, por desconocimiento o porque el sistema fiscal es un lío.",
      "Empezamos gestionando 400 declaraciones. Hoy TaxDown es una de las fintechs de referencia en España, con más de cuatro millones de usuarios en España y México.",
    ],
    pregunta: {
      texto:
        "De 400 declaraciones a millones de usuarios. ¿Qué crees que fue lo más difícil de ese salto?",
      opciones: [
        {
          texto: "Que la tecnología aguantara",
          respuesta: [
            "Es un reto enorme, y por eso Joaquín está por aquí: sin una base técnica que aguante, no hay producto.",
            "Pero el día que te caes es un mal día; el día que nadie confía en ti no tienes ni empresa.",
          ],
        },
        {
          texto: "Que la gente confiara en vosotros",
          respuesta: [
            "Eso es lo más difícil, sí. Estás pidiendo a alguien que te deje entrar en sus impuestos: no hay nada más sensible.",
            "La confianza no se compra con publicidad: se gana explicando bien lo que haces y cumpliéndolo cada año.",
          ],
        },
        {
          texto: "Conseguir dinero para crecer",
          respuesta: [
            "Hace falta, claro, y hemos levantado rondas para poder crecer.",
            "Pero el dinero llega cuando ya has demostrado algo. Primero hay que tener usuarios contentos.",
          ],
        },
      ],
    },
    despues: [
      "Lo que hacemos suena aburrido dicho rápido: declaraciones de la renta. Pero por dentro es tecnología, producto y saber explicárselo a alguien que odia el tema.",
      "Vine a la ETSIT a contar cómo se construye una empresa que quita, literalmente, un dolor de cabeza a millones de personas.",
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
    retrato: "/juego/public/retratos/joaquin-fernandez.png",
    crop: { cx: 0.66, cy: 0.218, size: 0.596 },
    iniciales: "JF",
    colorSprite: "#0f8a6f",
    paginas: [
      "Soy Joaquín Fernández, cofundador y CTO de TaxDown, junto a Enrique García y Álvaro Falcones.",
      "Antes de TaxDown pasé por SAP, IBM y Aspera, una empresa de IBM, construyendo software para clientes muy distintos entre sí.",
      "Estudié Information Technology & Management en el Illinois Institute of Technology, especializándome en ingeniería de software.",
      "Mi trabajo aquí es que la tecnología aguante: automatizar algo tan enrevesado como una declaración de la renta, para millones de personas, sin que se caiga nada.",
    ],
    pregunta: {
      texto:
        "Automatizar la renta significa meter una ley enorme, llena de excepciones, dentro de un programa. Si te tocara a ti, ¿por dónde empezarías?",
      opciones: [
        {
          texto: "Por el caso más común",
          respuesta: [
            "Es por donde yo empezaría. Si resuelves bien el caso que le pasa a la mayoría, ya estás ayudando a mucha gente desde el primer día.",
            "Las excepciones se van añadiendo después, una a una, y nunca se acaban.",
          ],
        },
        {
          texto: "Por el caso más complicado",
          respuesta: [
            "Es tentador, porque es el reto bonito. El problema es que puedes pasarte meses ahí y no tener todavía nada que sirva a nadie.",
          ],
        },
        {
          texto: "Copiando lo que hace un asesor fiscal",
          respuesta: [
            "Hay que entender muy bien cómo trabaja alguien que sabe, sí. Pero copiar su proceso tal cual te lleva a automatizar también sus limitaciones.",
            "Lo interesante es preguntarse qué haría si tuviera todos los datos delante a la vez.",
          ],
        },
      ],
    },
    despues: [
      "Al final, la parte técnica de una empresa así no se ve: cuando funciona, el usuario solo nota que le ha salido bien la declaración.",
      "Y eso, para quien está detrás construyéndolo, es lo más satisfactorio que hay.",
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
    retrato: "/juego/public/retratos/rebeca-minguela.png",
    crop: { cx: 0.493, cy: 0.262, size: 0.667 },
    iniciales: "RM",
    colorSprite: "#b95208",
    paginas: [
      "Soy Rebeca Minguela. Tengo un doble grado en Ingeniería de Telecomunicación por la UPM y la Universidad de Stuttgart, y un MBA por Harvard Business School.",
      "Fundé Blink Booking, la app líder en Europa de reservas de última hora en hoteles, con más de 800.000 descargas y 3.000 hoteles. La compró Groupon en 2013.",
      "Después trabajé como Global Head of Digital Transformation en Banco Santander y como directora de producto y operaciones en Groupon.",
      "Hoy soy fundadora y CEO de Clarity AI, una plataforma que usa inteligencia artificial para medir el impacto social y ambiental de las inversiones. Somos más de 300 personas y entre nuestros inversores están BlackRock y SoftBank.",
    ],
    pregunta: {
      texto:
        "Vendí mi primera empresa y podría haber parado ahí. ¿Por qué crees que volví a empezar de cero?",
      opciones: [
        {
          texto: "Por dinero",
          respuesta: [
            "Si fuera por eso, montar otra empresa es de las peores maneras de conseguirlo: son años de incertidumbre.",
          ],
        },
        {
          texto: "Porque quedaba un problema más grande por resolver",
          respuesta: [
            "Esa es la razón. Después de vender aprendes que lo difícil no es tener una empresa, es elegir bien en qué gastas los próximos diez años.",
            "Medir el impacto real de dónde se pone el dinero me pareció un problema lo bastante grande.",
          ],
        },
        {
          texto: "Porque cuesta parar",
          respuesta: [
            "Hay algo de eso, no te voy a mentir. Pero volver a empezar sin una razón de peso se hace muy cuesta arriba el primer año.",
          ],
        },
      ],
    },
    despues: [
      "En 2017 el Foro Económico Mundial me nombró Young Global Leader, pero lo que más me sigue sorprendiendo es lo lejos que se puede llegar desde una escuela de ingeniería.",
      "Empecé exactamente donde tú puedes estar ahora: estudiando Teleco, sin saber todavía qué iba a construir.",
    ],
    cierre:
      "Construí una empresa, la vendí, y construí otra todavía más grande. Mi formación técnica conecta con el departamento de Tech/Ingeniería del club.",
    departamentos: ["tech"],
    // Delante de Secretaría: la fila 10 la ocupa el edificio, así que va justo debajo.
    posicion: { col: 14, row: 11 },
  },
  {
    id: "nuria-oliver",
    nombre: "Nuria Oliver",
    rol: "Directora Científica y cofundadora de ELLIS Alicante",
    retrato: "/juego/public/retratos/nuria-oliver.jpg",
    crop: { cx: 0.5, cy: 0.5, size: 1 },
    iniciales: "NO",
    colorSprite: "#18374b",
    paginas: [
      "Soy Nuria Oliver, doctora en Inteligencia Artificial por el MIT y una de las científicas de datos más citadas de España.",
      "Antes de dedicarme por completo a la investigación pública, trabajé en Microsoft Research, en Telefónica y en Vodafone.",
      "Hoy soy directora científica y cofundadora de ELLIS Alicante, una fundación europea de excelencia en inteligencia artificial, y presido el Patronato de la UNED.",
    ],
    pregunta: {
      texto:
        "He investigado dentro de grandes empresas y también desde lo público. ¿Dónde crees que se investiga con más libertad?",
      opciones: [
        {
          texto: "En la empresa: hay más recursos",
          respuesta: [
            "Recursos hay, y datos reales de millones de personas, que para investigar comportamiento humano es un lujo.",
            "Pero la agenda la marca, en última instancia, el negocio.",
          ],
        },
        {
          texto: "En lo público: no hay que rendir cuentas a un producto",
          respuesta: [
            "Ahí eliges tú la pregunta, que es lo más valioso que tiene un investigador.",
            "A cambio, conseguir financiación se convierte en parte del trabajo.",
          ],
        },
        {
          texto: "Depende de qué quieras responder",
          respuesta: [
            "Esa es la respuesta que yo daría. He hecho las dos cosas y cada una sirve para preguntas distintas.",
            "Lo importante es tener claro qué pregunta te quita el sueño, y después buscar el sitio donde puedas responderla.",
          ],
        },
      ],
    },
    despues: [
      "En 2024 la Comisión Europea me nombró presidenta del grupo de trabajo de transparencia para el primer Código de Buenas Prácticas de IA de uso general.",
      "Y en 2025 recibí el Premio Nacional de Investigación Julio Rey Pastor, sobre todo por el trabajo en análisis del comportamiento humano y en la interacción entre personas y máquinas.",
      "Todo eso empezó como empieza cualquier carrera de ingeniería: con mucha curiosidad y sin saber a dónde iba a llevar.",
    ],
    cierre:
      "Si la ingeniería y la investigación te llaman la atención como a mí, el departamento de Tech/Ingeniería es tu sitio.",
    departamentos: ["tech"],
    posicion: { col: 13, row: 4 },
  },
  {
    id: "natalia-rodriguez",
    nombre: "Natalia Rodríguez",
    rol: "Founder & CEO de Saturno Labs",
    retrato: "/juego/public/retratos/natalia-rodriguez.png",
    crop: { cx: 0.461, cy: 0.337, size: 0.464 },
    iniciales: "NR",
    colorSprite: "#9a5b06",
    paginas: [
      "Soy Natalia Rodríguez Núñez-Milara, Ingeniera de Telecomunicación por la ETSIT-UPM, con un doble máster en tratamiento de señal, machine learning y big data en esta misma escuela.",
      "En 2019 fundé Saturno Labs, un laboratorio de innovación que aplica inteligencia artificial a productos con impacto social: medicina, psicología y servicios sociales.",
      "Hemos creado más de 20 soluciones tecnológicas: herramientas para monitorizar pacientes hospitalizados, apps, plataformas educativas y chatbots. Fuimos la primera empresa española seleccionada para el Alexa Prize de Amazon.",
    ],
    pregunta: {
      texto:
        "Cuando la tecnología que construyes toca la salud de alguien, hay algo que no se puede negociar. ¿Qué dirías que es?",
      opciones: [
        {
          texto: "Que sea lo más precisa posible",
          respuesta: [
            "Es imprescindible, claro. Pero un sistema muy preciso que nadie usa en planta no ayuda a ningún paciente.",
          ],
        },
        {
          texto: "Que el personal sanitario la entienda y la use",
          respuesta: [
            "Eso es lo que marca la diferencia. La tecnología en un hospital entra en el día a día de gente que ya va desbordada.",
            "Si no se entiende en dos minutos y no encaja en cómo ya trabajan, se queda sin usar por muy buena que sea.",
          ],
        },
        {
          texto: "Que sea barata",
          respuesta: [
            "Importa para que llegue a más sitios, sí. Pero el coste solo se justifica si de verdad cambia algo para el paciente.",
          ],
        },
      ],
    },
    despues: [
      "En 2021 Forbes me incluyó en su lista de 'Los 21 protagonistas del cambio', y en 2023 recibí el Premio Nacional de Innovación en la categoría de Talento Innovador Joven: fui la primera mujer en recibirlo.",
      "Pero lo que quiero que te lleves no son los premios: es que salí de estas mismas aulas, con la misma carrera que estás haciendo tú.",
    ],
    cierre:
      "Hoy construyo tecnología que ayuda a la gente. Si te imaginas usando la ingeniería para resolver problemas que importan, el departamento de Tech/Ingeniería es tu sitio.",
    departamentos: ["tech"],
    posicion: { col: 4, row: 9 },
  },
];
