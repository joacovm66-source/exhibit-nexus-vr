import { createFileRoute } from "@tanstack/react-router";
import { MuseumApp } from "@/museum/Museum";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canon Literario Alternativo — Museo 3D" },
      {
        name: "description",
        content:
          "Museo 3D recorrible dedicado al canon literario alternativo: voces LGBTQIA+, andinas, amazónicas, indígenas y feministas de América Latina.",
      },
      { property: "og:title", content: "Canon Literario Alternativo — Museo 3D" },
      {
        property: "og:description",
        content:
          "Camina por las salas Bianca B., José David, Luna B. y Joaquín V., y descubre obras históricamente excluidas del canon.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <MuseumApp />;
}
