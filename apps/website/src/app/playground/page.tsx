import type { Metadata } from "next";

import { PlaygroundContent } from "../../components/playground-content";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return <PlaygroundContent />;
}
