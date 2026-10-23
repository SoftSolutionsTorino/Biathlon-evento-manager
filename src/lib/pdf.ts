import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import headerImgUrl from "./pdf-header.png";
import footerImgUrl from "./pdf-footer.png";
import { UtenteDto, UtenteDta } from "./api";




const fonts: any = pdfFonts;
const vfs: any = fonts.pdfMake?.vfs ?? fonts.vfs;
(pdfMake as any).vfs = vfs;

export type PdfLang = "it" | "en" | "de";
export type PdfKind = "OPTION" | "BOOKING";

export type PdfRow = {
  date: string;
  race: string;
  raceTime?: string;
  ticketType: string;
  category: string;
  seatRow?: string;
  seatNumber?: string;
  qty: number;
  unitPrice: number;
  total: number;
};

export type PdfCustomer = {
  name?: string;
  contactName?: string;
  address?: string;
  country?: string;
  email?: string;
};

export type PdfInput = {
  kind: PdfKind;
  lang: PdfLang;
  date: string;
  number: string;
  operator?: string;
  customer?: PdfCustomer;
  rows: PdfRow[];
  serviceFees?: number;
  emailFees?: number;
  grandTotal?: number;
  paymentDueDays?: number;
  expiresAt?: string;
  notes?: string;
  headerImage?: string;
  footerImage?: string;
  user: UtenteDto | null;
  settings?: UtenteDta | null;
  t: (key: string, params?: Record<string, any>) => string; // <-- AGGIUNTO
};

export function languageFromUser(lingua: string | number | undefined | null): PdfLang {
  const s = String(lingua ?? "0");
  if (s === "1") return "en";
  if (s === "2") return "de";
  return "it";
}

async function toDataUri(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject();
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function loadPdfImages(): Promise<{ header?: string; footer?: string }> {
  const [header, footer] = await Promise.all([toDataUri(headerImgUrl), toDataUri(footerImgUrl)]);
  return { header, footer };
}

function makeFormatter(lang: PdfLang) {
  const locale = lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : "it-IT";
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const numFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    date: (s: string) => {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s : dateFmt.format(d);
    },
    eur: (n: number) => `€ ${numFmt.format(n)}`,
  };
}

type Group = { label: string; rows: PdfRow[] };

function groupRows(rows: PdfRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const label = `${r.date} - ${r.race}${r.raceTime ? " " + r.raceTime : ""}`;
    const g = map.get(label) ?? { label, rows: [] };
    g.rows.push(r);
    map.set(label, g);
  }
  return Array.from(map.values());
}

