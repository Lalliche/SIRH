// No-flash theme bootstrap: runs before paint. Light is the product's default (design-system.md: "Light is the
// default, dark is a first-class theme") — we deliberately do NOT follow the OS preference, so a visitor on a
// dark-mode machine still sees the brand's chalk canvas until they opt into dark from the top bar.
const script = `try{var t=localStorage.getItem("sirh:theme");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
