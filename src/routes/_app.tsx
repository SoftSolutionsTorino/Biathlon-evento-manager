import { createFileRoute } from "@tanstack/react-router";
import { ToLayout } from "@/components/ToLayout";

export const Route = createFileRoute("/_app")({
  component: ToLayout,
  head: () => ({
    meta: [
      { title: "Area Tour Operator — Antholz Biathlon" },
      { name: "description", content: "Area riservata Tour Operator per la Coppa del Mondo di Biathlon di Anterselva." },
    ],
  }),
});
