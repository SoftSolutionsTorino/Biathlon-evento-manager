/**
 * Catalogo Gare — modello dati e caricamento.
 * ---------------------------------------------------------------------------
 * I tipi ricalcano 1:1 il JSON restituito dal backend (camelCase) che a sua
 * volta ricalca le colonne di Gare.xlsx / Prezzi.xlsx / Settori.xlsx prodotte
 * dalle stored procedure sp_GetGare / sp_GetPrezzi / sp_GetSettori.
 *
 * In modalità demo (nessun backend configurato) i dati vengono serviti da
 * questo modulo, con un ritardo simulato per esercitare loader e prefetch.
 * Quando VITE_API_BASE_URL è impostata, si usano gli endpoint reali:
 *   GET /api/gare · GET /api/settori?garaId= · GET /api/prezzi?garaId=
 *   GET /api/catalogo/completo (tutto raggruppato in una chiamata)
 */
import type { Lang } from "@/lib/i18n";
import { api } from "@/lib/api";

// ----- Tipi (identici ai DTO backend) --------------------------------------
export type Gara = {
  id: number;
  nomeIt: string;
  nomeDe: string | null;
  nomeEn: string | null;
  edizione: number;
  dataOraUtc: string; // ISO
  attiva: boolean;
};

export type Prezzo = {
  id: number;
  garaId: number;
  settoreId: string;
  tipologia: string;
  tipologiaEN: string | null;
  tipologiaDE: string | null;
  importo: number;
};

export type Settore = {
  id: string;
  garaId: number;
  nomeIt: string;
  nomeDe: string | null;
  nomeEn: string | null;
  postiNumerati: boolean;
  capienza: number;
};

/** Vista raggruppata per GaraId usata dalla pagina Catalogo Gare. */
export type SettoreCatalogo = Omit<Settore, "garaId"> & { prezzi: Prezzo[] };
export type GaraCatalogo = Gara & { settori: SettoreCatalogo[] };

// ----- Helper multilingua ----------------------------------------------------
export const nomeGara = (g: Pick<Gara, "nomeIt" | "nomeDe" | "nomeEn">, lang: Lang) =>
  (lang === "de" ? g.nomeDe : lang === "en" ? g.nomeEn : g.nomeIt) || g.nomeIt;

export const nomeSettore = (s: Pick<Settore, "nomeIt" | "nomeDe" | "nomeEn">, lang: Lang) =>
  (lang === "de" ? s.nomeDe : lang === "en" ? s.nomeEn : s.nomeIt) || s.nomeIt;

export const tipologiaPrezzo = (p: Pick<Prezzo, "tipologia" | "tipologiaDE" | "tipologiaEN">, lang: Lang) =>
  (lang === "de" ? p.tipologiaDE : lang === "en" ? p.tipologiaEN : p.tipologia) || p.tipologia;

/** Raggruppa gare/settori/prezzi piatti nella struttura annidata per GaraId. */
export function raggruppaCatalogo(gare: Gara[], settori: Settore[], prezzi: Prezzo[]): GaraCatalogo[] {
  return gare.map((g) => ({
    ...g,
    settori: settori
      .filter((s) => s.garaId === g.id)
      .map(({ garaId: _g, ...s }) => ({
        ...s,
        prezzi: prezzi
          .filter((p) => p.garaId === g.id && p.settoreId === s.id)
          .sort((a, b) => a.importo - b.importo),
      })),
  }));
}

// ----- Dati demo: estratti reali da Gare.xlsx / Settori.xlsx / Prezzi.xlsx ----
export const GARE_DEMO: Gara[] = [
  { id: 30, nomeIt: "Individuale maschile", nomeDe: "Einzel Männer", nomeEn: "Men's Individual", edizione: 2027, dataOraUtc: "2027-01-14T14:15:00Z", attiva: true },
  { id: 31, nomeIt: "Individuale femminile", nomeDe: "Einzel Frauen", nomeEn: "Women's Individual", edizione: 2027, dataOraUtc: "2027-01-15T14:15:00Z", attiva: true },
  { id: 32, nomeIt: "Staffetta mista singola (M+F) 11:45 / Staffetta mista (M+F) 14:30", nomeDe: "Single Mixed Staffel (M+F) 11:45 Uhr / Mixed Staffel (M+F) 14:30 Uhr", nomeEn: "Single Mixed Relay (M+W) 11:45 / Mixed Relay (M+W) 14:30", edizione: 2027, dataOraUtc: "2027-01-16T11:45:00Z", attiva: true },
  { id: 33, nomeIt: "Partenza in linea maschile 12:45 / Partenza in linea femminile 15:00", nomeDe: "Massenstart Männer 12:45 Uhr / Massenstart Frauen 15:00 Uhr", nomeEn: "Men's Mass Start 12:45 / Women's Mass Start 15:00", edizione: 2027, dataOraUtc: "2027-01-17T12:45:00Z", attiva: true },
];

