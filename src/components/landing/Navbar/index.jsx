import { navbar } from "@/content/navbar";
import { site } from "@/content/site";
import NavbarClient from "./NavbarClient";

export default function Navbar() {
  return <NavbarClient nav={navbar} phone={site.phone} />;
}
