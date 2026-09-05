/*
 * TODO EL TEXTO Y LAS IMÁGENES DE LA PÁGINA ESTÁN AQUÍ.
 *
 * Para cambiar algo, edita este archivo y guarda: la web se actualiza sola.
 * No hace falta tocar ningún otro archivo.
 *
 * Las imágenes se dejan en `frontend/public/img/` y se escriben aquí
 * empezando por `/img/`. Lee `frontend/public/img/README.md`.
 *
 * Cada departamento tiene su propia composición, así que su contenido
 * es distinto: Tech tiene proyectos, Marketing tiene piezas de diseño
 * y Eventos tiene charlas.
 */

export type Imagen = {
  /** Ruta dentro de public/, siempre empezando por /img/ */
  src: string
  /** Qué se ve en la imagen. Lo lee quien no puede ver la foto. Obligatorio. */
  alt: string
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
  nombre: string
  descripcion: string
  /** Se enseña debajo del nombre, en pequeño. Deja '' si no hay web pública. */
  direccion: string
  /** Deja '' si el proyecto todavía no está publicado. */
  enlace: string
  /** 'En producción', 'En marcha', 'En construcción'... */
  estado: string
  /** Al pulsarla se abre `enlace`. */
  imagen: Imagen
  /** Sello opcional sobre la imagen, como el logo de GitHub. */
  logo?: Imagen
}

export type Charla = {
  /** Quién dio la charla. Deja '' si vino un equipo entero y no una persona. */
  ponente: string
  /** Su cargo y dónde: 'CTO de Cabify'. Es lo que dice quién es esa persona. */
  cargo: string
  /** La empresa o el fondo. Es lo que se lee en el sello si no hay logo. */
  entidad: string
  /** Tipo de charla: 'Charla con fundadores'. Deja '' si no encaja en ninguno. */
  titulo: string
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
  nombre: string
  lema: string
  gancho: string
}

/* ------------------------------------------------------------------ */
/* El club                                                             */
/* ------------------------------------------------------------------ */

export const club = {
  nombre: 'TelecoEmprende',
  /** El trozo del nombre que va en naranja. Tiene que aparecer tal cual dentro de `nombre`. */
  nombreDestacado: 'Emprende',
  procedencia: 'ETSIT · UPM',
  /** La web principal del club. El logo lleva aquí al pulsarlo. */
  web: 'https://telecoemprende.es',
  curso: 'Curso 2026/27',
  titular: 'En ingeniería sobra talento. Falta dónde montarlo.',
  /** La parte del titular que va en naranja. Tiene que aparecer tal cual dentro de `titular`. */
  titularDestacado: 'dónde montarlo',
  /** El mensaje que quita el miedo a acercarse. Sale destacado en la portada. */
  aclaracion:
    'No hace falta traer una idea de negocio, ni saber todavía qué quieres hacer. Solo ganas de construir algo con más gente.',
  invitacion: 'Elige por dónde quieres entrar.',

  /* --- Lo que sale en el pie de página --- */

  /** Quiénes somos, en una frase. Va debajo del nombre, en el pie. */
  descripcion:
    'Club de emprendimiento nacido en la ETSIT, abierto a estudiantes de toda la UPM.',
  /** El correo del club. Se pone en el pie y se abre al pulsarlo. */
  correo: 'telecoemprende.etsit@upm.es',
  /** La frase pequeña del final. Cámbiala por la que quieras. */
  nota: 'Hecho con ☕ entre clase y clase, desde la ETSIT para toda la UPM.',
  /*
   * Enlaces sueltos del pie, además de los tres departamentos, que salen
   * solos. Añade o quita los que quieras: se colocan uno detrás de otro.
   */
  enlacesPie: [
    { texto: 'Web del club', url: 'https://telecoemprende.es' },
    { texto: 'Red Alumni ETSIT', url: 'https://alumni.etsit.upm.es/' },
  ],
}

/* ------------------------------------------------------------------ */
/* Tech / Ingeniería                                                   */
/* ------------------------------------------------------------------ */