const SETTORI_BASE: Omit<Settore, "garaId">[] = [
  { id: "COUA", nomeIt: "Percorso", nomeDe: "Strecke", nomeEn: "Course Area", postiNumerati: false, capienza: 6000 },
  { id: "DISA", nomeIt: "Area disabili", nomeDe: "Handicap Bereich", nomeEn: "Handicap-Area", postiNumerati: false, capienza: 30 },
  { id: "STAL", nomeIt: "Posto in piedi Settore L", nomeDe: "Stehbereich Sektor L", nomeEn: "Standing Area Sector L", postiNumerati: false, capienza: 2700 },
  { id: "STM1", nomeIt: "Posto in piedi Settore M1", nomeDe: "Stehbereich Sektor M1", nomeEn: "Standing Area Sector M1", postiNumerati: false, capienza: 2388 },
  { id: "STM2", nomeIt: "Posto in piedi Settore M2", nomeDe: "Stehbereich Sektor M2", nomeEn: "Standing Area Sector M2", postiNumerati: false, capienza: 2013 },
  { id: "STM3", nomeIt: "Posto in piedi Settore M3", nomeDe: "Stehbereich Sektor M3", nomeEn: "Standing Area Sector M3", postiNumerati: false, capienza: 600 },
  { id: "LOUN", nomeIt: "Antholz Lounge Posto a sedere Settore P1÷P2", nomeDe: "Antholz Lounge Sitzbereich Sektor P1÷P2", nomeEn: "Antholz Lounge Seating Area Sector P1÷P2", postiNumerati: true, capienza: 306 },
  { id: "SEAT", nomeIt: "Posto a sedere Settore V1÷J", nomeDe: "Sitzbereich Sektor V1÷J", nomeEn: "Seating Area Sector V1÷J", postiNumerati: true, capienza: 2306 },
  { id: "SEAU", nomeIt: "Posto a sedere Settore U", nomeDe: "Sitzbereich Sektor U", nomeEn: "Seating Area Sector U", postiNumerati: true, capienza: 270 },
];

/** Ordine come in Settori.xlsx: PostiNumerati, Id, GaraId. */
export const SETTORI_DEMO: Settore[] = SETTORI_BASE.flatMap((s) => GARE_DEMO.map((g) => ({ ...s, garaId: g.id })));

const INTERO = { tipologia: "Intero", tipologiaEN: "Full Price", tipologiaDE: "Normalpreis" };
const listino = (id: number, gare: number[], settoreId: string, importo: number): Prezzo[] =>
  gare.map((garaId) => ({ id, garaId, settoreId, importo, ...INTERO }));

/** Ordine come in Prezzi.xlsx: Id, GaraId. */
export const PREZZI_DEMO: Prezzo[] = [
  ...listino(720, [30, 31], "LOUN", 220),
  ...listino(721, [30, 31], "COUA", 26),
  ...listino(722, [30, 31], "STAL", 47),
  ...listino(723, [30, 31], "STM1", 42),
  ...listino(724, [30, 31], "STM2", 42),
  ...listino(725, [30, 31], "STM3", 42),
  ...listino(752, [32, 33], "LOUN", 260),
  ...listino(754, [32, 33], "COUA", 34),
  ...listino(758, [32, 33], "STAL", 54),
  ...listino(760, [32, 33], "STM1", 48),
  ...listino(761, [32, 33], "STM2", 48),
  ...listino(762, [32, 33], "STM3", 48),
];

// ----- Caricamento (API reale o demo) ----------------------------------------
const useApi = () => Boolean(import.meta.env.VITE_API_BASE_URL);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Elenco gare: chiamata leggera eseguita all'apertura della pagina. */
export async function loadGare(): Promise<Gara[]> {
  if (useApi()) return api.catalogoSp.gare();
  await wait(350);
  return GARE_DEMO;
}

/**
 * Dettaglio di una gara (settori + prezzi), caricato in modo lazy quando la
 * scheda viene espansa, o in prefetch al passaggio del mouse.
 */
export async function loadDettaglioGara(garaId: number): Promise<SettoreCatalogo[]> {
  if (useApi()) {
    const [settori, prezzi] = await Promise.all([api.catalogoSp.settori(garaId), api.catalogoSp.prezzi(garaId)]);
    const gara = { id: garaId } as Gara;
    return raggruppaCatalogo([gara], settori, prezzi)[0]?.settori ?? [];
  }
  await wait(450);
  return raggruppaCatalogo(
    GARE_DEMO.filter((g) => g.id === garaId),
    SETTORI_DEMO,
    PREZZI_DEMO,
  )[0]?.settori ?? [];
}

// Cache in memoria del dettaglio per gara: evita richieste ripetute e rende
// istantanea l'apertura dopo il prefetch (hover / focus sulla scheda).
const dettaglioCache = new Map<number, Promise<SettoreCatalogo[]>>();
export function prefetchDettaglioGara(garaId: number) {
  if (!dettaglioCache.has(garaId)) dettaglioCache.set(garaId, loadDettaglioGara(garaId));
  return dettaglioCache.get(garaId)!;
}
