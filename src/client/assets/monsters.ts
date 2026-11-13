import type { MonsterInput } from '../../shared/commands';

export type MonsterPreset = Readonly<MonsterInput & {
  set: string;
  aliases: readonly string[];
  /** El nombre argentino está cotejado con material de la edición de Buró. */
  buro?: true;
}>;

const BASE = 'Munchkin base';
const UNNATURAL_AXE = 'Munchkin 2: Hacha Sobrenatural';
const CLERICAL_ERRORS = 'Munchkin 3: Errores Clericales';

// Las fichas sin marca de Buró sirven de referencia para cotejar futuras cartas.
// Las bonificaciones y recompensas condicionales se aplican durante la partida.
const monsters: readonly MonsterPreset[] = [
  // Fotos de producto de Asmodee España: https://www.asmodee.es/product/munchkin/
  { name: 'Chupacaras', strength: 8, levels: 1, treasures: 2, set: BASE, aliases: ['Face Sucker'] },

  // Cartas fotografiadas en https://www.elcornetin.es/blog/juegos/resena-munchkin/
  { name: 'Planta en un Tiesto', strength: 1, levels: 1, treasures: 1, set: BASE, aliases: ['Planta en maceta', 'Potted Plant'] },
  { name: 'Pollo Dopado con Esteroides', strength: 2, levels: 1, treasures: 1, set: BASE, aliases: ['Large Angry Chicken'] },
  { name: 'Duendecillo Leproso', strength: 4, levels: 1, treasures: 2, set: BASE, aliases: ['Leperchaun'] },
  { name: 'Jugador de Rol Zombi', strength: 6, levels: 1, treasures: 2, set: BASE, aliases: ['Shrieking Geek'] },
  { name: '3872 Orcos', strength: 10, levels: 1, treasures: 3, set: BASE, aliases: ['3,872 Orcs'] },
  { name: 'Innombrable Horror de la Aberración Incognoscible', strength: 14, levels: 1, treasures: 4, set: BASE, aliases: ['Unspeakably Awful Indescribable Horror'] },
  { name: 'Golem de (los que se fuman la) Piedra', strength: 14, levels: 1, treasures: 4, set: BASE, aliases: ['Stoned Golem'] },

  // Cartas fotografiadas en https://cabronos.blogspot.com/2011/08/los-chollos-del-munchkin.html
  { name: 'Rata Muy Enfadada', strength: 1, levels: 1, treasures: 1, set: BASE, aliases: ['Maul Rat'] },
  { name: 'Ladillas', strength: 1, levels: 1, treasures: 1, set: BASE, aliases: ['Crabs'] },
  { name: 'Goblin Lastimado', strength: 1, levels: 1, treasures: 1, set: BASE, aliases: ['Lame Goblin'] },
  { name: 'Pez Guardián', strength: 1, levels: 1, treasures: 1, set: CLERICAL_ERRORS, aliases: ['Goldfish'] },
  { name: 'El Canario Borracho en el Ojo del Contemplador', strength: 1, levels: 1, treasures: 1, set: CLERICAL_ERRORS, aliases: ['Tequila Mockingbird'] },
  { name: 'Monigote', strength: 1, levels: 1, treasures: 1, set: CLERICAL_ERRORS, aliases: ['Stick Figure'] },

  // Carta fotografiada en https://www.darkstone.es/discusion-sobre-juegos-de-mesa-en-general-no-resenas/munchkin/
  { name: 'Rey Tut', strength: 16, levels: 2, treasures: 4, set: BASE, aliases: ['King Tut'] },

  // Valores de las cartas de door5.jpg. Nombres contrastados con estas partidas en castellano:
  // https://groups.google.com/g/es.rec.juegos.rol/c/e902ATlQynk
  // https://elviernestocajugar.blogspot.com/2012/05/munchkin-04052012.html
  { name: 'Aspirante a Vampiro', strength: 12, levels: 1, treasures: 3, set: BASE, aliases: ['Wannabe Vampire'] },
  { name: 'Ranas Voladoras', strength: 2, levels: 1, treasures: 1, set: BASE, aliases: ['Flying Frogs'] },

  // Nombre de la edición española: https://fancueva.com/ludico/munchkin-parodiando-el-rol-con-cartas/
  // Valores impresos en la versión de Squidzilla, publicada también como Calamadzilla en una traducción anterior:
  // https://es.scribd.com/document/432604288/258207166-Munchkin-Espanol-Mazmorras-1-pdf
  { name: 'Pulpodzilla', strength: 18, levels: 2, treasures: 4, set: BASE, aliases: ['Squidzilla', 'Calamadzilla'] },

  // Buró: nombre y valores del Troll (p. 10), y nombre de Viscosidad Babeante (p. 8).
  // https://www.buroargentina.com/Reglamentos/Munchkin_Reglamento_Web.pdf
  { name: 'Troll', strength: 10, levels: 1, treasures: 3, set: BASE, aliases: ['Troll de Internet', 'Troll de Foro', 'Troll de la lista de correo', 'Net Troll'], buro: true },
  { name: 'Viscosidad Babeante', strength: 1, levels: 1, treasures: 1, set: BASE, aliases: ['Babosa Babeante', 'Drooling Slime'], buro: true },

  // Fotos de la edición argentina: https://www.dadosenmano.com.ar/productos/munchkin/
  { name: 'Octaedro Gelatinoso', strength: 2, levels: 1, treasures: 1, set: BASE, aliases: ['Gelatinous Octahedron'], buro: true },
  { name: 'Hermanos Wight', strength: 16, levels: 2, treasures: 4, set: BASE, aliases: ['Viuda de Andrés Queleto e Hijos, Reparaciones y Cirugía', 'Wight Brothers'], buro: true },
  { name: 'Dragón de Plutonio', strength: 20, levels: 2, treasures: 5, set: BASE, aliases: ['Plutonium Dragon'], buro: true },

  // Carta argentina fotografiada en https://boardgamegeek.com/image/4327901/munchkin
  { name: 'Nariz Flotante', strength: 10, levels: 1, treasures: 3, set: BASE, aliases: ['Floating Nose'], buro: true },

  // Nombre argentino: https://www.tukigames.com.ar/productos/munchkin/
  // Valores de Lawyers en door5.jpg.
  { name: 'Abogados', strength: 6, levels: 1, treasures: 2, set: BASE, aliases: ['Los Abogados', 'Lawyers'], buro: true },

  // Nombre argentino: https://laboardgamehouse.com/producto/munchkin-2-hacha-sobrenatural-expansion/
  // Valores cotejados con la carta equivalente en https://www.asmodee.es/product/munchkin-2-hacha-descomunal/
  { name: 'Demonio Tentacular', strength: 15, levels: 2, treasures: 4, set: UNNATURAL_AXE, aliases: ['Demonio Tentaculado', 'Tentacle Demon'], buro: true },
  // Hidrante figura en el dorso de la caja de Buró. Carta original reproducida en la sección i):
  // https://bdm.unb.br/bitstream/10483/6723/6/2011_JuliaCamposMMaia.pdf
  { name: 'Hidrante', strength: 15, levels: 2, treasures: 4, set: UNNATURAL_AXE, aliases: ['Hydrant'], buro: true },

  // Nombres del dorso de la caja argentina y su ficha comercial:
  // https://madtoyzjugueteria.com/product/munchkin-3-errores-clericales-buro-juego-de-mesa/
  // Valores de las cartas equivalentes; Stick Figure coincide con Monigote.
  // https://www.funtrivia.com/trivia-quiz/Hobbies/Munchkin-3-Clerical-Errors-348968.html
  // https://boardgamegeek.com/image/891434/munchkin-3-clerical-errors
  // https://boardgamegeek.com/image/891435/munchkin-3-clerical-errors
  // https://boardgamegeek.com/image/891436/munchkin-3-clerical-errors
  // https://boardgamegeek.com/image/149232/munchkin-3-clerical-errors
  // https://rulesofplay.co.uk/products/munchkin-3-clerical-errors
  { name: 'Marylich Monroe', strength: 17, levels: 2, treasures: 4, set: CLERICAL_ERRORS, aliases: ['Seven Year Lich'], buro: true },
  { name: 'Dopplegángsters', strength: 10, levels: 1, treasures: 3, set: CLERICAL_ERRORS, aliases: ['Dopplegangsters'], buro: true },
  { name: 'Cerdo Machista', strength: 8, levels: 1, treasures: 2, set: CLERICAL_ERRORS, aliases: ['Male Chauvinist Pig'], buro: true },
  { name: 'Gothyanki', strength: 4, levels: 1, treasures: 2, set: CLERICAL_ERRORS, aliases: [], buro: true },
  { name: 'Plumífero Primigenio', strength: 16, levels: 2, treasures: 4, set: CLERICAL_ERRORS, aliases: ['Fowl Fiend'], buro: true },
  { name: 'Árbol Barrabrava', strength: 13, levels: 1, treasures: 3, set: CLERICAL_ERRORS, aliases: ['Redneck Tree'], buro: true },
  { name: 'Conejito Perfectamente Normal', strength: 2, levels: 1, treasures: 1, set: CLERICAL_ERRORS, aliases: ['Perfectly Ordinary Bunny Rabbit'], buro: true },
  { name: 'Dibujo con Palitos', strength: 1, levels: 1, treasures: 1, set: CLERICAL_ERRORS, aliases: ['Monigote', 'Stick Figure'], buro: true },
];

function normalize(text: string): string {
  return text.normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(\d)[.,](?=\d)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const sortedMonsters = monsters.filter((monster) => monster.buro)
  .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'));

export const monsterSets = [...new Set(sortedMonsters.map((monster) => monster.set))];

export function searchMonsters(query: string): MonsterPreset[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [...sortedMonsters];

  const terms = normalizedQuery.split(' ');
  return sortedMonsters.filter((monster) => {
    const names = [monster.name, ...monster.aliases].map(normalize);
    return names.some((name) => terms.every((term) => name.includes(term)));
  });
}
