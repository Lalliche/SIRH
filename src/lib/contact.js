// Mock demo-request backend. Resolves after a delay; never calls a real service (wire it up only when told to).
import { site } from "@/content/site";

export const PHONE_RE = /^(?:\+213|00213|0)[1-9]\d{7,8}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an error message (French) or "" when valid. */
export function validateContactField(name, raw) {
  const value = (raw ?? "").trim();
  switch (name) {
    case "name":
      return value.length < 2 ? "Indiquez votre nom et prénom." : "";
    case "company":
      return value.length < 2 ? "Indiquez le nom de votre entreprise." : "";
    case "headcount":
      return value ? "" : "Choisissez une tranche d'effectif.";
    case "phone":
      return PHONE_RE.test(value.replace(/[\s.\-()]/g, "")) ? "" : "Numéro invalide. Exemple : 0550 12 34 56 ou +213 550 12 34 56.";
    case "email":
      return EMAIL_RE.test(value) ? "" : "Adresse e-mail invalide. Exemple : nom@entreprise.dz.";
    default:
      return "";
  }
}

export function validateContactForm(values) {
  const errors = {};
  for (const key of ["name", "company", "headcount", "phone", "email"]) {
    const message = validateContactField(key, values[key]);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Mock submit: resolves `{ ok, reference }` after ~1.2 s, rejects on invalid payload. */
export function submitContactRequest(values) {
  return new Promise((resolve, reject) => {
    const errors = validateContactForm(values);
    setTimeout(() => {
      if (Object.keys(errors).length) {
        reject(Object.assign(new Error("Formulaire invalide"), { errors }));
        return;
      }
      const reference = `DEM-${Math.floor(100000 + Math.random() * 900000)}`;
      resolve({ ok: true, reference });
    }, 1200);
  });
}

/** wa.me deep link built from the site WhatsApp number. */
export function whatsappUrl(message) {
  const digits = site.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
