import type { Metadata } from "next";

import { ExamplesContent } from "../../components/examples-content";

export const metadata: Metadata = { title: "Examples" };

export default function ExamplesPage() {
  return <ExamplesContent />;
}
