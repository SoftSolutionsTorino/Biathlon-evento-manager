/**
 * Generazione dei documenti PDF lato client (mockup dell'output prodotto dal
 * backend QuestPDF). Copre i 5 documenti previsti dalle specifiche v2.0:
 *
 *   1. OPTION_REQUEST   — Opzione: richiesta
 *   2. OPTION_CONFIRM   — Opzione: conferma (Optionsbestätigung)
 *   3. BOOKING_REQUEST  — Prenotazione: richiesta
 *   4. BOOKING_CONFIRM  — Prenotazione: conferma (Bestellformular)
 *   5. SALE_VOUCHER     — Vendita: titoli di accesso emessi
 *
 * Tutti i testi seguono la lingua dell'interfaccia (IT/DE/EN).
 */
import { jsPDF } from "jspdf";
import type { Lang } from "@/lib/i18n";

export type PdfKind =
  | "OPTION_REQUEST"
  | "OPTION_CONFIRM"
  | "BOOKING_REQUEST"
  | "BOOKING_CONFIRM"
  | "SALE_VOUCHER";

export type PdfRow = {
  date: string;
  race: string;
  sector: string;
  category: string;
  qty: number;
  unitPrice: number;
  total: number;
};

export type PdfDoc = {
  kind: PdfKind;
  lang: Lang;
  /** Numero/codice del documento (es. OPT-2027-0012, VCH-ANT27-0004). */
  number: string;
  /** Ragione sociale del Tour Operator destinatario. */
  operator: string;
  rows: PdfRow[];
  total: number;
  /** Righe aggiuntive (scadenze, acconti, note operative). */
  extra?: [string, string][];
};

const ORGANISER = "Comitato Organizzatore Biathlon Antholz / Anterselva";
const BLUE = [0, 61, 122] as const;
const RED = [227, 6, 19] as const;

const TITLES: Record<PdfKind, Record<Lang, string>> = {
  OPTION_REQUEST: {
    it: "Opzione — Richiesta",
    de: "Option — Anfrage",
    en: "Option — Request",
  },
  OPTION_CONFIRM: {
    it: "Opzione — Conferma",
    de: "Optionsbestätigung",
    en: "Option — Confirmation",
  },
  BOOKING_REQUEST: {
    it: "Prenotazione — Richiesta",
    de: "Bestellanfrage",
    en: "Booking — Request",
  },
  BOOKING_CONFIRM: {
    it: "Prenotazione — Conferma d'ordine",
    de: "Bestellformular / Auftragsbestätigung",
    en: "Booking — Order confirmation",
  },
  SALE_VOUCHER: {
    it: "Titoli di accesso emessi",
    de: "Ausgestellte Zutrittskarten",
    en: "Issued access tickets",
  },
};

const HEADERS: Record<Lang, string[]> = {
  it: ["Data", "Gara", "Settore", "Tipologia", "Q.tà", "Prezzo", "Totale"],
  de: ["Datum", "Wettkampf", "Sektor", "Kategorie", "Anz.", "Preis", "Summe"],
  en: ["Date", "Race", "Sector", "Category", "Qty", "Price", "Total"],
};

const LABELS: Record<Lang, { to: string; doc: string; total: string; issued: string; page: string }> = {
  it: { to: "Destinatario", doc: "Documento", total: "TOTALE", issued: "Emesso il", page: "Pagina" },
  de: { to: "Empfänger", doc: "Dokument", total: "GESAMT", issued: "Ausgestellt am", page: "Seite" },
  en: { to: "Recipient", doc: "Document", total: "TOTAL", issued: "Issued on", page: "Page" },
};

