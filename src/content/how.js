// Landing > #fonctionnement (3 steps).
import { FileSpreadsheet, ScanSearch, Stamp } from "lucide-react";

export const how = {
  id: "fonctionnement",
  eyebrow: "Mise en route",
  title: "De votre fichier Excel à la première paie en règle.",
  description: "Trois étapes, un interlocuteur. Nous reprenons vos données, vous vérifiez, vous déclarez.",
  steps: [
    {
      icon: FileSpreadsheet,
      title: "Importez vos salariés",
      text: "Excel, CSV ou export PC Paie : colonnes reconnues, doublons signalés, matricules et numéros CNAS contrôlés avant import.",
      points: ["Modèle de fichier fourni", "Reprise des anciens bulletins sur demande"],
      chip: "Environ 1 journée",
    },
    {
      icon: ScanSearch,
      title: "Vérifiez la première paie",
      text: "SIRH calcule en parallèle de votre méthode actuelle. Chaque écart est expliqué ligne par ligne avant la moindre validation.",
      points: ["Contrôle avant paie (pré-flight)", "Comparaison avec le mois précédent"],
      chip: "Mois à blanc",
    },
    {
      icon: Stamp,
      title: "Payez et déclarez",
      text: "Validation d'un clic, bulletins publiés aux salariés, G50 et DAS prêts à déposer. Le cachet scelle la période.",
      points: ["Ordre de virement exportable", "Déclarations G50 et DAS"],
      chip: "Chaque mois",
    },
  ],
  migration: {
    title: "Migration depuis Excel ou PC Paie incluse",
    text: "Pas de frais de reprise : notre équipe importe, vérifie et forme vos utilisateurs pendant le premier mois.", // [VERIFY] offre commerciale à confirmer
  },
};
