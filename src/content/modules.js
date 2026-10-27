// Landing › Modules bento. `id` selects the live miniature in Modules/ModulesClient.jsx.
export const modules = {
  id: "produit",
  eyebrow: "Tout-en-un",
  title: "Sept modules, un seul dossier salarié.",
  description: "Chaque module alimente la paie. Les entrées de pointage, les congés et les prêts deviennent des lignes de bulletin, sans ressaisie.",
  replayHint: "Survolez une carte pour rejouer l'animation.",
  items: [
    { id: "paie", title: "Paie CNAS et IRG", description: "Bulletins calculés et vérifiés avant validation : brut, CNAS, IRG, net et coût employeur.", span: "lg:col-span-4 md:col-span-2" },
    { id: "dossier", title: "Dossier salarié et organigramme", description: "Contrat, poste et rattachement hiérarchique. L'organigramme se dessine depuis les fiches.", span: "lg:col-span-2" },
    { id: "conges", title: "Congés", description: "Week-end vendredi-samedi, jours fériés légaux et soldes en temps réel.", span: "lg:col-span-2" },
    { id: "pointage", title: "Pointage", description: "Entrées, retards et télétravail consolidés en variables de paie.", span: "lg:col-span-2" },
    { id: "prets", title: "Prêts et avances", description: "Échéancier généré, retenue automatique sur le bulletin.", span: "lg:col-span-2" },
    { id: "documents", title: "Documents", description: "Contrats et attestations générés, signés et rangés dans le coffre du salarié.", span: "lg:col-span-3" },
    { id: "declarations", title: "Déclarations G50 et DAS", description: "Exports prêts à déposer et écarts signalés avant l'échéance.", span: "lg:col-span-3" },
  ],
  mini: {
    paie: { printer: "Impression du bulletin", rows: [["Salaire brut", "120 000,00"], ["CNAS 9 %", "−10 800,00"], ["IRG", "−22 660,00"]], net: "Net" },
    dossier: { root: "DG", children: [["RH", "Responsable RH"], ["FIN", "DAF"], ["PROD", "Dir. production"]], more: "+46" },
    conges: { month: "Octobre 2026", weekdays: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"], request: "Congé annuel · 18 – 22 oct.", approved: "Approuvé", hatchNote: "Ven. et sam. exclus" },
    pointage: { ring: "présents", present: 46, total: 49, entries: [["Amina H.", "07:52", "ok", "Présent"], ["Karim B.", "08:34", "late", "Retard"], ["Sofiane M.", "—", "remote", "Télétravail"]] },
    prets: { title: "Avance sur salaire", detail: "150 000 DA · 10 mensualités de 15 000 DA", paid: 4, total: 10, progress: "4 / 10 remboursées" },
    documents: { files: ["Fiche de poste", "Attestation de travail", "Contrat CDI · Benali.pdf"], signed: "Signé", signature: "Signature électronique" },
    declarations: {
      rows: [
        { label: "G50 · octobre 2026", status: "Prêt à exporter", tone: "brand" },
        { label: "DAS 2025", status: "Exportée", tone: "success" },
        { label: "États CNAS · T3", status: "2 écarts", tone: "warning" },
      ],
    },
  },
};
