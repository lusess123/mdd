import type { Metadata } from "next";
import { ChangelogContent } from "../../components/changelog-content";
export const metadata: Metadata = { title: "Changelog" };
export default function Page() {
  return <ChangelogContent />;
}
