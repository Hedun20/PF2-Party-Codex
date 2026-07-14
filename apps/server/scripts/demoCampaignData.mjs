export const DEMO_ARTICLES = [
  {
    seedKey: "demo-world-valdran",
    path: "worlds/valdran.md",
    type: "world",
    category: "worlds",
    title: "Вальдран",
    summary: "Мир пепельных королевств, древних клятв и трещин между планами.",
    visibility: "public",
    tags: ["demo", "мир", "тёмное фэнтези"],
    publicContent: "Вальдран пережил Падение Красной Луны. Старые империи удерживают дороги, пока за их стенами пробуждаются забытые договоры и существа из Пустоты.",
    gmContent: "Красная Луна не была уничтожена: её осколок запечатан под Ноктгардом и медленно меняет носителей магии.",
    frontmatter: {
      theme: "midgard",
      tone: "Тёмное героическое фэнтези",
      cosmology: "Материальный мир окружён Морем Снов и Пустотой между планами.",
      magicRules: "Сильная магия оставляет видимые шрамы на местности и памяти свидетелей.",
      conflicts: "Империя Арквен борется с культами Пустоты и наследниками Разбитой Короны."
    }
  },
  {
    seedKey: "demo-country-arkven",
    path: "countries/arkven-empire.md",
    type: "country",
    category: "countries",
    title: "Империя Арквен",
    summary: "Военная держава, которая удерживает север Вальдрана железом, договорами и страхом.",
    visibility: "public",
    tags: ["demo", "империя", "политика"],
    world: "Вальдран",
    publicContent: "Арквен защищает торговые пути и требует за это безусловной верности. Его легионы носят чёрное железо, а чиновники записывают каждую клятву.",
    gmContent: "Император уже два года мёртв. Совет регентов скрывает это, используя связанного с осколком Красной Луны двойника.",
    frontmatter: {
      capital: "Ноктгард",
      ruler: "Совет Чёрных Регентов",
      population: "Около 4 миллионов",
      languages: ["Всеобщий", "Арквенский"],
      factions: ["Чёрный Легион", "Орден Разбитой Короны"],
      laws: "Запрещены незарегистрированные порталы, некромантия и публичное отрицание власти Совета."
    }
  },
  {
    seedKey: "demo-city-noctgard",
    path: "cities/noctgard.md",
    type: "city",
    category: "cities",
    title: "Ноктгард",
    summary: "Столица Арквена, построенная вокруг кратера Красной Луны.",
    visibility: "public",
    tags: ["demo", "столица", "город"],
    world: "Вальдран",
    country: "Империя Арквен",
    publicContent: "Ноктгард поднимается чёрными террасами над багровым кратером. Днём здесь правят чиновники и купцы, ночью — патрули и тайные общества.",
    gmContent: "Под центральным дворцом существует закрытый лифт к Печати Пустоты. Только трое регентов знают полный маршрут.",
    frontmatter: {
      region: "Северное нагорье",
      population: "280 000",
      ruler: "Совет Чёрных Регентов",
      districts: ["Верхняя Корона", "Железный Порт", "Пепельные кварталы"],
      factions: ["Чёрный Легион", "Серые нотариусы", "Культ Беззвёздного Неба"],
      cityNotes: "В городе запрещены открытые маски после полуночи, но знать демонстративно игнорирует запрет."
    }
  },
  {
    seedKey: "demo-location-ash-throne",
    path: "locations/ash-throne-hall.md",
    type: "location",
    category: "locations",
    title: "Зал Пепельного Трона",
    summary: "Церемониальный зал Совета, где решения объявляют перед пустым императорским троном.",
    visibility: "public",
    tags: ["demo", "дворец", "политика"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Высокие колонны зала покрыты именами павших легионеров. На возвышении стоит трон из серого камня, к которому никто не приближается.",
    gmContent: "Трон является ключом к подземному лифту. Он реагирует на кровь законного наследника и регалию древнего наместника.",
    frontmatter: {
      locationType: "Дворцовый зал",
      owner: "Совет Чёрных Регентов",
      areas: "Галерея свидетелей; круг регентов; пустой трон; скрытая шахта лифта.",
      loot: "Печать императора, протоколы тайных заседаний и ключ-регалия."
    }
  },
  {
    seedKey: "demo-npc-elira-voss",
    path: "npcs/lady-elira-voss.md",
    type: "npc",
    category: "npcs",
    title: "Леди Элира Восс",
    summary: "Молодая регентша, которая пытается удержать империю от гражданской войны.",
    visibility: "public",
    tags: ["demo", "npc", "регент"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Элира говорит тихо, никогда не повторяет приказ и помнит имена солдат, стоявших у её дверей. Народ считает её самым человечным членом Совета.",
    gmContent: "Она знает о смерти императора, но не о двойнике. Элира готова помочь партии, если получит доказательства существования Печати.",
    frontmatter: {
      role: "Регентша и потенциальный союзник",
      ancestry: "Человек",
      faction: "Совет Чёрных Регентов",
      location: "Зал Пепельного Трона",
      attitude: "Осторожно заинтересована",
      status: "alive",
      motivation: "Предотвратить распад империи и вывести Совет из-под влияния культа.",
      isCombatant: true,
      level: 7,
      ac: 25,
      hp: 102
    }
  },
  {
    seedKey: "demo-pc-vaanar",
    path: "characters/vaanar-black-regent.md",
    type: "pc",
    category: "characters",
    title: "Ваанар, Чёрный Регент",
    summary: "Тавматург в тяжёлых латах, несущий регалию павшего дома и силу Дальней Хватки.",
    visibility: "public",
    tags: ["demo", "персонаж", "тавматург"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Ваанар скрывает лицо за полумаской и говорит с холодной уверенностью полководца. Его регалия заставляет союзников держать строй, а врагов — вспоминать собственный страх.",
    gmContent: "Его регалия является одним из ключей к Пепельному Трону. Сам Ваанар пока считает её лишь наследием семьи.",
    frontmatter: {
      playerName: "Тимур",
      ancestry: "Человек",
      heritage: "Нефилим",
      background: "Наследник павшего дома",
      className: "Тавматург",
      level: 6,
      alignment: "Принципиальный нейтральный",
      characterRole: "Фронтлайн, запугивание, поддержка аурой и телекинез"
    }
  },
  {
    seedKey: "demo-enemy-ash-praetorian",
    path: "enemies/ash-praetorian.md",
    type: "enemy",
    category: "enemies",
    title: "Пепельный Преторианец",
    summary: "Оживлённый страж печати, который копирует боевые движения противника.",
    visibility: "gmOnly",
    tags: ["demo", "враг", "конструкт"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Чёрная броня двигается без дыхания и голоса. В щелях шлема мерцает красная пыль.",
    gmContent: "После первой успешной атаки по нему Преторианец получает сопротивление 5 к типу нанесённого урона до начала своего следующего хода.",
    frontmatter: {
      level: 7,
      rarity: "uncommon",
      creatureType: "Конструкт",
      traits: ["Construct", "Mindless", "Shadow"],
      size: "Medium",
      threat: "Элитный защитник",
      ac: 26,
      hp: 115,
      saves: "Fort +18, Ref +13, Will +15",
      perception: "+15",
      speed: "25 ft.",
      attacks: "Пепельный клинок +18, 2d10+8 рубящего и 1d6 негативного урона.",
      abilities: "Отражённая стойка; шаг сквозь тень; безмолвный караул.",
      weaknesses: "Sonic 5",
      resistances: "Physical 5 (кроме адамантина)",
      tactics: "Удерживает узкий проход, копирует стойку самого опасного бойца.",
      loot: "Осколок красного кристалла и знак императорской стражи."
    }
  },
  {
    seedKey: "demo-quest-void-seal",
    path: "quests/void-seal.md",
    type: "quest",
    category: "quests",
    title: "Печать Пустоты",
    summary: "Найти вход под дворцом и остановить разрушение древней печати.",
    visibility: "revealed",
    tags: ["demo", "квест", "основной сюжет"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "В подземельях столицы участились толчки, а жители Пепельных кварталов видят одинаковые сны о распахнутых вратах.",
    gmContent: "Культ намеренно ослабляет три якоря печати. Один из них находится в регалии Ваанара, поэтому квест невозможно завершить без его решения.",
    frontmatter: {
      status: "active",
      giver: "Леди Элира Восс",
      location: "Подземелья Ноктгарда",
      objective: "Найти три якоря и восстановить Печать Пустоты.",
      steps: "Получить доступ во дворец; открыть шахту трона; пройти зал Преторианцев; решить судьбу осколка.",
      stakes: "Разрушение печати откроет проход в Пустоту и уничтожит центральные районы города.",
      rewards: "Регентский титул, доступ к архивам империи и уникальная реликвия."
    }
  },
  {
    seedKey: "demo-session-gates",
    path: "sessions/session-01-gates-of-noctgard.md",
    type: "session",
    category: "sessions",
    title: "Сессия 1: Врата Ноктгарда",
    summary: "Партия прибывает в столицу, переживает нападение и получает первое приглашение во дворец.",
    visibility: "public",
    tags: ["demo", "сессия", "recap"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Герои вошли в Ноктгард во время красной бури, спасли караван у северных ворот и обнаружили на нападавших знаки императорской стражи.",
    gmContent: "Нападение организовал культ, чтобы проверить реакцию регалии Ваанара. Один выживший агент следит за партией из Пепельных кварталов.",
    frontmatter: {
      sessionDate: "2026-07-18",
      sessionNumber: 1,
      participants: ["Ваанар", "Леди Элира Восс"],
      recap: "Прибытие, бой у ворот, знакомство с регентшей.",
      decisions: "Партия сохранила жизнь пленному и согласилась на тайную встречу.",
      unresolvedHooks: "Кто отдал приказ напасть? Почему регалия отреагировала на красную бурю?",
      nextHooks: "Допрос пленного и первая сцена в Зале Пепельного Трона."
    }
  },
  {
    seedKey: "demo-lore-broken-crown",
    path: "lore/order-of-the-broken-crown.md",
    type: "lore",
    category: "lore",
    title: "Орден Разбитой Короны",
    summary: "Полузабытый орден хранителей, чьи регалии когда-то запирали проходы между планами.",
    visibility: "public",
    tags: ["demo", "лор", "орден"],
    world: "Вальдран",
    country: "Империя Арквен",
    publicContent: "Песни называют членов Ордена королями без трона. Они носили осколки единой короны и приходили туда, где реальность начинала трескаться.",
    gmContent: "Орден был уничтожен не императором, а будущими основателями Совета. Несколько регалий пережили чистку, включая реликвию Ваанара.",
    frontmatter: {
      subtype: "faction",
      timelineYear: "До Падения Красной Луны",
      publicLegend: "Когда корона раскололась, каждый осколок стал обещанием защищать мир без права на власть."
    }
  },
  {
    seedKey: "demo-timeline-red-moon",
    path: "timeline/fall-of-the-red-moon.md",
    type: "timelineEvent",
    category: "timeline",
    title: "Падение Красной Луны",
    summary: "Катастрофа, завершившая Старую эпоху и превратившая Ноктгард в столицу империи.",
    visibility: "public",
    tags: ["demo", "timeline", "катастрофа"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "Триста двенадцать лет назад небесное тело раскололось над севером. Удар уничтожил прежнюю столицу, но из кратера поднялась стена, остановившая вторжение теней.",
    gmContent: "Стена была не чудом, а последним ритуалом Ордена Разбитой Короны. Совет переписал хроники и присвоил победу первому императору.",
    frontmatter: {
      year: "0 П.К.",
      era: "Начало Имперской эпохи",
      importance: "legendary",
      linkedPages: ["Вальдран", "Ноктгард", "Орден Разбитой Короны"]
    }
  },
  {
    seedKey: "demo-map-noctgard",
    path: "maps/noctgard-city-map.md",
    type: "map",
    category: "maps",
    title: "Карта Ноктгарда",
    summary: "Обзорная карта столицы с дворцом, портом, кварталами и закрытыми тоннелями.",
    visibility: "public",
    tags: ["demo", "карта", "ноктгард"],
    world: "Вальдран",
    country: "Империя Арквен",
    city: "Ноктгард",
    publicContent: "На публичной карте отмечены городские ворота, Верхняя Корона, Железный Порт и Пепельные кварталы.",
    gmContent: "GM-слой должен позднее содержать шахту Пепельного Трона, три якоря печати и безопасный дом культа.",
    frontmatter: {
      mapImage: "",
      mapRegion: "Ноктгард и ближайшие дороги",
      mapScale: "1 клетка = 250 метров",
      mapNotes: "Тестовая запись без обязательного изображения: карточка и пустое состояние карты должны выглядеть корректно."
    }
  }
];

export const DEMO_THAUMATURGE = {
  seedKey: "demo-character-vaanar-thaumaturge",
  source: {
    type: "demo-seed",
    seedKey: "demo-character-vaanar-thaumaturge",
    importedAt: "",
    originalFilename: "",
    rawHash: "",
    parserVersion: "demo-v1",
    warnings: []
  },
  identity: {
    name: "Ваанар, Чёрный Регент",
    ancestry: "Человек",
    heritage: "Нефилим",
    background: "Наследник павшего дома",
    className: "Тавматург",
    level: 6,
    alignment: "Принципиальный нейтральный",
    deity: "",
    languages: ["Всеобщий", "Небесный"]
  },
  visuals: {
    portraitAssetId: "",
    tokenAssetId: "",
    bannerAssetId: "",
    colorTheme: "obsidian-gold",
    icon: ""
  },
  stats: {
    maxHp: 86,
    currentHp: 86,
    tempHp: 0,
    armorClass: 24,
    speed: 20,
    perception: 13,
    saves: { fortitude: 15, reflex: 10, will: 15 },
    abilities: { str: 4, dex: 1, con: 3, int: 0, wis: 1, cha: 4 },
    skills: [
      { name: "Запугивание", rank: "Мастер", modifier: 16 },
      { name: "Оккультизм", rank: "Эксперт", modifier: 12 },
      { name: "Атлетика", rank: "Эксперт", modifier: 14 },
      { name: "Дипломатия", rank: "Обучен", modifier: 12 },
      { name: "Медицина", rank: "Обучен", modifier: 9 }
    ]
  },
  combat: {
    attacks: [
      { name: "Бастард-меч", bonus: 15, damage: "2d8+6 рубящего", traits: ["Two-Hand d12", "Versatile P"], actionCost: 1 },
      { name: "Удар латной перчаткой", bonus: 14, damage: "1d4+6 дробящего", traits: ["Agile", "Free-Hand", "Nonlethal"], actionCost: 1 }
    ],
    defenses: [{ name: "Полный латный доспех", description: "Bulwark; тяжёлый доспех" }],
    resistances: [],
    weaknesses: [],
    immunities: []
  },
  magic: {
    traditions: ["Occult", "Psychic"],
    spellcastingEntries: [{ name: "Дальняя Хватка", tradition: "Occult", ability: "Charisma" }],
    focusPoints: 1,
    spells: [
      { name: "Телекинетическая рука", level: 0, type: "Psi cantrip", description: "Манипулирует предметами на расстоянии." },
      { name: "Кинетический таран", level: 1, type: "Psi cantrip amp", description: "Силовой толчок с отбрасыванием." },
      { name: "Телекинетический манёвр", level: 2, type: "Psychic", description: "Shove, Trip или Disarm на расстоянии." },
      { name: "Телекинетический разрыв", level: 3, type: "Psychic", description: "Силовой урон по группе целей." }
    ]
  },
  progression: {
    feats: [
      { name: "Разносторонние знания", level: 1, type: "Thaumaturge" },
      { name: "Тауматургия свитков", level: 1, type: "Thaumaturge" },
      { name: "Разбитая защита", level: 4, type: "Thaumaturge" },
      { name: "Эзотерика свитков", level: 6, type: "Thaumaturge" },
      { name: "Психическая преданность", level: 2, type: "Free Archetype" },
      { name: "Дальняя Хватка", level: 2, type: "Conscious Mind" },
      { name: "Базовая психическая сила", level: 4, type: "Free Archetype" },
      { name: "Быстрое принуждение", level: 2, type: "Skill" },
      { name: "Устрашающий взгляд", level: 2, type: "Skill" },
      { name: "Ужасающая стойкость", level: 4, type: "Skill" },
      { name: "Невероятное запугивание", level: 6, type: "Skill" },
      { name: "Владение тяжёлыми доспехами", level: 3, type: "General" }
    ],
    classFeatures: [
      { name: "Орудие: Регалия", level: 1, description: "Аура авторитета, поддержка союзников и давление на врагов." },
      { name: "Эксплуатация уязвимости", level: 1 },
      { name: "Эзотерическое знание", level: 1 }
    ],
    ancestryFeatures: [
      { name: "Глаза нефилима", level: 1, description: "Тёмное зрение и золотое свечение глаз." }
    ],
    skillIncreases: [],
    boosts: []
  },
  inventory: {
    weapons: [{ name: "Бастард-меч с перекрестьем", quantity: 1, bulk: "1", level: 0 }],
    armor: [{ name: "Полный латный доспех", quantity: 1, bulk: "4", level: 2 }],
    worn: [
      { name: "Регалия павшего дома", quantity: 1, bulk: "L", level: 0 },
      { name: "Набор исследователя", quantity: 1, bulk: "1", level: 0 },
      { name: "Инструменты лекаря", quantity: 1, bulk: "1", level: 0 }
    ],
    consumables: [
      { name: "Малое лечебное зелье", quantity: 3, bulk: "L", level: 1 },
      { name: "Свиток молнии", quantity: 2, bulk: "L", level: 3 }
    ],
    treasure: [],
    bulk: "",
    text: "Основное оружие используется двумя руками; регалия должна оставаться заметной частью силуэта и интерфейса."
  },
  text: {
    publicSummary: "Тяжёлый харизматичный фронтлайн-тавматург. Давит страхом, поддерживает группу регалией и использует психическую телекинез-подготовку как магический аналог Силы.",
    privateNotes: "Ваанар не стремится выглядеть героем. Его цель — восстановить контроль над собственной судьбой и не позволить регалии превратить его в символ чужой власти.",
    buildNotes: "6 уровень: STR/CHA, полный латный доспех, бастард-меч, Regalia implement, Diverse Lore, Scroll Thaumaturgy, Shattered Defenses, Scroll Esoterica; Free Archetype Psychic / Distant Grasp.",
    gmNotes: "Использовать как главный эталон для проверки длинных названий, атак, навыков, фитов, психических сил, инвентаря, private/GM блоков и будущего портрета."
  },
  links: {
    linkedEntryIds: ["characters/vaanar-black-regent.md", "lore/order-of-the-broken-crown.md"],
    personalQuestEntryIds: ["quests/void-seal.md"],
    knownNpcIds: ["npcs/lady-elira-voss.md"],
    homeLocationId: "cities/noctgard.md"
  },
  visibility: { visibleToParty: true, sharedWithGm: true },
  rawImport: {}
};
