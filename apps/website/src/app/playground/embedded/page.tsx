import type { Metadata } from "next";
import { EmbeddedDemo } from "../../../demos/embedded/embedded-demo";
export const metadata: Metadata = { title: "MMD 0.2.0 · Embedded CRUD" };
export default function Page() {
  return <EmbeddedDemo />;
}
