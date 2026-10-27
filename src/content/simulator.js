// Landing > #simulateur and /simulateur-irg. The engine is src/lib/payroll.js; this file is copy only.
import { defaultParams } from "@/lib/payroll";
import { dateLong } from "@/lib/format";

export const simulator = {
  id: "simulateur",
  eyebrow: "Simulateur de paie",
  title: "Brut, CNAS, IRG, net : voyez où va chaque dinar.",
  description:
    "Le même moteur que dans l'application. Déplacez le curseur ou saisissez un montant : le détail se recalcule en direct, sans inscription.",
  modes: [
    { value: "gross", label: "Brut → net" },
    { value: "net", label: "Net souhaité → brut" },
  ],
  inputs: {
    gross: { label: "Salaire brut mensuel", hint: "Salaire de base + primes cotisables et imposables.", min: 24000, max: 500000, step: 1000, initial: 100000 },
    net: { label: "Net souhaité par mois", hint: "Ce que le salarié doit toucher après CNAS et IRG.", min: 20000, max: 380000, step: 1000, initial: 73800 },
  },
  presets: [
    { label: "SNMG", gross: 24000 },
    { label: "50 000", gross: 50000 },
    { label: "100 000", gross: 100000 },
    { label: "250 000", gross: 250000 },
  ],
  segments: {
    net: "Net à payer",
    cnas: "CNAS salarié",
    irg: "IRG",
  },
  rows: {
    gross: "Salaire brut",
    cnas: "Cotisation CNAS salarié",
    taxable: "Base imposable IRG",
    irg: "IRG retenu à la source",
    net: "Net à payer",
    employerTitle: "Côté employeur",
    cnasEmployer: "CNAS patronale",
    fnpos: "Œuvres sociales (FNPOS)",
    employerCost: "Coût total employeur",
    burden: "Prélèvements salariés",
    requiredGross: "Brut nécessaire",
  },
  belowSnmg: "Inférieur au SNMG (24 000 DA) : le bulletin serait bloqué avant validation.",
  disclaimer:
    "Estimation indicative, hors cas particuliers (primes non cotisables, avantages en nature, charges de famille, temps partiel). À confirmer avec votre expert-comptable.",
  rulesNote: `Barème appliqué au ${dateLong(defaultParams.effectiveFrom)}.`, // [VERIFY] rates
  cta: { label: "Calculer pour toute mon équipe", href: "/contact" },
  announce: { gross: "Brut", net: "Net", cost: "coût employeur" },
};

// /simulateur-irg SEO page
export const simulatorPage = {
  metadata: {
    title: "Simulateur IRG et salaire net en Algérie",
    description:
      "Calculez gratuitement votre salaire net à partir du brut (CNAS 9 %, IRG, abattement) ou retrouvez le brut nécessaire pour un net souhaité. Barème IRG 2026, SNMG 24 000 DA.",
    alternates: { canonical: "/simulateur-irg" },
  },
  eyebrow: "Outil gratuit",
  title: "Simulateur IRG : du salaire brut au net, en Algérie.",
  lead: "Calculez la retenue CNAS, l'IRG mensuel et le net à payer, ou l'inverse : quel brut faut-il pour un net donné. Sans inscription, avec le même moteur que celui de SIRH.",
  baremeTitle: "Barème IRG mensuel utilisé",
  baremeIntro:
    "L'IRG sur salaires se calcule par tranches sur la base imposable (brut cotisable moins cotisation CNAS salarié, arrondie à la dizaine inférieure). Un abattement de 40 % de l'impôt, plafonné et planché, s'applique ensuite.",
  baremeHeaders: { slice: "Tranche mensuelle (DA)", rate: "Taux" },
  baremeNote: "Exonération totale jusqu'à 30 000 DA imposables ; lissage entre 30 001 et 35 000 DA.", // [VERIFY]
  stepsTitle: "Comment le net est calculé",
  steps: [
    { title: "1. Cotisation CNAS salarié", text: "9 % du salaire cotisable. Un brut de 100 000 DA donne 9 000 DA de CNAS." },
    { title: "2. Base imposable", text: "Brut imposable moins la cotisation CNAS, arrondi à la dizaine de dinars inférieure : 91 000 DA dans l'exemple." },
    { title: "3. IRG par tranches", text: "Barème progressif, puis abattement de 40 % entre 1 000 et 1 500 DA : 17 200 DA dans l'exemple." },
    { title: "4. Net à payer", text: "Brut moins CNAS moins IRG : 73 800 DA. Le coût employeur, lui, monte à 125 500 DA." },
  ],
  faqTitle: "Questions sur le calcul",
  faq: [
    {
      q: "Le résultat est-il officiel ?",
      a: "Non. C'est une estimation indicative fondée sur le barème en vigueur et un bulletin standard. Primes non cotisables, avantages en nature et situations particulières peuvent changer le résultat : faites valider avec votre expert-comptable.",
    },
    {
      q: "Que se passe-t-il sous le SNMG ?",
      a: "Le SNMG est fixé à 24 000 DA par mois pour 40 heures par semaine. En dessous, SIRH bloque la validation de la paie et signale la ligne concernée.",
    },
    {
      q: "Pourquoi un net de 40 915 DA pour 50 000 DA de brut ?",
      a: "CNAS : 4 500 DA (9 %). Base imposable : 45 500 DA. IRG : 4 585 DA après abattement. Net : 50 000 − 4 500 − 4 585 = 40 915 DA.",
    },
    {
      q: "Puis-je calculer pour toute mon équipe ?",
      a: "Oui, dans SIRH : import des salariés, calcul en lot, comparaison avec le mois précédent et export des déclarations G50 et DAS. Demandez une démonstration.",
    },
  ],
  ctaTitle: "Passez de la simulation à la vraie paie.",
  ctaText: "Importez vos salariés et lancez un mois à blanc, sans engagement.",
};
