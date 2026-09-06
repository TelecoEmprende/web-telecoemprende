/*
 * TODO EL TEXTO Y LAS IMÁGENES DE LA PÁGINA ESTÁN AQUÍ.
 *
 * Para cambiar algo, edita este archivo y guarda: la web se actualiza sola.
 * No hace falta tocar ningún otro archivo.
 *
 * LOS TEXTOS VAN EN DOS IDIOMAS. Cada uno se escribe como
 * `{ es: '...', en: '...' }`, con el español y el inglés juntos:
 *
 *     lema: { es: 'Construir y mantener', en: 'Build and maintain' },
 *
 * Los dos tienen que estar puestos. Lo que NO se traduce —rutas de imagen,
 * enlaces, nombres propios, los pesos del test— se queda como un texto
 * suelto, sin idiomas, para que no pueda descuadrarse.
 *
 * Las imágenes se dejan en `frontend/public/img/` y se escriben aquí
 * empezando por `/img/`. Lee `frontend/public/img/README.md`.
 *
 * Cada departamento tiene su propia composición, así que su contenido
 * es distinto: Tech tiene proyectos, Marketing tiene piezas de diseño
 * y Eventos tiene charlas.
 */

import type { Texto } from '../i18n/texto'

export type { Texto }

export type Imagen = {
  /** Ruta dentro de public/, siempre empezando por /img/ */
  src: string
  /** Qué se ve en la imagen. Lo lee quien no puede ver la foto. Obligatorio. */
  alt: Texto
  /**
   * Vídeo de YouTube que se reproduce al ampliarla, en lugar de la foto.
   * Pega la dirección entera: 'https://www.youtube.com/watch?v=...'
   * La foto sigue haciendo de portada. Déjalo sin poner si no hay vídeo.
   */
  video?: string
}

/**
 * Convierte un `Imagen.src` en la URL real que hay que pedir, con el base
 * path del despliegue (`base` en vite.config.ts, `/demo/`) delante.
 * Úsalo en el único sitio donde el src se vuelve un <img src=...> o
 * <video src=...>.
 */
