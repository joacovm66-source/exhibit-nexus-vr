export type Exhibit = {
  id: string;
  author: string;
  nationality?: string;
  work: string;
  year?: string;
  description: string;
  why: string;
  cover: string;
  qrUrl?: string;
};

export type Room = {
  id: string;
  name: string;
  curator: string;
  /** angle in radians from center of lobby (0 = +x). */
  angle: number;
  /** accent hex used for door header and labels. */
  accent: string;
  exhibits: Exhibit[];
};

export const ROOMS: Room[] = [
  {
    id: "bianca",
    name: "Sala Bianca B.",
    curator: "Curaduría · Bianca B.",
    angle: Math.PI, // -x
    accent: "#b58a5a",
    exhibits: [
      {
        id: "moro",
        author: "César Moro",
        nationality: "Perú",
        work: "La tortuga ecuestre",
        year: "1957",
        description:
          "Poeta y artista surrealista. Uno de los pioneros de la vanguardia latinoamericana; expresó temas vinculados al deseo y la identidad sexual en una época marcada por la discriminación.",
        why: "Comentó sobre la diversidad sexual e innovación estética. Su poesía renovó el lenguaje literario peruano y representa una voz LGBTQIA+ históricamente marginada.",
        cover: PLACEHOLDER,
      },
      {
        id: "cornejo",
        author: "María Emilia Cornejo",
        nationality: "Perú",
        work: "Todo lo guardo en mis ojos — poesía reunida",
        description:
          "Poeta feminista, precursora de la poesía erótica en el Perú a inicios de los años 70. Murió a los 23 años, pero su obra tiene gran repercusión actual.",
        why: "Censurada por hablar abiertamente sobre sexualidad, femineidad y erotismo desde la voz de una mujer; su trabajo resuena hoy con nuevas generaciones de lectoras.",
        cover: PLACEHOLDER,
      },
      {
        id: "churata",
        author: "Gamaliel Churata",
        nationality: "Perú",
        work: "El pez de oro",
        year: "1957",
        description:
          "Escritor, periodista e intelectual puneño. Su obra integra filosofía andina, mitología indígena y las lenguas quechua y aimara. Durante mucho tiempo fue poco estudiado por romper con los modelos occidentales.",
        why: "Diversidad cultural e innovación literaria: una propuesta literaria desde la cosmovisión andina que reivindica las culturas indígenas en la literatura peruana.",
        cover: PLACEHOLDER,
      },
      {
        id: "agustini",
        author: "Delmira Agustini",
        nationality: "Uruguay",
        work: "Los cálices vacíos",
        year: "1913",
        description:
          "Poeta modernista que escribió sobre deseo femenino y erotismo en una época altamente conservadora. Fue asesinada joven y durante mucho tiempo su obra fue leída desde una mirada moralista que contribuyó a su marginación.",
        why: "Criterio de género y transgresión temática. Su poesía rompe con las normas sociales de su tiempo al expresar el deseo femenino de manera directa, motivo por el cual fue excluida del canon tradicional.",
        cover: PLACEHOLDER,
      },
    ],
  },
  {
    id: "jose-david",
    name: "Sala José David",
    curator: "Curaduría · José David",
    angle: 0, // +x
    accent: "#7a8c5c",
    exhibits: [
      {
        id: "orbegoso",
        author: "Teresa Orbegoso",
        nationality: "Perú",
        work: "Comas",
        description:
          "Fotolibro escrito en prosa poética que cuenta, en primera persona, memorias de viajes mientras recorre espacios vitales que tienen como eje Lima Norte —en particular Comas— como espacio geográfico, histórico y de representación social.",
        why: "Representatividad social y cultural: retrata la experiencia de Lima Norte y da visibilidad a espacios y comunidades poco representadas en la literatura peruana.",
        cover: "https://placerescompulsivos.pe/cdn/shop/files/comas-teresa-orbegoso.jpg",
      },
      {
        id: "wong",
        author: "Julia Wong",
        nationality: "Perú",
        work: "Historia de una gorda",
        description:
          "Aborda la lucha interna de la autora por aceptar su cuerpo y su identidad femenina en una sociedad marcada por estereotipos y por la cultura oriental.",
        why: "Originalidad temática y relevancia social: identidad, cuerpo femenino y estereotipos de belleza desde una perspectiva personal y crítica.",
        cover: "https://tusanaje.org/biblioteca/files/original/historia-de-una-gorda.jpg",
      },
      {
        id: "ananco",
        author: "Dina Ananco",
        nationality: "Perú",
        work: "Sanchiu",
        description:
          "Escrita originalmente en lengua wampis y auto traducida al español, es un homenaje a las mujeres de su pueblo y toma su nombre de su abuela, Elena Sanchiu.",
        why: "Diversidad lingüística y cultural: revaloriza la lengua y la cultura wampis e incorpora voces indígenas al patrimonio literario peruano.",
        cover: "https://www.vallejoandcompany.com/wp-content/uploads/2021/10/Sanchiu.jpg",
      },
      {
        id: "zuniga",
        author: "Nemesio Zúñiga",
        nationality: "Perú",
        work: "Qurich'uspi",
        description:
          "Narra una historia de amor, conflictos y valores morales dentro de la sociedad incaica, con Qurich'uspi (\u201cMosca Dorada\u201d) como personaje principal.",
        why: "Valor histórico y cultural: recupera temas de la tradición incaica y contribuye a preservar la memoria y los valores del pasado andino.",
        cover: PLACEHOLDER,
      },
    ],
  },
  {
    id: "luna",
    name: "Sala Luna B.",
    curator: "Curaduría · Luna B.",
    angle: Math.PI / 2, // +z (back)
    accent: "#a07594",
    exhibits: [
      {
        id: "orjeda",
        author: "Antonio Orjeda",
        nationality: "Perú",
        work: "Mujeres batalla",
        description:
          "Concepto desarrollado por el periodista Antonio Orjeda para recoger y promover la experiencia de mujeres emprendedoras en el Perú.",
        why: "Dirigido sobre todo a niñas, reúne historias de mujeres que enfrentaron situaciones machistas o de discriminación y supieron luchar contra ellas, inspirando a las nuevas generaciones a seguir sus pasos.",
        cover: PLACEHOLDER,
      },
      {
        id: "lemebel",
        author: "Pedro Lemebel",
        nationality: "Chile",
        work: "Tengo miedo torero",
        year: "2001",
        description:
          "Única novela del cronista chileno Pedro Lemebel. Ambientada en Santiago en 1986, narra el romance entre 'la Loca del Frente' —una travesti madura y solitaria— y Carlos, un joven militante del Frente Patriótico Manuel Rodríguez que prepara el atentado contra Pinochet. Una historia de amor imposible que se entreteje con la resistencia clandestina contra la dictadura.",
        why: "Une por primera vez la identidad homosexual con la pobreza urbana y la militancia política en Chile. Su prosa barroca, llena de boleros, kitsch y ternura, demuestra que la gran literatura también surge desde los márgenes y vuelve protagonista a una travesti pobre en plena dictadura.",
        cover: "/covers/lemebel.jpg",
      },
      {
        id: "cabezon",
        author: "Gabriela Cabezón Cámara",
        nationality: "Argentina",
        work: "La virgen Cabeza",
        description:
          "Escribe desde lo que denomina marginalidad queer. Sus historias incluyen travestis, villas miseria, ocupaciones de tierras y religiosidad popular.",
        why: "Logra que personajes históricamente marginados ocupen el centro de relatos complejos y relevantes para la literatura latinoamericana contemporánea.",
        cover: PLACEHOLDER,
      },
      {
        id: "melchor",
        author: "Fernanda Melchor",
        nationality: "México",
        work: "Temporada de huracanes",
        year: "2017",
        description:
          "Novela que parte del hallazgo del cadáver de 'la Bruja' en un canal de regadío del pueblo ficticio de La Matosa, Veracruz. A través de capítulos sin puntos, en un torrente de voces, Melchor reconstruye los días previos al crimen: feminicidio, machismo extremo, miseria, narcotráfico y deseo reprimido en el México rural contemporáneo.",
        why: "Renovó la novela latinoamericana con una prosa hipnótica de flujo de conciencia que denuncia, sin concesiones, la violencia estructural contra las mujeres y los cuerpos disidentes. Una voz que incomoda al canon precisamente por su crudeza y su politización del lenguaje.",
        cover: "/covers/melchor.jpg",
      },
    ],
  },
  {
    id: "joaquin",
    name: "Sala Joaquín V.",
    curator: "Curaduría · Joaquín V.",
    angle: -Math.PI / 2, // -z (front)
    accent: "#6f8a9b",
    exhibits: [
      {
        id: "canayo",
        author: "Lastenia Canayo",
        nationality: "Perú · Shipibo-Konibo",
        work: "Los dueños del mundo shipibo",
        description:
          "Escritora y artista del pueblo shipibo-konibo de la Amazonía peruana. Su obra trata temas ancestrales y la relación espiritual entre las comunidades indígenas y la naturaleza.",
        why: "Representa a la Amazonía, históricamente excluida del canon tradicional. Su trabajo preserva la cultura y la cosmovisión indígena.",
        cover: PLACEHOLDER,
      },
      {
        id: "kambeba",
        author: "Márcia Wayna Kambeba",
        nationality: "Brasil · Omágua-Kambeba",
        work: "Ay Kakyri Tama: Eu Moro na Cidade",
        description:
          "Poeta y activista del pueblo Omágua-Kambeba. Sus poemas abordan la identidad indígena, la vida en las ciudades, la protección de la Amazonía y los desafíos actuales de las comunidades originarias.",
        why: "Visibiliza la experiencia indígena contemporánea y rompe con la idea de que los pueblos originarios pertenecen únicamente al pasado.",
        cover: PLACEHOLDER,
      },
      {
        id: "calvo",
        author: "César Calvo",
        nationality: "Perú",
        work: "Las tres mitades de Ino Moxo y otros brujos amazónicos",
        description:
          "Escritor nacido en Iquitos que exploró los saberes, creencias y formas de vida de los pueblos amazónicos. Su novela mezcla realidad, tradición oral y espiritualidad indígena.",
        why: "Ofrece una visión de la Amazonía distinta a la de la literatura occidental y da protagonismo a conocimientos marginados por el canon.",
        cover: PLACEHOLDER,
      },
      {
        id: "yagua",
        author: "Yaguarê Yamã",
        nationality: "Brasil · Maraguá",
        work: "Sehaypóri: o livro sagrado do povo Maraguá",
        description:
          "Escritor del pueblo Maraguá que recupera mitos, leyendas y relatos transmitidos oralmente por generaciones. Busca preservar y difundir la cultura amazónica indígena.",
        why: "Integra al canon narraciones que la tradición occidental no suele considerar literatura: autor indígena, literatura oral, contexto amazónico.",
        cover: PLACEHOLDER,
      },
    ],
  },
];