const NOTES: Record<PdfKind, Record<Lang, string>> = {
  OPTION_REQUEST: {
    it: "Richiesta ricevuta: sarà validata dal comitato organizzatore. I posti restano impegnati fino alla validazione.",
    de: "Anfrage erhalten: sie wird vom Organisationskomitee geprüft. Die Plätze bleiben bis zur Freigabe reserviert.",
    en: "Request received: it will be validated by the organising committee. Seats are held until validation.",
  },
  OPTION_CONFIRM: {
    it: "Opzione validata. Entro la data di scadenza va convertita, totalmente o parzialmente, in prenotazione.",
    de: "Option freigegeben. Sie ist bis zum Ablaufdatum ganz oder teilweise in eine Bestellung umzuwandeln.",
    en: "Option validated. It must be converted, fully or partially, into a booking before the expiry date.",
  },
  BOOKING_REQUEST: {
    it: "Richiesta di prenotazione ricevuta, in attesa di conferma da parte del comitato organizzatore.",
    de: "Bestellanfrage erhalten, Bestätigung durch das Organisationskomitee ausstehend.",
    en: "Booking request received, awaiting confirmation by the organising committee.",
  },
  BOOKING_CONFIRM: {
    it: "Effettuare il bonifico intestato al Comitato Organizzatore Biathlon Antholz indicando come causale il numero del documento. I titoli di accesso vengono emessi dopo l'incasso.",
    de: "Überweisung an das Organisationskomitee Biathlon Antholz mit der Dokumentnummer als Verwendungszweck. Die Zutrittskarten werden nach Zahlungseingang ausgestellt.",
    en: "Bank transfer to the Organising Committee Biathlon Antholz quoting the document number as reference. Tickets are issued after payment is received.",
  },
  SALE_VOUCHER: {
    it: "Titoli emessi. Il nominativo dello spettatore può essere abbinato o modificato dall'area riservata fino al giorno della gara.",
    de: "Karten ausgestellt. Der Name des Zuschauers kann im geschützten Bereich bis zum Wettkampftag zugeordnet oder geändert werden.",
    en: "Tickets issued. The spectator name can be assigned or changed in the reserved area until race day.",
  },
};

const eur = (n: number) =>
  `EUR ${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Costruisce il PDF e ne avvia il download nel browser. */
export function generatePdf(doc: PdfDoc): string {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const left = 15;
  const right = pageW - 15;
  const L = LABELS[doc.lang];

  // --- intestazione ---
  pdf.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(ORGANISER, left, 18);

  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);
  pdf.text(TITLES[doc.kind][doc.lang], left, 26);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`${L.doc}: ${doc.number}`, left, 32);
  pdf.text(`${L.to}: ${doc.operator}`, left, 37);
  pdf.text(`${L.issued}: ${new Date().toISOString().slice(0, 10)}`, right, 32, { align: "right" });

  pdf.setDrawColor(RED[0], RED[1], RED[2]);
  pdf.setLineWidth(0.6);
  pdf.line(left, 41, right, 41);

  // --- tabella righe ---
  const cols = [left, left + 24, left + 66, left + 102, left + 130, left + 145, left + 165];
  let y = 49;

  pdf.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  pdf.rect(left, y - 5, right - left, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  HEADERS[doc.lang].forEach((h, i) => pdf.text(h, cols[i], y));

  pdf.setTextColor(20, 20, 20);
  pdf.setFont("helvetica", "normal");
  y += 8;

  for (const r of doc.rows) {
    if (y > 250) {
      pdf.addPage();
      y = 25;
    }
    const cells = [
      r.date,
      pdf.splitTextToSize(r.race, 40)[0],
      pdf.splitTextToSize(r.sector, 34)[0],
      r.category,
      String(r.qty),
      r.unitPrice.toFixed(2),
      r.total.toFixed(2),
    ];
    cells.forEach((c, i) => pdf.text(c, cols[i], y));
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(left, y + 2, right, y + 2);
    y += 7;
  }

  // --- totali ed extra ---
  y += 4;
  for (const [label, value] of doc.extra ?? []) {
    pdf.setFontSize(9);
    pdf.text(`${label}: ${value}`, right, y, { align: "right" });
    y += 5;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`${L.total}: ${eur(doc.total)}`, right, y + 3, { align: "right" });

  // --- note ---
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const note = pdf.splitTextToSize(NOTES[doc.kind][doc.lang], right - left);
  pdf.text(note, left, y + 16);

  // --- piè di pagina ---
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`biathlon-antholz.it — ${L.page} ${p}/${pages}`, pageW / 2, 287, { align: "center" });
  }

  const filename = `${doc.kind}_${doc.number}_${doc.lang}.pdf`;
  pdf.save(filename);
  return filename;
}