export const rutaImagen = (src: string) =>
  src ? import.meta.env.BASE_URL + src.replace(/^\//, '') : src

export type Proyecto = {
  nombre: Texto
  descripcion: Texto
  /** Se enseña debajo del nombre, en pequeño. Deja '' si no hay web pública. */
  direccion: string
  /** Deja '' si el proyecto todavía no está publicado. */
  enlace: string
  /** 'En producción', 'En marcha', 'En construcción'... */
  estado: Texto
  /** Al pulsarla se abre `enlace`. */
  imagen: Imagen
  /** Sello opcional sobre la imagen, como el logo de GitHub. */
  logo?: Imagen
}

export type Charla = {
  /** Quién dio la charla. Deja '' si vino un equipo entero y no una persona. */
  ponente: string
  /** Su cargo y dónde: 'CTO de Cabify'. Es lo que dice quién es esa persona. */
  cargo: Texto
  /** La empresa o el fondo. Es lo que se lee en el sello si no hay logo. */
  entidad: string
  /** Tipo de charla: 'Charla con fundadores'. Deja '' si no encaja en ninguno. */
  titulo: Texto
  imagen: Imagen
  /** Logo de la empresa, en el sello. Deja src en '' si aún no lo tienes. */
  logo: Imagen
}

export type Red = {
  /** Nombre de la red: 'Instagram', 'LinkedIn'... */
  red: string
  /** El usuario o el nombre con el que aparecéis en ella. */
  usuario: string
  /** Perfil que se abre al pulsar el nombre. */
  url: string
  /** Captura del perfil, vertical. */
  imagen: Imagen
  /** Icono de la red, cuadrado. */
  logo: Imagen
}

/** Datos comunes que usa el selector de la portada. */
export type FichaDepartamento = {
  id: 'tech' | 'marketing' | 'eventos'
  nombre: Texto
  lema: Texto
  gancho: Texto
}

/* ------------------------------------------------------------------ */
/* El club                                                             */
/* ------------------------------------------------------------------ */

export const club = {
  nombre: 'TelecoEmprende',
  /** El trozo del nombre que va en naranja. Tiene que aparecer tal cual dentro de `nombre`. */
  nombreDestacado: 'Emprende',
  /** La web principal del club. El logo lleva aquí al pulsarlo. */
  web: 'https://telecoemprende.es',
  /*
   * El botón de la barra: es lo único que se pide en esta página, así que
   * lleva directo al formulario de la web del club, no a su portada.
   */
  solicitud: {
    texto: { es: 'Envía tu solicitud', en: 'Submit your application' },
    url: 'https://telecoemprende.es/#inscripcion',
  },
  titular: {
    es: 'En ingeniería sobra talento. Falta dónde montarlo.',
    en: 'Engineering has talent to spare. What it lacks is somewhere to build.',
  },
  /** La parte del titular que va en naranja. Tiene que aparecer tal cual dentro de `titular`. */
  titularDestacado: { es: 'dónde montarlo', en: 'somewhere to build' },
  /** El mensaje que quita el miedo a acercarse. Sale destacado en la portada. */
  aclaracion: {
    es: 'No hace falta traer una idea de negocio, ni saber todavía qué quieres hacer. Solo ganas de construir algo con más gente.',
    en: "You don't need to bring a business idea, or even know yet what you want to do. Just the urge to build something with other people.",
  },
  invitacion: {
    es: 'Elige por dónde quieres entrar.',
    en: 'Choose where you want to come in.',
  },

  /* --- Lo que sale en el pie de página --- */

  /** Quiénes somos, en una frase. Va debajo del nombre, en el pie. */
  descripcion: {
    es: 'Club de emprendimiento nacido en la ETSIT, abierto a estudiantes de toda la UPM.',
    en: 'Entrepreneurship club born at ETSIT, open to students from every UPM school.',
  },
  /** El correo del club. Se pone en el pie y se abre al pulsarlo. */
  correo: 'telecoemprende.etsit@upm.es',
  /** La frase pequeña del final. Cámbiala por la que quieras. */
  nota: {
    es: 'Hecho con ☕ entre clase y clase, desde la ETSIT para toda la UPM.',
    en: 'Made with ☕ between classes, from ETSIT for the whole UPM.',
  },
  /*
   * Enlaces sueltos del pie, además de los tres departamentos, que salen
   * solos. Añade o quita los que quieras: se colocan uno detrás de otro.
   */
  enlacesPie: [
    {
      texto: { es: 'Web del club', en: 'Club website' },
      url: 'https://telecoemprende.es',
    },
    {
      texto: { es: 'Red Alumni ETSIT', en: 'Red Alumni ETSIT' },
      url: 'https://alumni.etsit.upm.es/',
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Tech / Ingeniería                                                   */
/* ------------------------------------------------------------------ */

export const tech = {
  id: 'tech' as const,
  nombre: { es: 'Tech / Ingeniería', en: 'Tech / Engineering' },
  lema: { es: 'Construir y mantener', en: 'Build and maintain' },
  gancho: {
    es: 'Lo que el club usa todos los días lo ha hecho alguien de aquí.',
    en: 'Everything the club uses every day was built by someone in here.',
  },
  resumen: {
    es: 'Aquí se construye y se mantiene lo que el club usa todos los días: la red que conecta a los antiguos alumnos con los que seguimos en la escuela, y la web del club, que es pública y la lleva gente de aquí. Se entra sin saber programar; se sale habiendo entregado algo que funciona y que usa gente de verdad.',
    en: 'This is where we build and maintain what the club uses every day: the network connecting former students with those of us still at the school, and the club website, which is public and run by people from here. You come in without knowing how to code; you leave having shipped something that works and that real people use.',
  },
  proyectos: [
    {
      nombre: { es: 'Red Alumni ETSIT-UPM', en: 'Red Alumni ETSIT-UPM' },
      descripcion: {
        es: 'Conecta a quien ya salió de la escuela con quien sigue dentro: mentorías, contactos y ofertas de empleo, de todas las promociones.',
        en: 'Connects those who have left the school with those still inside: mentoring, contacts and job offers, across every graduating class.',
      },
      direccion: 'alumni.etsit.upm.es',
      enlace: 'https://alumni.etsit.upm.es/',
      estado: { es: 'En producción', en: 'Live' },
      imagen: {
        src: '/img/tech/red-alumni.jpg',
        alt: {
          es: 'Portada del portal Red Alumni ETSIT-UPM',
          en: 'Home page of the Red Alumni ETSIT-UPM portal',
        },
      },
    },
    {
      nombre: { es: 'La web del club', en: 'The club website' },
      descripcion: {
        es: 'telecoemprende.es no la ha hecho nadie de fuera: la mantiene el club, con el código abierto en GitHub y cinco personas metiendo mano.',
        en: 'telecoemprende.es was not built by anyone outside: the club maintains it, with the code open on GitHub and five people working on it.',
      },
      direccion: 'github.com/TelecoEmprende/web-telecoemprende',
      enlace: 'https://github.com/TelecoEmprende/web-telecoemprende',
      estado: { es: 'En abierto', en: 'Open source' },
      imagen: {
        src: '/img/tech/repo-web.jpg',
        alt: {
          es: 'Repositorio de la web del club en GitHub, con sus carpetas y los últimos cambios',
          en: 'The club website repository on GitHub, with its folders and latest changes',
        },
      },
      logo: {
        src: '/img/tech/logo-github.png',
        alt: { es: 'Logo de GitHub', en: 'GitHub logo' },
      },
    },
  ] satisfies Proyecto[],
  pendiente: '',
}

/* ------------------------------------------------------------------ */
/* Marketing / Comms                                                   */
/* ------------------------------------------------------------------ */

export const marketing = {
  id: 'marketing' as const,
  nombre: { es: 'Marketing / Comms', en: 'Marketing / Comms' },
  lema: { es: 'Contar y que llegue', en: 'Tell it so it lands' },
  gancho: {
    es: 'Si has oído hablar del club, es por este departamento.',
    en: 'If you have heard of the club, it is because of this department.',
  },
  resumen: {
    es: 'Aquí se decide cómo se cuenta el club por fuera: el Instagram y el LinkedIn, los carteles de cada charla, el texto que hace que alguien deje de hacer scroll. Es el departamento que convierte un evento en sala llena, y el que hace que TelecoEmprende se reconozca de un vistazo.',
    en: 'This is where we decide how the club looks from the outside: Instagram and LinkedIn, the poster for every talk, the line that makes someone stop scrolling. It is the department that turns an event into a full room, and the one that makes TelecoEmprende recognisable at a glance.',
  },
  /** Las redes del club, en capturas verticales de móvil. */
  redes: [
    {
      red: 'Instagram',
      usuario: '@telecoemprende',
      url: 'https://www.instagram.com/telecoemprende/',
      imagen: {
        src: '/img/marketing/instagram.jpg',
        alt: {
          es: 'Perfil de Instagram de TelecoEmprende, con 22 publicaciones y 1.293 seguidores',
          en: 'TelecoEmprende Instagram profile, with 22 posts and 1,293 followers',
        },
      },
      logo: { src: '/img/marketing/logo-instagram.png', alt: { es: '', en: '' } },
    },
    {
      red: 'LinkedIn',
      usuario: 'TelecoEmprende',
      url: 'https://www.linkedin.com/company/telecoemprende/home/',
      imagen: {
        src: '/img/marketing/linkedin.jpg',
        alt: {
          es: 'Página de LinkedIn de TelecoEmprende, con 204 seguidores',
          en: 'TelecoEmprende LinkedIn page, with 204 followers',
        },
      },
      logo: { src: '/img/marketing/logo-linkedin.png', alt: { es: '', en: '' } },
    },
  ] satisfies Red[],
  /* Los carteles se cuelgan en el corcho. Pon los que quieras: el corcho
     los reparte solo. */
  carteles: [
    {
      src: '/img/marketing/cartel1.jpg',
      alt: {
        es: 'Cartel de Teleco Builders con los fundadores de TaxDown, el 7 de mayo',
        en: 'Teleco Builders poster with the founders of TaxDown, 7 May',
      },
    },
    {
      src: '/img/marketing/cartel2.jpg',
      alt: {
        es: 'Cartel de Conversaciones Alumni con Ignacio García-Carrillo, de AMD, el 23 de julio',
        en: 'Alumni Conversations poster with Ignacio García-Carrillo, from AMD, 23 July',
      },
    },
  ] satisfies Imagen[],
  /** Un reel del club. Se reproduce en bucle y sin sonido. */
  reel: {
    src: '/img/marketing/reel.mp4',
    alt: { es: 'Reel del club en bucle', en: 'Club reel playing on a loop' },
  } satisfies Imagen,
  /** Al pulsar el reel se abre esta publicación en una pestaña nueva. */
  enlaceReel: 'https://www.instagram.com/reel/DYPcyrlIplJ/',
  pendiente: '',
}

/* ------------------------------------------------------------------ */
/* Eventos / Logística                                                 */
/* ------------------------------------------------------------------ */

export const eventos = {
  id: 'eventos' as const,
  nombre: { es: 'Eventos / Logística', en: 'Events / Logistics' },
  lema: { es: 'Que salga bien el día', en: 'Making the day run' },
  gancho: {
    es: 'Esto ya ha pasado en la ETSIT. Lo siguiente lo montas tú.',
    en: "This already happened at ETSIT. You build what's next.",
  },
  resumen: {
    es: 'Aquí se monta un evento de principio a fin: se elige a quién traer, se escribe el correo, se reserva la sala, se cuadran los horarios y se resuelven los imprevistos del día. Es la parte del club que más se nota, porque cuando sale bien parece que no ha costado nada.',
    en: 'This is where an event is put together from start to finish: choosing who to bring in, writing the email, booking the room, lining up the schedule and sorting out whatever comes up on the day. It is the most visible part of the club, because when it goes well it looks like it took no effort at all.',
  },
  charlas: [
    {
      ponente: 'Joaquín Fernández y Enrique García',
      cargo: { es: 'Fundadores de TaxDown', en: 'Founders of TaxDown' },
      entidad: 'TaxDown',
      titulo: { es: 'Teleco Builders', en: 'Teleco Builders' },
      imagen: {
        src: '/img/eventos/evento-taxdown.jpg',
        alt: {
          es: 'Joaquín Fernández y Enrique García durante su charla en la ETSIT',
          en: 'Joaquín Fernández and Enrique García during their talk at ETSIT',
        },
        video: 'https://www.youtube.com/watch?v=SdzmAGF-3Mo',
      },
      logo: {
        src: '/img/eventos/logo-taxdown.svg',
        alt: { es: 'Logo de TaxDown', en: 'TaxDown logo' },
      },
    },
    {
      ponente: 'Carlos Herrera',
      cargo: { es: 'CTO de Cabify', en: 'CTO at Cabify' },
      entidad: 'Cabify',
      titulo: { es: 'Teleco Builders', en: 'Teleco Builders' },
      imagen: {
        src: '/img/eventos/evento-cabify.jpg',
        alt: {
          es: 'Carlos Herrera durante su charla en la ETSIT',
          en: 'Carlos Herrera during his talk at ETSIT',
        },
      },
      logo: {
        src: '/img/eventos/logo-cabify.svg',
        alt: { es: 'Logo de Cabify', en: 'Cabify logo' },
      },
    },
    {
      ponente: 'Ignacio García-Carrillo',
      cargo: {
        es: 'Telco Account Executive en AMD',
        en: 'Telco Account Executive at AMD',
      },
      entidad: 'AMD',
      titulo: { es: 'Conversaciones Alumni', en: 'Alumni Conversations' },
      imagen: {
        src: '/img/eventos/evento-ignacio-garcia-carrillo.jpg',
        alt: {
          es: 'Ignacio García-Carrillo con miembros del club tras su charla en la ETSIT',
          en: 'Ignacio García-Carrillo with club members after his talk at ETSIT',
        },
      },
      logo: {
        src: '/img/eventos/logo-amd.svg',
        alt: { es: 'Logo de AMD', en: 'AMD logo' },
      },
    },
    {
      ponente: 'Samuel Gil',
      cargo: { es: 'CEO de JME Ventures', en: 'CEO at JME Ventures' },
      entidad: 'JME Ventures',
      titulo: { es: 'Teleco Builders', en: 'Teleco Builders' },
      imagen: {
        src: '/img/eventos/evento-jme.jpg',
        alt: {
          es: 'Samuel Gil con miembros del club al final de su charla en la ETSIT',
          en: 'Samuel Gil with club members at the end of his talk at ETSIT',
        },
      },
      logo: {
        src: '/img/eventos/logo-jme.jpg',
        alt: { es: 'Logo de JME Ventures', en: 'JME Ventures logo' },
      },
    },
  ] satisfies Charla[],
  pendiente: '',
}


/* ------------------------------------------------------------------ */
/* El test                                                             */
/* ------------------------------------------------------------------ */

export type OpcionTest = {
  /** Lo que lee el visitante. No debe nombrar el departamento. */
  texto: Texto
  /** A quién suma. Esto no se enseña nunca en pantalla. */
  departamento: FichaDepartamento['id']
}

export type PreguntaTest = {
  /** Título corto, para situar la pregunta. */
  titulo: Texto
  enunciado: Texto
  /** Se enseñan en este orden, como A, B y C. */
  opciones: OpcionTest[]
}

/*
 * El papel que hace cada uno dentro de un equipo.
 *
 * Salen del test de roles de equipo de Belbin, que tiene ocho. Aquí van
 * tres, y no es un recorte a ojo: Belbin agrupa sus ocho roles en tres
 * familias —los de acción, los sociales y los mentales— y aquí va uno de
 * cada una. Así las tres opciones cubren el mapa entero en vez de quedarse
 * con un trozo, y de paso la pregunta tiene tres opciones como las otras
 * cinco.
 *
 * En inglés van con el nombre original de Belbin —Plant, Shaper,
 * Teamworker—, no con una traducción del nombre español.
 */
export type Rol = {
  id: 'cerebro' | 'impulsor' | 'cohesionador'
  nombre: Texto
  /** Dos líneas como mucho: esto se lee de pie y con prisa. */
  texto: Texto
}

export type OpcionRol = {
  /** Lo que lee el visitante. No debe nombrar el rol. */
  texto: Texto
  rol: Rol['id']
}

export type PreguntaRol = {
  titulo: Texto
  enunciado: Texto
  opciones: OpcionRol[]
}

/*
 * El test de la portada.
 *
 * Dos reglas al escribir preguntas nuevas:
 *
 * 1. El texto de la opción NO dice a qué departamento pertenece. Si el
 *    visitante lee "Tech", elige el que le suena mejor y el test deja de
 *    medir nada.
 * 2. El orden va cambiado a propósito en cada pregunta. Si la primera opción
 *    fuera siempre Tech, a la tercera pregunta se nota el patrón.
 */
export const test = {
  gancho: { es: '¿Y tú, dónde encajas?', en: 'And you — where do you fit?' },
  descripcion: {
    es: 'Seis preguntas y ninguna técnica. Te decimos tu departamento y qué papel sueles hacer cuando trabajas con gente.',
    en: 'Six questions, none of them technical. We tell you your department and the role you tend to play when you work with people.',
  },
  boton: { es: 'Hacer el test', en: 'Take the test' },
  preguntas: [
    {
      titulo: { es: 'Te toca explicarlo tú', en: 'Your turn to explain it' },
      enunciado: {
        es: 'Alguien te pregunta por algo que tú controlas y de lo que no tiene ni idea. ¿Cómo se lo cuentas?',
        en: 'Someone asks you about something you know inside out and they know nothing about. How do you explain it?',
      },
      opciones: [
        {
          texto: {
            es: 'Le enseño cómo funciona por dentro, paso a paso.',
            en: 'I show them how it works inside, step by step.',
          },
          departamento: 'tech',
        },
        {
          texto: {
            es: 'Busco una comparación que le suene y tiro de ahí.',
            en: 'I find a comparison they will recognise and go from there.',
          },
          departamento: 'marketing',
        },
        {
          texto: {
            es: 'Le escribo el orden en el que tiene que ir haciéndolo.',
            en: 'I write down the order they should do it in.',
          },
          departamento: 'eventos',
        },
      ],
    },
    {
      titulo: { es: 'Un sitio nuevo', en: 'Somewhere new' },
      enunciado: {
        es: 'Entras por primera vez en algún sitio: una tienda, un bar, una web. ¿En qué te fijas sin querer?',
        en: 'You walk into somewhere for the first time: a shop, a bar, a website. What do you notice without meaning to?',
      },
      opciones: [
        {
          texto: {
            es: 'En cómo está montado y en lo que transmite.',
            en: 'How it is put together and what it says.',
          },
          departamento: 'marketing',
        },
        {
          texto: {
            es: 'En si hay alguien pendiente de que todo vaya bien.',
            en: 'Whether someone is keeping an eye on everything.',
          },
          departamento: 'eventos',
        },
        {
          texto: {
            es: 'En si encuentro lo que busco sin que nadie me lo explique.',
            en: 'Whether I find what I came for without anyone explaining it.',
          },
          departamento: 'tech',
        },
      ],
    },
    {
      titulo: { es: 'Se está torciendo', en: 'It is going wrong' },
      enunciado: {
        es: 'Estáis a mitad de algo y se ve venir que no va a salir. ¿Qué haces primero?',
        en: 'You are halfway through something and you can see it is not going to work out. What do you do first?',
      },
      opciones: [
        {
          texto: {
            es: 'Miro qué pieza exactamente está fallando.',
            en: 'I look for exactly which piece is failing.',
          },
          departamento: 'tech',
        },
        {
          texto: {
            es: 'Reordeno lo que queda y quito lo que sobra.',
            en: 'I reorder what is left and cut what is not needed.',
          },
          departamento: 'eventos',
        },
        {
          texto: {
            es: 'Aviso a la gente antes de que se lleve el chasco.',
            en: 'I warn people before they are let down.',
          },
          departamento: 'marketing',
        },
      ],
    },
    {
      titulo: {
        es: 'Algo bueno que nadie ha visto',
        en: 'Something good nobody saw',
      },
      enunciado: {
        es: 'Alguien ha hecho algo muy bueno y no se ha enterado casi nadie. ¿Qué te da más rabia?',
        en: 'Someone has done something really good and almost nobody found out. What bothers you most?',
      },
      opciones: [
        {
          texto: {
            es: 'Que no llegue a quien le habría servido.',
            en: 'That it never reached the people it would have helped.',
          },
          departamento: 'marketing',
        },
        {
          texto: {
            es: 'Que no quede en ningún lado y haya que rehacerlo otra vez.',
            en: 'That it is written down nowhere and will have to be done all over again.',
          },
          departamento: 'tech',
        },
        {
          texto: {
            es: 'Que se pierda todo el trabajo que costó juntarlo.',
            en: 'That all the work it took to put together goes to waste.',
          },
          departamento: 'eventos',
        },
      ],
    },
    {
      titulo: { es: 'Te sobra una tarde', en: 'A free afternoon' },
      enunciado: {
        es: 'Una tarde entera libre y con ganas de hacer algo. ¿Qué te apetece más?',
        en: 'A whole afternoon free and the urge to do something. What appeals most?',
      },
      opciones: [
        {
          texto: {
            es: 'Cuadrar de una vez todo lo que tienes pendiente.',
            en: 'Finally sorting out everything you have pending.',
          },
          departamento: 'eventos',
        },
        {
          texto: {
            es: 'Meterte con algo hasta entenderlo del todo.',
            en: 'Digging into something until you understand it completely.',
          },
          departamento: 'tech',
        },
        {
          texto: {
            es: 'Quedar con gente y que salga lo que salga.',
            en: 'Meeting up with people and seeing where it goes.',
          },
          departamento: 'marketing',
        },
      ],
    },
  ] satisfies PreguntaTest[],

  /*
   * La sexta y última. Esta no puntúa departamento: mide otra cosa.
   *
   * Va aparte a propósito. Las cinco de arriba están escritas sobre los
   * departamentos, así que el estilo que transmiten va pegado al
   * departamento del que hablan: si el papel se dedujera de ellas, a quien
   * le saliera Marketing le saldría siempre el mismo papel, y el resultado
   * diría dos veces lo mismo. Con una pregunta suya las dos cosas son
   * independientes de verdad.
   *
   * Las cuatro opciones son las del apartado VI del test de Belbin, el de
   * trabajar bajo presión con gente desconocida, escritas en corto.
   */
  preguntaRol: {
    titulo: { es: 'Cae un marrón', en: 'A mess lands on you' },
    enunciado: {
      es: 'Os cae encima algo difícil, con poco tiempo y con gente a la que no conocías de nada. ¿Qué haces tú?',
      en: 'Something hard lands on you, with little time and with people you had never met. What do you do?',
    },
    opciones: [
      {
        texto: {
          es: 'Me pongo a buscar una salida por mi cuenta y luego se la cuento al grupo.',
          en: 'I go looking for a way out on my own and then bring it to the group.',
        },
        rol: 'cerebro',
      },
      {
        texto: {
          es: 'Cojo el timón, si veo que el grupo no arranca.',
          en: 'I take the wheel if I see the group is not getting going.',
        },
        rol: 'impulsor',
      },
      {
        texto: {
          es: 'Me arrimo a quien lo esté viendo con mejor cara y tiramos de ahí.',
          en: 'I stick with whoever is taking it best and we go from there.',
        },
        rol: 'cohesionador',
      },
    ],
  } satisfies PreguntaRol,

  roles: [
    {
      /* Familia: el mental. */
      id: 'cerebro',
      nombre: { es: 'Cerebro', en: 'Plant' },
      texto: {
        es: 'Se te ocurren salidas que a los demás no. De ahí salen los proyectos que nadie había pensado.',
        en: 'You come up with ways out that nobody else sees. That is where the projects nobody had thought of come from.',
      },
    },
    {
      /* Familia: el de acción. */
      id: 'impulsor',
      nombre: { es: 'Impulsor', en: 'Shaper' },
      texto: {
        es: 'Cuando nadie arranca, arrancas tú. Es lo que más falta hace y lo más difícil de encontrar.',
        en: 'When nobody gets going, you do. It is what is needed most and the hardest thing to find.',
      },
    },
    {
      /* Familia: el social. */
      id: 'cohesionador',
      nombre: { es: 'Cohesionador', en: 'Teamworker' },
      texto: {
        es: 'Sabes con quién se puede contar y haces que el grupo no se rompa. Sin eso no sale adelante ningún evento.',
        en: 'You know who can be counted on and you keep the group from falling apart. No event gets off the ground without that.',
      },
    },
  ] satisfies Rol[],

  resultado: {
    titulo: { es: 'Encajas en', en: 'You fit in' },
    /* Cuando dos departamentos empatan a primera posición. */
    tituloEmpate: { es: 'Encajas en dos', en: 'You fit in two' },
    piePorcentaje: { es: 'de afinidad', en: 'match' },
    verDepartamento: { es: 'Ver', en: 'See' },
    /** Encabeza el papel de equipo, debajo del marcador. */
    tituloRol: { es: 'Y en un equipo, tú eres', en: 'And on a team, you are' },
    pieRol: {
      es: 'Papel de equipo según el test de Belbin.',
      en: 'Team role according to the Belbin test.',
    },
    repetir: { es: 'Repetir el test', en: 'Take it again' },
    explorar: {
      es: 'O mira los tres por tu cuenta',
      en: 'Or browse all three yourself',
    },
  },
}

/*
 * Botón que lleva al mini-juego de la web principal (telecoemprende.es/juego,
 * todavía "Próximamente"). No es del test: se pinta debajo, como una segunda
 * llamada a la acción en la portada.
 */
export const juego = {
  gancho: { es: '¿Prefieres jugar antes de decidirte?', en: 'Fancy a game before you decide?' },
  descripcion: {
    es: 'Mientras te lo piensas, échale un ojo a nuestro mini-juego. Todavía lo estamos montando, pero ya puedes echar un vistazo.',
    en: "While you think it over, check out our mini-game. We're still building it, but you can already take a peek.",
  },
  boton: { es: 'Jugar', en: 'Play' },
  /** Ruta absoluta: el juego vive en telecoemprende.es/juego, fuera de /demo. */
  url: 'https://telecoemprende.es/juego',
}

/* ------------------------------------------------------------------ */
/* Textos sueltos de la interfaz                                       */
/* ------------------------------------------------------------------ */

/*
 * Los botones y las etiquetas que no son contenido: lo que se lee en un
 * lector de pantalla, el "Cerrar" de las capas y el paso del test. Están
 * aquí para que no quede ni una frase suelta dentro del código.
 *
 * `{n}` y `{total}` son huecos: se cambian por el número al pintarlos.
 */
export const interfaz = {
  irALaWeb: {
    es: 'Ir a la web de TelecoEmprende',
    en: 'Go to the TelecoEmprende website',
  },
  saltos: { es: 'Ir a un departamento', en: 'Jump to a department' },
  departamentos: { es: 'Departamentos del club', en: 'Club departments' },
  enlacesPie: { es: 'Enlaces del pie', en: 'Footer links' },
  cerrar: { es: 'Cerrar', en: 'Close' },
  volver: { es: 'Volver a la anterior', en: 'Back to the previous one' },
  paso: { es: 'Pregunta {n} de {total}', en: 'Question {n} of {total}' },
  abrir: { es: 'Abrir: {que}', en: 'Open: {que}' },
  ampliar: { es: 'Ver más grande: {que}', en: 'View larger: {que}' },
  captura: { es: 'Captura de {red}', en: '{red} screenshot' },
  verEnInstagram: { es: 'Ver en Instagram', en: 'Watch on Instagram' },
}

/* ------------------------------------------------------------------ */

/** Lo que necesita el selector de la portada y la barra superior. */
export const departamentos: FichaDepartamento[] = [tech, marketing, eventos].map((depto) => ({
  id: depto.id,
  nombre: depto.nombre,
  lema: depto.lema,
  gancho: depto.gancho,
}))
