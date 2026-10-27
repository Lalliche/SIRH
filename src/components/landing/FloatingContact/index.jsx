import { site } from "@/content/site";
import FloatingContactClient from "./FloatingContactClient";

export default function FloatingContact() {
  return <FloatingContactClient phone={site.phone} whatsapp={site.whatsapp} />;
}
