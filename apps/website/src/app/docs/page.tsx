import type { Metadata } from "next";

import { DocsContent } from "../../components/docs-content";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return <DocsContent />;
}