export const tech = {
  id: 'tech' as const,
  nombre: 'Tech / Ingeniería',
  lema: 'Construir y mantener',
  gancho: 'Lo que el club usa todos los días lo ha hecho alguien de aquí.',
  resumen:
    'Aquí se construye y se mantiene lo que el club usa todos los días: la red que conecta a los antiguos alumnos con los que seguimos en la escuela, y la web del club, que es pública y la lleva gente de aquí. Se entra sin saber programar; se sale habiendo entregado algo que funciona y que usa gente de verdad.',
  proyectos: [
    {
      nombre: 'Red Alumni ETSIT-UPM',
      descripcion:
        'Conecta a quien ya salió de la escuela con quien sigue dentro: mentorías, contactos y ofertas de empleo, de todas las promociones.',
      direccion: 'alumni.etsit.upm.es',
      enlace: 'https://alumni.etsit.upm.es/',
      estado: 'En producción',
      imagen: {
        src: '/img/tech/red-alumni.jpg',
        alt: 'Portada del portal Red Alumni ETSIT-UPM',
      },
    },
    {
      nombre: 'La web del club',
      descripcion:
        'telecoemprende.es no la ha hecho nadie de fuera: la mantiene el club, con el código abierto en GitHub y cinco personas metiendo mano.',
      direccion: 'github.com/TelecoEmprende/web-telecoemprende',
      enlace: 'https://github.com/TelecoEmprende/web-telecoemprende',
      estado: 'En abierto',
      imagen: {
        src: '/img/tech/repo-web.jpg',
        alt: 'Repositorio de la web del club en GitHub, con sus carpetas y los últimos cambios',
      },
      logo: { src: '/img/tech/logo-github.png', alt: 'Logo de GitHub' },
    },
  ] satisfies Proyecto[],
  pendiente: '',
}

/* ------------------------------------------------------------------ */
/* Marketing / Comms                                                   */
/* ------------------------------------------------------------------ */

