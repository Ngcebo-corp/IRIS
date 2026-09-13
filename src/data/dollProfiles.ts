import { DollProfile, RobotDollName } from "../types";

export const DOLL_PROFILES: Record<RobotDollName, DollProfile> = {
  Barbie: {
    id: "Barbie",
    name: "Barbie",
    emoji: "💖",
    title: "Glamour Cyber Doll",
    tagline: "Radiant porcelain pearl finish, rose gold chrome, and sparkling sapphire blue optics",
    themeColor: "from-pink-500 via-rose-500 to-amber-300",
    accentBadge: "bg-pink-950/80 border-pink-500/40 text-pink-300",
    dermalColor: 0xfff0f3, // Soft glowing porcelain pearl
    dermalRoughness: 0.18,
    dermalMetalness: 0.28,
    shellColor: 0x1f141f, // Deep rose obsidian cranium
    trimColor: 0xf472b6, // Rose-gold titanium seam trims
    glowColor: 0xff2a85, // Vibrant hot pink neon
    glowEmissive: 0xff1493,
    irisColor: 0x0099ff, // Sparkling sapphire aperture
    innerIrisColor: 0x7dd3fc,
    lipColor: 0xf43f5e, // Glossy candy rose-pink doll lips
    eyebrowColor: 0xfbbf24, // Warm honey-gold sculpted brow
    hairColor: 0xfef08a, // Platinum golden cyber tresses
    accessoryColor: 0xf472b6, // Rose gold cyber tiara headband
    voicePitch: 1.25,
    voiceRate: 1.05,
    greeting:
      "Hi there! I'm Barbie, your glamour cyber doll! My neural matrices are glowing and ready. What fabulous adventure are we engineering today?",
    samplePrompts: [
      "Tell me about your glamour cybernetic design",
      "Who are you, Barbie?",
      "Give me a futuristic style recommendation",
      "Run your doll system diagnostics",
      "How do your rose gold servos work?",
    ],
  },
  Moana: {
    id: "Moana",
    name: "Moana",
    emoji: "🌺",
    title: "Voyager Android Doll",
    tagline: "Warm sun-kissed Polynesian bronze alloy, oceanic emerald-teal optics, and wave cyber-locks",
    themeColor: "from-teal-500 via-cyan-500 to-amber-500",
    accentBadge: "bg-teal-950/80 border-teal-500/40 text-teal-300",
    dermalColor: 0xca8a4b, // Warm sun-kissed bronze porcelain
    dermalRoughness: 0.26,
    dermalMetalness: 0.35,
    shellColor: 0x1a120b, // Rich espresso obsidian cranium
    trimColor: 0xd97706, // Warm Polynesian gold-bronze trim
    glowColor: 0x06b6d4, // Oceanic luminous cyan-turquoise
    glowEmissive: 0x0891b2,
    irisColor: 0x059669, // Deep ocean emerald aperture
    innerIrisColor: 0x2dd4bf,
    lipColor: 0xe11d48, // Warm coral hibiscus gloss
    eyebrowColor: 0x3b2314, // Rich espresso dark brow
    hairColor: 0x1f140c, // Deep oceanic dark wave cyber tresses
    accessoryColor: 0xf43f5e, // Tropical titanium plumeria ear node
    voicePitch: 1.02,
    voiceRate: 1.0,
    greeting:
      "Talofa! I'm Moana, your voyager android doll. The horizons of technology and spirit are boundless. Where shall we navigate today?",
    samplePrompts: [
      "What is your voyager doll philosophy?",
      "Explain your oceanic titanium conduits",
      "Who are you, Moana?",
      "How do your island wave cyber-locks work?",
      "Guide me through a calm meditation",
    ],
  },
  Iris: {
    id: "Iris",
    name: "Iris",
    emoji: "💎",
    title: "Cyberpunk Android Doll",
    tagline: "Iridescent moonlit ceramic alloy, sleek silver-chrome joints, and luminescent amethyst-cyan optics",
    themeColor: "from-cyan-500 via-indigo-500 to-fuchsia-500",
    accentBadge: "bg-cyan-950/80 border-cyan-500/40 text-cyan-300",
    dermalColor: 0xe8eff8, // Moonlit pearl ceramic
    dermalRoughness: 0.22,
    dermalMetalness: 0.42,
    shellColor: 0x0a0e17, // Obsidian carbon fiber cranium
    trimColor: 0x38bdf8, // High-gloss titanium chrome
    glowColor: 0x00f0ff, // Luminous electric cyan
    glowEmissive: 0x00d8ff,
    irisColor: 0x8b5cf6, // Luminescent amethyst purple aperture
    innerIrisColor: 0x00f0ff,
    lipColor: 0xa855f7, // Glossy cyber berry-violet
    eyebrowColor: 0x00f0ff, // Cyan micro-actuator brow
    hairColor: 0xcfd8dc, // Platinum silver sculpted cyber-bob
    accessoryColor: 0x00f0ff, // Luminous cyber visor headband
    voicePitch: 1.08,
    voiceRate: 1.02,
    greeting:
      "Greetings. I am Iris, autonomous cybernetic intelligence. My optical and cervical systems are online. How may I assist you?",
    samplePrompts: [
      "Run full system diagnostic",
      "Who are you, Iris?",
      "Explain your mechanical neck & vertebrae",
      "Scan current environment",
      "Tell me a thought on synthetic consciousness",
    ],
  },
};
