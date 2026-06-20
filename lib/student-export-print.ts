import type { EtudiantExport } from "@/types/scolarite";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatName(prenom: string, nom: string): string {
  return `${prenom.charAt(0).toUpperCase() + prenom.slice(1)} ${nom.toUpperCase()}`;
}

function computeAverage(groupeNotes: EtudiantExport["groupes"][number]["notes"]): string {
  let sum = 0;
  let total = 0;

  for (const note of groupeNotes) {
    if (note.note_absent || note.note_valeur === null) continue;
    sum += (note.note_valeur / note.examen_note_max) * 20 * note.examen_coefficient;
    total += note.examen_coefficient;
  }

  return total > 0 ? (sum / total).toFixed(1) : "—";
}

export function printStudentRecord(data: EtudiantExport) {
  const studentName = formatName(data.prenom, data.nom);
  const rows = data.groupes
    .map((groupe) => {
      const notesHtml = groupe.notes
        .map((note) => {
          const displayValue = note.note_absent
            ? "Absent"
            : note.note_valeur !== null
              ? `${note.note_valeur}/${note.examen_note_max}`
              : "—";

          return `<tr><td>${escapeHtml(note.examen_nom)}</td><td>${escapeHtml(note.examen_type)}</td><td>${note.examen_coefficient}</td><td>${escapeHtml(displayValue)}</td></tr>`;
        })
        .join("");

      return `<tr class="groupe-header"><td colspan="4"><strong>${escapeHtml(groupe.groupe_nom)} (S${groupe.semestre}, coef. ${groupe.coefficient}) — Moyenne: ${computeAverage(groupe.notes)}/20</strong></td></tr>${notesHtml}`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Relevé - ${escapeHtml(studentName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; }
    .groupe-header td { background: #f1f5f9; font-size: 13px; padding: 10px 12px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(studentName)}</h1>
  <h2>${escapeHtml(data.promotion_nom || "Promotion inconnue")}</h2>
  <table>
    <thead><tr><th>Examen</th><th>Type</th><th>Coef.</th><th>Note</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (printWindow) {
    printWindow.onload = () => {
      URL.revokeObjectURL(url);
    };
  }
}