export const marketing = {
  id: 'marketing' as const,
  nombre: 'Marketing / Comms',
  lema: 'Contar y que llegue',
  gancho: 'Si has oído hablar del club, es por este departamento.',
  resumen:
    'Aquí se decide cómo se cuenta el club por fuera: el Instagram y el LinkedIn, los carteles de cada charla, el texto que hace que alguien deje de hacer scroll. Es el departamento que convierte un evento en sala llena, y el que hace que TelecoEmprende se reconozca de un vistazo.',
  /** Las redes del club, en capturas verticales de móvil. */
  redes: [
    {
      red: 'Instagram',
      usuario: '@telecoemprende',
      url: 'https://www.instagram.com/telecoemprende/',
      imagen: {
        src: '/img/marketing/instagram.jpg',
        alt: 'Perfil de Instagram de TelecoEmprende, con 22 publicaciones y 1.293 seguidores',
      },
      logo: { src: '/img/marketing/logo-instagram.png', alt: '' },
    },
    {
      red: 'LinkedIn',
      usuario: 'TelecoEmprende',
      url: 'https://www.linkedin.com/company/telecoemprende/home/',
      imagen: {
        src: '/img/marketing/linkedin.jpg',
        alt: 'Página de LinkedIn de TelecoEmprende, con 204 seguidores',
      },
      logo: { src: '/img/marketing/logo-linkedin.png', alt: '' },
    },
  ] satisfies Red[],
  /* Los carteles se cuelgan en el corcho. Pon los que quieras: el corcho
     los reparte solo. */
  carteles: [
    {
      src: '/img/marketing/cartel1.jpg',
      alt: 'Cartel de Teleco Builders con los fundadores de TaxDown, el 7 de mayo',
    },
    {
      src: '/img/marketing/cartel2.jpg',
      alt: 'Cartel de Conversaciones Alumni con Ignacio García-Carrillo, de AMD, el 23 de julio',
    },
  ] satisfies Imagen[],
  /** Un reel del club. Se reproduce en bucle y sin sonido. */
  reel: {
    src: '/img/marketing/reel.mp4',
    alt: 'Reel del club en bucle',
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
  nombre: 'Eventos / Logística',
  lema: 'Que salga bien el día',
  gancho: 'Esto ya ha pasado en la ETSIT. Lo siguiente lo montas tú.',
  resumen:
    'Aquí se monta un evento de principio a fin: se elige a quién traer, se escribe el correo, se reserva la sala, se cuadran los horarios y se resuelven los imprevistos del día. Es la parte del club que más se nota, porque cuando sale bien parece que no ha costado nada.',
  charlas: [
    {
      ponente: 'Joaquín Fernández y Enrique García',
      cargo: 'Fundadores de TaxDown',
      entidad: 'TaxDown',
      titulo: 'Teleco Builders',
      imagen: {
        src: '/img/eventos/evento-taxdown.jpg',
        alt: 'Joaquín Fernández y Enrique García durante su charla en la ETSIT',
        video: 'https://www.youtube.com/watch?v=SdzmAGF-3Mo',
      },
      logo: { src: '/img/eventos/logo-taxdown.svg', alt: 'Logo de TaxDown' },
    },
    {
      ponente: 'Carlos Herrera',
      cargo: 'CTO de Cabify',
      entidad: 'Cabify',
      titulo: 'Teleco Builders',
      imagen: {
        src: '/img/eventos/evento-cabify.jpg',
        alt: 'Carlos Herrera durante su charla en la ETSIT',
      },
      logo: { src: '/img/eventos/logo-cabify.svg', alt: 'Logo de Cabify' },
    },
    {
      ponente: 'Ignacio García-Carrillo',
      cargo: 'Telco Account Executive en AMD',
      entidad: 'AMD',
      titulo: 'Conversaciones Alumni',
      imagen: {
        src: '/img/eventos/evento-ignacio-garcia-carrillo.jpg',
        alt: 'Ignacio García-Carrillo con miembros del club tras su charla en la ETSIT',
      },
      logo: { src: '/img/eventos/logo-amd.svg', alt: 'Logo de AMD' },
    },
    {
      ponente: 'Samuel Gil',
      cargo: 'CEO de JME Ventures',
      entidad: 'JME Ventures',
      titulo: 'Teleco Builders',
      imagen: {
        src: '/img/eventos/evento-jme.jpg',
        alt: 'Samuel Gil con miembros del club al final de su charla en la ETSIT',
      },
      logo: { src: '/img/eventos/logo-jme.jpg', alt: 'Logo de JME Ventures' },
    },
  ] satisfies Charla[],
  pendiente: '',
}


/* ------------------------------------------------------------------ */
/* El test                                                             */
/* ------------------------------------------------------------------ */

export type OpcionTest = {
  /** Lo que lee el visitante. No debe nombrar el departamento. */
  texto: string
  /** A quién suma. Esto no se enseña nunca en pantalla. */
  departamento: FichaDepartamento['id']
}

export type PreguntaTest = {
  /** Título corto, para situar la pregunta. */
  titulo: string
  enunciado: string
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
 */
export type Rol = {
  id: 'cerebro' | 'impulsor' | 'cohesionador'
  nombre: string
  /** Dos líneas como mucho: esto se lee de pie y con prisa. */
  texto: string
}

export type OpcionRol = {
  /** Lo que lee el visitante. No debe nombrar el rol. */
  texto: string
  rol: Rol['id']
}

export type PreguntaRol = {
  titulo: string
  enunciado: string
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
  gancho: '¿Y tú, dónde encajas?',
  descripcion:
    'Seis preguntas y ninguna técnica. Te decimos tu departamento y qué papel sueles hacer cuando trabajas con gente.',
  boton: 'Hacer el test',
  preguntas: [
    {
      titulo: 'Te toca explicarlo tú',
      enunciado:
        'Alguien te pregunta por algo que tú controlas y de lo que no tiene ni idea. ¿Cómo se lo cuentas?',
      opciones: [
        { texto: 'Le enseño cómo funciona por dentro, paso a paso.', departamento: 'tech' },
        { texto: 'Busco una comparación que le suene y tiro de ahí.', departamento: 'marketing' },
        {
          texto: 'Le escribo el orden en el que tiene que ir haciéndolo.',
          departamento: 'eventos',
        },
      ],
    },
    {
      titulo: 'Un sitio nuevo',
      enunciado:
        'Entras por primera vez en algún sitio: una tienda, un bar, una web. ¿En qué te fijas sin querer?',
      opciones: [
        { texto: 'En cómo está montado y en lo que transmite.', departamento: 'marketing' },
        { texto: 'En si hay alguien pendiente de que todo vaya bien.', departamento: 'eventos' },
        {
          texto: 'En si encuentro lo que busco sin que nadie me lo explique.',
          departamento: 'tech',
        },
      ],
    },
    {
      titulo: 'Se está torciendo',
      enunciado:
        'Estáis a mitad de algo y se ve venir que no va a salir. ¿Qué haces primero?',
      opciones: [
        { texto: 'Miro qué pieza exactamente está fallando.', departamento: 'tech' },
        { texto: 'Reordeno lo que queda y quito lo que sobra.', departamento: 'eventos' },
        {
          texto: 'Aviso a la gente antes de que se lleve el chasco.',
          departamento: 'marketing',
        },
      ],
    },
    {
      titulo: 'Algo bueno que nadie ha visto',
      enunciado:
        'Alguien ha hecho algo muy bueno y no se ha enterado casi nadie. ¿Qué te da más rabia?',
      opciones: [
        { texto: 'Que no llegue a quien le habría servido.', departamento: 'marketing' },
        {
          texto: 'Que no quede en ningún lado y haya que rehacerlo otra vez.',
          departamento: 'tech',
        },
        { texto: 'Que se pierda todo el trabajo que costó juntarlo.', departamento: 'eventos' },
      ],
    },
    {
      titulo: 'Te sobra una tarde',
      enunciado: 'Una tarde entera libre y con ganas de hacer algo. ¿Qué te apetece más?',
      opciones: [
        { texto: 'Cuadrar de una vez todo lo que tienes pendiente.', departamento: 'eventos' },
        { texto: 'Meterte con algo hasta entenderlo del todo.', departamento: 'tech' },
        { texto: 'Quedar con gente y que salga lo que salga.', departamento: 'marketing' },
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
    titulo: 'Cae un marrón',
    enunciado:
      'Os cae encima algo difícil, con poco tiempo y con gente a la que no conocías de nada. ¿Qué haces tú?',
    opciones: [
      {
        texto: 'Me pongo a buscar una salida por mi cuenta y luego se la cuento al grupo.',
        rol: 'cerebro',
      },
      { texto: 'Cojo el timón, si veo que el grupo no arranca.', rol: 'impulsor' },
      {
        texto: 'Me arrimo a quien lo esté viendo con mejor cara y tiramos de ahí.',
        rol: 'cohesionador',
      },
    ],
  } satisfies PreguntaRol,

  roles: [
    {
      /* Familia: el mental. */
      id: 'cerebro',
      nombre: 'Cerebro',
      texto:
        'Se te ocurren salidas que a los demás no. De ahí salen los proyectos que nadie había pensado.',
    },
    {
      /* Familia: el de acción. */
      id: 'impulsor',
      nombre: 'Impulsor',
      texto:
        'Cuando nadie arranca, arrancas tú. Es lo que más falta hace y lo más difícil de encontrar.',
    },
    {
      /* Familia: el social. */
      id: 'cohesionador',
      nombre: 'Cohesionador',
      texto:
        'Sabes con quién se puede contar y haces que el grupo no se rompa. Sin eso no sale adelante ningún evento.',
    },
  ] satisfies Rol[],

  resultado: {
    titulo: 'Encajas en',
    /* Cuando dos departamentos empatan a primera posición. */
    tituloEmpate: 'Encajas en dos',
    piePorcentaje: 'de afinidad',
    verDepartamento: 'Ver',
    /** Encabeza el papel de equipo, debajo del marcador. */
    tituloRol: 'Y en un equipo, tú eres',
    pieRol: 'Papel de equipo según el test de Belbin.',
    repetir: 'Repetir el test',
    explorar: 'O mira los tres por tu cuenta',
  },
}

/* ------------------------------------------------------------------ */

/** Lo que necesita el selector de la portada y la barra superior. */
export const departamentos: FichaDepartamento[] = [tech, marketing, eventos].map((depto) => ({
  id: depto.id,
  nombre: depto.nombre,
  lema: depto.lema,
  gancho: depto.gancho,
}))
