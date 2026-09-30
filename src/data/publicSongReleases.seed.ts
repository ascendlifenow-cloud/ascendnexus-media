import type { PublicSongRelease } from "../models/release";
import { createSeedExternalLinks } from "./publicExternalLinks.seed";

const release = (
  artistId: string,
  sequence: string,
  title: string,
  slug: string,
  releaseDate: string,
  genre: string,
  styleTags: string[],
  options: Partial<PublicSongRelease> = {},
): PublicSongRelease => ({
  releaseId: `rel-${sequence}`,
  songId: `song-${sequence}`,
  artistId,
  title,
  slug,
  coverArtUrl: `cover-${slug}`,
  releaseDate,
  genre,
  styleTags,
  status: "published",
  externalLinks: createSeedExternalLinks(slug),
  ...options,
});

export const publicSongReleasesSeed: PublicSongRelease[] = [
  release("artist-nova-rea", "nova-001", "Firefly Instructions", "firefly-instructions", "2026-07-01", "Pop", ["dreamy", "colorful", "uplifting"], {
    audioPreviewUrl: "/audio/orion-signal-preview.wav",
    featured: true,
    featuredSortOrder: 1,
    featuredLabel: "Featured Release",
    featuredDescription:
      "A bright, kinetic pop signal from Nova Rea, built for curious listeners and first-visit discovery.",
    featuredPlacement: "homepage",
  }),
  release("artist-nova-rea", "nova-002", "Constellations In Sneakers", "constellations-in-sneakers", "2026-06-17", "Pop", ["playful", "cosmic", "melodic"]),
  release("artist-nova-rea", "nova-003", "The Color of Tomorrow", "the-color-of-tomorrow", "2026-06-01", "Inspirational", ["colorful", "uplifting", "storytelling"]),
  release("artist-nova-rea", "nova-004", "The Girl Who Befriended Rain", "the-girl-who-befriended-rain", "2026-05-18", "Alternative", ["emotional", "dreamy", "reflective"]),
  release("artist-nova-rea", "nova-draft-001", "Brighter Than Tuesday", "brighter-than-tuesday", "2026-07-12", "Pop", ["draft", "bright"], {
    status: "draft",
  }),

  release("artist-celestial-echo", "celestial-001", "Gravity Forgot My Feet", "gravity-forgot-my-feet", "2026-06-29", "Electronic", ["cosmic", "high-energy", "playful"], {
    audioPreviewUrl: "/audio/luma-velvet-preview.wav",
    featured: true,
    featuredSortOrder: 2,
    featuredLabel: "Artist Pick",
    featuredDescription: "A weightless electronic pulse for the Celestial Echo profile experience.",
    featuredPlacement: "artist",
  }),
  release("artist-celestial-echo", "celestial-002", "Dance Until The Stars Notice", "dance-until-the-stars-notice", "2026-06-08", "Pop", ["dance", "cosmic", "uplifting"]),
  release("artist-celestial-echo", "celestial-003", "The Sky Has Good Rhythm", "the-sky-has-good-rhythm", "2026-05-21", "Electronic", ["atmospheric", "melodic", "playful"]),

  release("artist-orion-vale", "orion-001", "The Universe Learning Its Name", "the-universe-learning-its-name", "2026-07-03", "Cinematic", ["cinematic", "cosmic", "reflective"], {
    audioPreviewUrl: "/audio/orion-after-preview.wav",
    featured: true,
    featuredSortOrder: 3,
    featuredLabel: "Global Spotlight",
    featuredDescription: "A cinematic meditation on emergence, identity, and looking back at the cosmos.",
    featuredPlacement: "global",
  }),
  release("artist-orion-vale", "orion-002", "Gravity of Meaning", "gravity-of-meaning", "2026-06-15", "Electronic", ["philosophical", "atmospheric", "melodic"]),
  release("artist-orion-vale", "orion-003", "The Truth Isn't Shy", "the-truth-isnt-shy", "2026-05-30", "Pop", ["emotional", "cinematic", "soulful"]),
  release("artist-orion-vale", "orion-004", "One Fire Many Lanterns", "one-fire-many-lanterns", "2026-05-12", "Inspirational", ["uplifting", "storytelling", "cinematic"]),
  release("artist-orion-vale", "orion-archived-001", "The Geometry Of Becoming", "the-geometry-of-becoming", "2026-04-22", "Experimental", ["archived", "abstract"], {
    status: "archived",
  }),

  release("artist-universal-whispers", "whispers-001", "Many Windows, One House", "many-windows-one-house", "2026-06-25", "Inspirational", ["reflective", "storytelling", "soulful"], {
    audioPreviewUrl: "/audio/echo-blacklight-preview.wav",
  }),
  release("artist-universal-whispers", "whispers-002", "Build It Twice", "build-it-twice", "2026-06-04", "Cinematic", ["uplifting", "melodic", "reflective"]),
  release("artist-universal-whispers", "whispers-003", "The Echo We Leave Behind", "the-echo-we-leave-behind", "2026-05-19", "Alternative", ["emotional", "atmospheric", "storytelling"]),
  release("artist-universal-whispers", "whispers-004", "The Backpacks We Can't See", "the-backpacks-we-cant-see", "2026-05-02", "Inspirational", ["reflective", "empathetic", "cinematic"], {
    styleTags: [],
  }),

  release("artist-solstice-bloom", "solstice-001", "The Wind Told Me So", "the-wind-told-me-so", "2026-06-20", "Folk", ["pastoral", "dreamy", "melodic"]),
  release("artist-solstice-bloom", "solstice-002", "Wildflowers Between the Cracks", "wildflowers-between-the-cracks", "2026-06-02", "Folk", ["uplifting", "organic", "storytelling"]),
  release("artist-solstice-bloom", "solstice-003", "The Bench by the Pond", "the-bench-by-the-pond", "2026-05-10", "Folk", ["reflective", "gentle", "emotional"]),
  release("artist-solstice-bloom", "solstice-004", "Borrowing Colors From the Sky", "borrowing-colors-from-the-sky", "2026-04-26", "Pop", ["colorful", "warm", "dreamy"], {
    coverArtUrl: "",
  }),

  release("artist-ember-knox", "ember-001", "The Skin I Couldn't Keep", "the-skin-i-couldnt-keep", "2026-06-18", "Alternative", ["emotional", "soulful", "cinematic"]),
  release("artist-ember-knox", "ember-002", "The Weight I Put Down", "the-weight-i-put-down", "2026-05-29", "Alternative", ["reflective", "powerful", "storytelling"]),
  release("artist-ember-knox", "ember-003", "The Garden Was Here", "the-garden-was-here", "2026-05-09", "Soul", ["soulful", "atmospheric", "healing"]),
  release("artist-ember-knox", "ember-004", "Nothing To Prove", "nothing-to-prove", "2026-04-17", "Pop", ["uplifting", "emotional", "melodic"]),

  release("artist-meme-skye", "meme-001", "Meme", "meme", "2026-06-16", "Hip-Hop", ["playful", "high-energy", "internet-bright"], {
    audioPreviewUrl: "/audio/orion-signal-preview.wav",
  }),
  release("artist-meme-skye", "meme-002", "Pocket Full of Pebbles", "pocket-full-of-pebbles", "2026-05-28", "Hip-Hop", ["playful", "melodic", "quirky"]),
  release("artist-meme-skye", "meme-003", "Hide and Seek", "hide-and-seek", "2026-05-08", "Pop", ["mischievous", "high-energy", "colorful"]),

  release("artist-august-wilder", "august-001", "Meet Me Under The Neon Lights", "meet-me-under-the-neon-lights", "2026-06-12", "Pop", ["neon", "romantic", "retro"], {
    coverArtUrl: "",
    externalLinks: {},
  }),

  release("artist-yin-gg-yan", "yin-001", "Balance In The Static", "balance-in-the-static", "2026-06-10", "Experimental", ["abstract", "playful", "reflective"], {
    coverArtUrl: "",
  }),
  release("artist-yin-gg-yan", "yin-draft-001", "Two Mirrors Laughing", "two-mirrors-laughing", "2026-07-06", "Experimental", ["draft", "abstract"], {
    status: "draft",
    externalLinks: {},
  }),
];
