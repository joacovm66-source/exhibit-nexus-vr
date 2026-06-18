export type Exhibit = {
  id: string;
  title: string;
  author: string;
  date: string;
  movement: string;
  genre: string;
  summary: string;
  analysis: string;
  context: string;
  qrUrl: string;
};

export type Room = {
  id: string;
  name: string;
  kind: "exhibit" | "timeline" | "gallery" | "reflection";
  position: [number, number, number];
  hue: number; // accent hue
  exhibit?: Exhibit;
};

export const DEFAULT_ROOMS: Room[] = [
  {
    id: "hall-a",
    name: "Hall A — Featured Work",
    kind: "exhibit",
    position: [-26, 0, -18],
    hue: 220,
    exhibit: {
      id: "placeholder-1",
      title: "Untitled Work",
      author: "Add an author",
      date: "—",
      movement: "—",
      genre: "—",
      summary: "Place a literary work here. This panel is fully editable from the in-museum console.",
      analysis: "Critical reading, themes, and motifs go here.",
      context: "Historical context, era, and influences.",
      qrUrl: "https://example.com",
    },
  },
  {
    id: "hall-b",
    name: "Hall B — Open Exhibit",
    kind: "exhibit",
    position: [26, 0, -18],
    hue: 280,
    exhibit: {
      id: "placeholder-2",
      title: "Untitled Work",
      author: "Add an author",
      date: "—",
      movement: "—",
      genre: "—",
      summary: "An empty exhibition platform ready for a new literary work.",
      analysis: "—",
      context: "—",
      qrUrl: "https://example.com",
    },
  },
  {
    id: "timeline",
    name: "Timeline Hall",
    kind: "timeline",
    position: [0, 0, -46],
    hue: 195,
  },
  {
    id: "gallery",
    name: "Author Gallery",
    kind: "gallery",
    position: [-26, 0, 18],
    hue: 260,
  },
  {
    id: "reflection",
    name: "Reflection Room",
    kind: "reflection",
    position: [26, 0, 18],
    hue: 210,
  },
];