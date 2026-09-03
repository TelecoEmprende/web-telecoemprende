export type Programa = {
  code: string;
  name: string;
};

export type School = {
  code: string;
  name: string;
  grados: Programa[];
  masters: Programa[];
};

export const UPM_SCHOOLS: School[] = [
  {
    code: "ETSIT",
    name: "ETS de Ingenieros de Telecomunicación (ETSIT)",
    grados: [
      { code: "GISD", name: "Grado en Ingeniería y Sistemas de Datos" },
      { code: "GITT", name: "Grado en Ingeniería de Tecnologías de Telecomunicación" },
      {
        code: "GITST",
        name: "Grado en Ingeniería de Tecnologías y Servicios de Telecomunicación (en extinción)",
      },
      { code: "GIB", name: "Grado en Ingeniería Biomédica" },
    ],
    masters: [
      { code: "MUIT", name: "Máster Universitario en Ingeniería de Telecomunicación (Habilitante)" },
      { code: "MUIB", name: "M.U. en Ingeniería Biomédica" },
      { code: "MUCS", name: "M.U. en Ciberseguridad" },
      { code: "MUDS", name: "M.U. en Ciencia de Datos / Data Science" },
      { code: "MUIRST", name: "M.U. en Ingeniería de Redes y Servicios Telemáticos" },
      { code: "MISE", name: "M.U. en Ingeniería de Sistemas Electrónicos" },
      { code: "MUSTC", name: "M.U. en Teoría de la Señal y Comunicaciones" },
      { code: "MUESF", name: "M.U. en Energía Solar Fotovoltaica" },
      { code: "MUTC", name: "M.U. en Tecnologías Cuánticas (Interuniversitario)" },
      { code: "MUN", name: "M.U. en Neurotecnología" },
    ],
  },
  {
    code: "ETSII",
    name: "ETS de Ingenieros Industriales (ETSII)",
    grados: [
      { code: "GITI", name: "Grado en Ingeniería en Tecnologías Industriales" },
      { code: "GIQ", name: "Grado en Ingeniería Química" },
      { code: "GIOI", name: "Grado en Ingeniería de Organización Industrial" },
      { code: "GIA", name: "Grado en Ingeniería Ambiental" },
    ],
    masters: [
      { code: "MUII", name: "Máster Universitario en Ingeniería Industrial (Habilitante)" },
      { code: "MUIQ", name: "M.U. en Ingeniería Química" },
      { code: "MUIO", name: "M.U. en Ingeniería de Organización" },
      { code: "MUAR", name: "M.U. en Automática y Robótica (Compartido)" },
      { code: "MUEI", name: "M.U. en Electrónica Industrial" },
      { code: "MUCTN", name: "M.U. en Ciencia y Tecnología Nuclear" },
      { code: "MUIS", name: "M.U. en Ingeniería Sísmica: Dinámica de Suelos y Estructuras" },
      { code: "MUEGI", name: "M.U. en Economía y Gestión de la Innovación" },
    ],
  },
  {
    code: "ETSICCP",
    name: "ETS de Ingenieros de Caminos, Canales y Puertos (ETSICCP)",
    grados: [
      { code: "GIC", name: "Grado en Ingeniería Civil" },
      { code: "GIM", name: "Grado en Ingeniería de Materiales" },
      { code: "GICT", name: "Grado en Ingeniería Civil y Territorial" },
    ],
    masters: [
      {
        code: "MUICCP",
        name: "Máster Universitario en Ingeniería de Caminos, Canales y Puertos (Habilitante)",
      },
      { code: "MUIECM", name: "M.U. en Ingeniería de las Estructuras, Cimentaciones y Materiales" },
      { code: "MUPGI", name: "M.U. en Planificación y Gestión de Infraestructuras" },
      { code: "MUMAQ", name: "M.U. en Mecánica Aplicada y Computacional" },
      { code: "MUCTM", name: "M.U. en Ciencia y Tecnología de Materiales" },
      { code: "MUEBS", name: "M.U. en Economía del Transporte y Logística" },
    ],
  },
  {
    code: "ETSIAE",
    name: "ETS de Ingeniería Aeronáutica y del Espacio (ETSIAE)",
    grados: [
      { code: "GIA", name: "Grado en Ingeniería Aeroespacial" },
      { code: "GOTA", name: "Grado en Gestión y Operaciones del Transporte Aéreo" },
    ],
    masters: [
      { code: "MUIA", name: "Máster Universitario en Ingeniería Aeronáutica (Habilitante)" },
      { code: "MUSE", name: "M.U. en Sistemas Espaciales (Master in Space Systems)" },
      { code: "MUSTA", name: "M.U. en Sistemas del Transporte Aéreo" },
      { code: "MUEVT", name: "M.U. en Ensayos en Vuelo y Telemetría" },
      { code: "MUMCI", name: "M.U. en Matemática Computacional aplicada a la Ingeniería" },
    ],
  },
  {
    code: "ETSAM",
    name: "ETS de Arquitectura (ETSAM)",
    grados: [{ code: "GFA", name: "Grado en Fundamentos de la Arquitectura" }],
    masters: [
      { code: "MUA", name: "Máster Universitario en Arquitectura (Habilitante)" },
      { code: "MPAA", name: "M.U. en Proyectos Arquitectónicos Avanzados" },
      { code: "MUPUT", name: "M.U. en Planeamiento Urbano y Territorial" },
      { code: "MUCRPA", name: "M.U. en Conservación y Restauración del Patrimonio Arquitectónico" },
      { code: "MUCTA", name: "M.U. en Construcción y Tecnología Arquitectónicas" },
      { code: "MUEE", name: "M.U. en Estructuras de la Edificación" },
    ],
  },
  {
    code: "ETSE",
    name: "ETS de Edificación (ETSE)",
    grados: [
      { code: "GE", name: "Grado en Edificación" },
      { code: "DG-EA", name: "Doble Grado en Edificación y Administración y Dirección de Empresas" },
    ],
    masters: [
      { code: "MUGIE", name: "M.U. en Gestión en Edificación" },
      { code: "MUITEE", name: "M.U. en Innovación Tecnológica en Edificación" },
      { code: "MUEORR", name: "M.U. en Ejecución de Obras de Rehabilitación y Restauración" },
    ],
  },
  {
    code: "ETSIAAB",
    name: "ETS de Ingeniería Agronómica, Alimentaria y de Biosistemas (ETSIAAB)",
    grados: [
      { code: "GIAgr", name: "Grado en Ingeniería Agrícola" },
      { code: "GIAgro", name: "Grado en Ingeniería Agroambiental" },
      { code: "GIAl", name: "Grado en Ingeniería Alimentaria" },
      { code: "GBio", name: "Grado en Biotecnología" },
      { code: "GCAB", name: "Grado en Ciencias Agrarias y Bioeconomía" },
    ],
    masters: [
      { code: "MUIAGR", name: "Máster Universitario en Ingeniería Agronómica (Habilitante)" },
      { code: "MUBIC", name: "M.U. en Biología Computacional" },
      { code: "MUBBV", name: "M.U. en Biotecnología y Bioingeniería Vegetal" },
      { code: "MUIAS", name: "M.U. en Ingeniería Alimentaria Aplicada a la Salud" },
      { code: "MUAP", name: "M.U. en Agricultura de Precisión" },
      { code: "MUEAARN", name: "M.U. en Economía Agraria, Alimentaria y de los Recursos Naturales" },
      { code: "MUTAS", name: "M.U. en Tecnología Agroambiental para una Agricultura Sostenible" },
    ],
  },
  {
    code: "ETSIMFMN",
    name: "ETS de Ingeniería de Montes, Forestal y del Medio Natural (ETSIMFMN)",
    grados: [
      { code: "GIF", name: "Grado en Ingeniería Forestal" },
      { code: "GIMN", name: "Grado en Ingeniería del Medio Natural" },
    ],
    masters: [
      { code: "MUIM", name: "Máster Universitario en Ingeniería de Montes (Habilitante)" },
      { code: "MURE", name: "M.U. en Restauración de Ecosistemas (Interuniversitario)" },
      { code: "MUTLIF", name: "M.U. en Técnicas de Lucha contra Incendios Forestales" },
      { code: "MUGAMN", name: "M.U. en El Agua en el Medio Natural: Usos y Gestión" },
      { code: "MUJP", name: "M.U. en Jardinería y Paisajismo" },
    ],
  },
  {
    code: "ETSIN",
    name: "ETS de Ingenieros Navales (ETSIN)",
    grados: [
      { code: "GAN", name: "Grado en Arquitectura Naval" },
      { code: "GIMar", name: "Grado en Ingeniería Marítima" },
    ],
    masters: [
      { code: "MUINO", name: "Máster Universitario en Ingeniería Naval y Oceánica (Habilitante)" },
      { code: "MUERM", name: "M.U. en Energías Renovables Marinas" },
      { code: "MUIDFN", name: "M.U. en Ingeniería del Diseño y Fabricación Naval" },
    ],
  },
  {
    code: "INEF",
    name: "Facultad de Ciencias de la Actividad Física y del Deporte (INEF)",
    grados: [{ code: "G-CCAFD", name: "Grado en Ciencias de la Actividad Física y del Deporte" }],
    masters: [
      { code: "MU-CAFYD", name: "M.U. en Ciencias de la Actividad Física y del Deporte" },
      { code: "MU-FPEF", name: "M.U. en Formación del Profesorado (Especialidad Educación Física)" },
      { code: "MU-DGED", name: "M.U. en Dirección y Gestión de Entidades Deportivas" },
    ],
  },
  {
    code: "ETSIDI",
    name: "ETS de Ingeniería y Diseño Industrial (ETSIDI)",
    grados: [
      { code: "GIE", name: "Grado en Ingeniería Eléctrica" },
      { code: "GIEIA", name: "Grado en Ingeniería Electrónica Industrial y Automática" },
      { code: "GIM", name: "Grado en Ingeniería Mecánica" },
      { code: "GIQI", name: "Grado en Ingeniería Química Industrial" },
      { code: "GIDIDP", name: "Grado en Ingeniería en Diseño Industrial y Desarrollo de Producto" },
    ],
    masters: [
      { code: "MUIEM", name: "M.U. en Ingeniería Electromecánica" },
      { code: "MUDI", name: "M.U. en Diseño Industrial" },
      { code: "MUIAc", name: "M.U. en Ingeniería Acústica (Compartido)" },
      {
        code: "MUEE-IT",
        name: "M.U. en Eficiencia Energética en la Edificación, la Industria y el Transporte",
      },
    ],
  },
  {
    code: "ETSIME",
    name: "ETS de Ingenieros de Minas y Energía (ETSIME)",
    grados: [
      { code: "GIEne", name: "Grado en Ingeniería de la Energía" },
      {
        code: "GIRECE",
        name: "Grado en Ingeniería de los Recursos Energéticos, Combustibles y Explosivos",
      },
      { code: "GIG", name: "Grado en Ingeniería Geológica" },
      { code: "GIMin", name: "Grado en Ingeniería Minera" },
    ],
    masters: [
      { code: "MUIMIN", name: "Máster Universitario en Ingeniería de Minas (Habilitante)" },
      { code: "MUIE", name: "M.U. en Ingeniería de la Energía" },
      { code: "MUMSRN", name: "M.U. en Minería Sostenible y Gestión de Recursos Naturales" },
      {
        code: "MUEC-MPC",
        name: "M.U. en Economía Circular (Minerales y Productos de Construcción)",
      },
      { code: "MUCSA", name: "M.U. en Contaminación y Seguridad Ambiental" },
    ],
  },
  {
    code: "ETSISI",
    name: "ETS de Ingeniería de Sistemas Informáticos (ETSISI)",
    grados: [
      { code: "GIS", name: "Grado en Ingeniería del Software" },
      { code: "GSI", name: "Grado en Sistemas de Información" },
      { code: "GTSI", name: "Grado en Tecnologías para la Sociedad de la Información" },
      { code: "GCDIA", name: "Grado en Ciencia de Datos e Inteligencia Artificial (Compartido)" },
      { code: "GDV", name: "Grado en Desarrollo de Videojuegos" },
    ],
    masters: [
      { code: "MUIW", name: "M.U. en Ingeniería Web" },
      { code: "MUSDE", name: "M.U. en Software de Sistemas Distribuidos y Empotrados" },
      { code: "MUIoT", name: "M.U. en Internet de las Cosas (Internet of Things)" },
      { code: "MU-AADM", name: "M.U. en Aprendizaje Automático y Datos Masivos" },
    ],
  },
  {
    code: "ETSIST",
    name: "ETS de Ingeniería y Sistemas de Telecomunicación (ETSIST)",
    grados: [
      { code: "GISD", name: "Grado en Ingeniería y Sistemas de Datos" },
      { code: "GIEC", name: "Grado en Ingeniería Electrónica de Comunicaciones" },
      { code: "GITel", name: "Grado en Ingeniería Telemática" },
      { code: "GIST", name: "Grado en Ingeniería de Sistemas de Telecomunicación" },
      { code: "GISI", name: "Grado en Ingeniería de Sonido e Imagen" },
    ],
    masters: [
      {
        code: "MUISST",
        name: "M.U. en Ingeniería de Sistemas y Servicios Telemáticos para la Sociedad de la Información",
      },
      { code: "MUI-AEMA", name: "M.U. en Ingeniería Acústica en la Edificación y el Medio Ambiente" },
      { code: "MU-WC", name: "M.U. en Comunicaciones Inalámbricas (Wireless Communications)" },
      { code: "MUIoT", name: "M.U. en Internet de las Cosas (Compartido)" },
    ],
  },
  {
    code: "ETSITGC",
    name: "ETS de Ingenieros en Topografía, Geodesia y Cartografía (ETSITGC)",
    grados: [
      { code: "GIGeom", name: "Grado en Ingeniería Geomática" },
      { code: "GI-TIG", name: "Grado en Ingeniería de las Tecnologías de la Información Geoespacial" },
    ],
    masters: [
      {
        code: "MUIGC",
        name: "Máster Universitario en Ingeniería Geodésica y Cartografía (Habilitante)",
      },
      {
        code: "MU-ARS-TG",
        name: "M.U. en Análisis del Riesgo Sísmico mediante Tecnologías Geoespaciales",
      },
      { code: "MU-GAIA", name: "M.U. en Geomática Aplicada a la Ingeniería y a la Arquitectura" },
      { code: "MU-GEOINT", name: "M.U. en Inteligencia Geoespacial" },
    ],
  },
  {
    code: "ETSIINF",
    name: "ETS de Ingenieros Informáticos (ETSIINF)",
    grados: [
      { code: "GII", name: "Grado en Ingeniería Informática" },
      { code: "GMI", name: "Grado en Matemáticas e Informática" },
      { code: "GCDIA", name: "Grado en Ciencia de Datos e Inteligencia Artificial (Compartido)" },
    ],
    masters: [
      { code: "MUII-Inf", name: "Máster Universitario en Ingeniería Informática (Habilitante)" },
      { code: "MUIA", name: "M.U. en Inteligencia Artificial" },
      { code: "MUDS", name: "M.U. en Ciencia de Datos (Data Science)" },
      { code: "MUIS", name: "M.U. en Ingeniería del Software" },
      { code: "MUMFII", name: "M.U. en Métodos Formales en Ingeniería Informática" },
      { code: "MUID-EIT", name: "M.U. en Innovación Digital (EIT Digital Master School)" },
      { code: "MUBIC", name: "M.U. en Biología Computacional (Compartido con ETSIAAB y CTB)" },
      {
        code: "MUTECI",
        name: "M.U. en Tratamiento Estadístico-Computacional de la Información (Interuniversitario UPM-UCM)",
      },
    ],
  },
  {
    code: "CSDMM",
    name: "Centro Superior de Diseño de Moda de Madrid (CSDMM - Centro Adscrito)",
    grados: [{ code: "GDM", name: "Grado en Diseño de Moda" }],
    masters: [{ code: "MUTCDM", name: "M.U. en Tecnología y Creación en el Diseño de Moda" }],
  },
  {
    code: "INTERCENTROS",
    name: "Másteres Transversales Intercentros",
    grados: [],
    masters: [
      { code: "MUFP", name: "M.U. en Formación del Profesorado de ESO, Bachillerato y FP (ICE / Multiescuela)" },
      {
        code: "MUETD",
        name: "M.U. en Estrategias y Tecnologías para el Desarrollo (ETSIT + ETSICCP + ETSIAAB)",
      },
      {
        code: "MUEC",
        name: "M.U. en Economía Circular (ETSIME + ETSIMFMN + ETSIAAB)",
      },
    ],
  },
];
