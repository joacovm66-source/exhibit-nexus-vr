import { createFileRoute } from "@tanstack/react-router";
import { MuseumApp } from "@/museum/Museum";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Literatura — A 3D Literature Museum" },
      { name: "description", content: "An immersive, walkable 3D museum for exhibiting literary works, authors, timelines, and analysis." },
      { property: "og:title", content: "Literatura — A 3D Literature Museum" },
      { property: "og:description", content: "Walk through a futuristic exhibition space and curate any literary work." },
    ],
  }),
  component: Index,
});

function Index() {
  return <MuseumApp />;
}