function buildDocDefinition(input: PdfInput): TDocumentDefinitions {
  const f = makeFormatter(input.lang);
  const isBooking = input.kind === "BOOKING";
  const content: Content[] = [];
  const t = input.t; // <-- USIAMO LA FUNZIONE T

  // 1. Forziamo i numeri
  const serviceFees = Number(input.settings?.servizioPrezzo ?? input.serviceFees ?? 0) || 0;
  const emailFees = Number(input.settings?.emailPrezzo ?? input.emailFees ?? 0) || 0;

  // 2. Coordinate bancarie dinamiche
  let bankInfoText = "";
  if (input.settings) {
    const s = input.settings;
    const benefLabel = t("pdf.beneficiary");
    const lines: string[] = [];
    if (s.bank) lines.push(s.bank);
    lines.push(`${benefLabel}: Biathlon Weltcup Komitee Antholz`);
    if (s.iban) lines.push(`IBAN: ${s.iban}`);
    if (s.swift) lines.push(`SWIFT: ${s.swift}`);
    bankInfoText = lines.join("\n");
  }

  /* --- HEADER --- */
  content.push({
    columns: [
      {
        width: "*",
        stack: [
          {
            text: isBooking ? t("pdf.booking.title") : t("pdf.option.title"),
            fontSize: 16,
            bold: true,
            margin: [0, 0, 0, 12],
          },
          {
            columns: [
              {
                width: 110,
                stack: [
                  {
                    text: `${isBooking ? t("pdf.booking.dateLabel") : t("pdf.option.dateLabel")}:`,
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: `${isBooking ? t("pdf.booking.numberLabel") : t("pdf.option.numberLabel")}:`,
                    margin: [0, 0, 0, 2],
                  },
                ],
              },
              {
                width: "*",
                stack: [
                  { text: f.date(input.date), margin: [0, 0, 0, 2] },
                  { text: input.number, bold: true, margin: [0, 0, 0, 2] },
                ],
              },
            ],
          },
        ],
      },
      {
        width: "*",
        alignment: "right",
        stack: [
          { text: "", margin: [0, 20, 0, 0] },
          {
            text: input.user?.tourOperatorNome || input.customer?.name || "",
            margin: [0, 0, 0, 2],
          },
          {
            text: input.user?.nomeCompleto || input.customer?.contactName || "",
            margin: [0, 0, 0, 2],
          },
          { text: input.user?.indirizzo || input.customer?.address || "", margin: [0, 0, 0, 0] },
          { text: input.user?.email || input.customer?.email || "", margin: [0, 0, 0, 2] },
        ],
      },
    ],
    margin: [0, 0, 0, 24],
  });

  content.push({
    text: isBooking ? t("pdf.booking.intro") : t("pdf.option.intro"),
    margin: [0, 0, 0, 8],
  });
  if (isBooking) {
    content.push({
      text: t("pdf.booking.intro2", { d: f.date(input.date) }),
      margin: [0, 0, 0, 16],
    });
  }

  /* tables */
  const groups = groupRows(input.rows);
  const lastIdx = groups.length - 1;
  const rowsSum = input.rows.reduce((s, r) => s + r.total, 0);
  const grandTotal = input.grandTotal ?? rowsSum + serviceFees + emailFees;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const isLast = i === lastIdx;

    content.push({ text: g.label, bold: true, margin: [0, i === 0 ? 0 : 12, 0, 6] });

    const body: any[][] = [];
    body.push([
      {
        text: t("pdf.venue"),
        colSpan: 7,
        fontSize: 8,
        alignment: "center",
        bold: true,
        margin: [0, 4, 0, 4],
      },
      {},
      {},
      {},
      {},
      {},
      {},
    ]);
    body.push([
      { text: t("pdf.col.ticketType"), bold: true, fontSize: 8 },
      { text: t("pdf.col.category"), bold: true, fontSize: 8 },
      { text: t("pdf.col.row"), bold: true, fontSize: 8 },
      { text: t("pdf.col.seat"), bold: true, fontSize: 8 },
      { text: t("pdf.col.amount"), bold: true, fontSize: 8, alignment: "right" },
      { text: t("pdf.col.qty"), bold: true, fontSize: 8, alignment: "right" },
      { text: t("pdf.col.total"), bold: true, fontSize: 8, alignment: "right" },
    ]);

    for (const r of g.rows) {
      body.push([
        { text: r.ticketType, fontSize: 8 },
        { text: r.category, fontSize: 8 },
        { text: r.seatRow ?? "", fontSize: 8 },
        { text: r.seatNumber ?? "", fontSize: 8 },
        { text: f.eur(r.unitPrice), fontSize: 8, alignment: "right" },
        { text: String(r.qty), fontSize: 8, alignment: "right" },
        { text: f.eur(r.total), fontSize: 8, alignment: "right" },
      ]);
    }

    if (isLast) {
      body.push([
        { text: t("pdf.fees.service"), colSpan: 6, alignment: "right", fontSize: 8 },
        {},
        {},
        {},
        {},
        {},
        { text: f.eur(serviceFees), alignment: "right", fontSize: 8 },
      ]);
      body.push([
        { text: t("pdf.fees.email"), colSpan: 6, alignment: "right", fontSize: 8 },
        {},
        {},
        {},
        {},
        {},
        { text: f.eur(emailFees), alignment: "right", fontSize: 8 },
      ]);
      body.push([
        { text: t("pdf.total.grand"), colSpan: 6, alignment: "right", fontSize: 9, bold: true },
        {},
        {},
        {},
        {},
        {},
        { text: f.eur(grandTotal), alignment: "right", fontSize: 9, bold: true },
      ]);
    }

    content.push({
      table: { headerRows: 2, widths: ["auto", "*", 30, 30, "auto", 30, "auto"], body },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 8],
    });
  }

  /* payment block */
  if (isBooking && input.paymentDueDays !== undefined) {
    content.push({
      text: t("pdf.booking.paymentInfo", { days: String(input.paymentDueDays) }),
      margin: [0, 16, 0, 8],
    });
    if (bankInfoText) {
      content.push({ text: bankInfoText, margin: [0, 0, 0, 8] });
    }
    content.push({ text: t("pdf.booking.paymentNote"), margin: [0, 0, 0, 16] });
  }

  /* expiry block */
  if (!isBooking && input.expiresAt) {
    content.push({
      text: t("pdf.option.expiry", { d: input.settings?.scadenzaOpzioni || input.expiresAt }),
      margin: [0, 16, 0, 8],
    });
    content.push({ text: t("pdf.option.expiryNote"), margin: [0, 0, 0, 16] });
  }

  if (input.notes) {
    content.push({ text: input.notes, italics: true, margin: [0, 8, 0, 8] });
  }

  content.push({ text: t("pdf.closing"), margin: [0, 16, 0, 0] });

  const PAGE_WIDTH = 595;
  const MARGIN_X = 40;
  return {
    pageSize: "A4",
    pageMargins: [MARGIN_X, 130, MARGIN_X, 110],
    header: input.headerImage
      ? { image: input.headerImage, width: PAGE_WIDTH, alignment: "center", margin: [0, 0, 0, 0] }
      : undefined,
    footer: input.footerImage
      ? { image: input.footerImage, width: PAGE_WIDTH, alignment: "center", margin: [0, 0, 0, 0] }
      : undefined,
    content,
    defaultStyle: { fontSize: 9, lineHeight: 1.3 },
  };
}

export function generatePdf(input: PdfInput): string {
  const doc = buildDocDefinition(input);
  const digits = input.number.replace(/\D/g, "");
  const prefix = input.kind === "BOOKING" ? "Pren" : "Opt";
  const fileName = `${prefix}_${digits || "doc"}.pdf`;
  pdfMake.createPdf(doc).download(fileName);
  return fileName;
}
export function generatePdfBase64(input: PdfInput): Promise<string> {
  const doc = buildDocDefinition(input);
  const pdf = pdfMake.createPdf(doc) as any;

  // 1) Modern pdfmake (0.2.x): getBase64() returns a Promise<string>
  try {
    const result = pdf.getBase64();
    if (result && typeof result.then === "function") {
      return result as Promise<string>;
    }
    if (typeof result === "string") {
      return Promise.resolve(result); // extremely old / sync variant
    }
  } catch {
    /* fall through to legacy callback form */
  }

  // 2) Legacy pdfmake (0.1.x): getBase64(cb)
  return new Promise<string>((resolve, reject) => {
    try {
      pdf.getBase64((b64: string) => resolve(b64));
    } catch (e) {
      reject(e);
    }
  });
}
