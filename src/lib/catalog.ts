/**
 * Catalogo Gare Anterselva — dati LIVE dal gestionale.
 * ---------------------------------------------------------------------------
 * Fonte dati: stored procedure sp_GetGare / sp_GetSettori / sp_GetPrezzi /
 * sp_GetEventiInAbbonamento, esposte rispettivamente da:
 *   - GET /api/gare
 *   - GET /api/settori?garaId=X
 *   - GET /api/prezzi?garaId=X
 *   - GET /api/abbonamenti/eventi?garaId=X
 *
 * Strategia:
 *   - `loadGare()` carica l'elenco leggero delle gare + abbonamenti.
 *   - `prefetchDettaglioGara(garaId)` carica settori + prezzi di UNA gara e
 *     li unisce in un `SettoreCatalogo[]` (settore + prezzi annidati).
 *     Il risultato è cache-ato in memoria: la seconda chiamata è istantanea.
 *   - `loadEventiAbbonamento(garaId)` carica le gare comprese in un abbonamento.
 *   - Tutti i testi sono già multilingua nel payload (nomeIt / nomeDe / nomeEn).
 */
import { api } from "@/lib/api";

// ----------------------------------------------------------------- Tipi -----

export type Lingua = "it" | "de" | "en";

export type Prezzo = {
  id: number;
  settoreId: string;
  tipologia: string;
  tipologiaDe: string | null;
  tipologiaEn: string | null;
  importo: number;
};

export type Settore = {
  id: string; // es. "COUA", "LOUN", "P1=P2"
  nomeIt: string;
  nomeDe: string | null;
  nomeEn: string | null;
  postiNumerati: boolean;
  capienza: number;
};

/** Settore + suoi prezzi — è quello che serve al dettaglio gara. */
export type SettoreCatalogo = Settore & {
  prezzi: Prezzo[];
};

export type Gara = {
  id: number;
  codice: string;
  disciplina: string;
  nomeIt: string;
  nomeDe: string | null;
  nomeEn: string | null;
  dataOraUtc: string | null; // null = abbonamento
  edizione: number | string;
  attiva: boolean;
  abbonamento: boolean; // true = abbonamento, false = gara singola
};

export type EventoAbbonamento = {
  garaId: number; // ID della gara-abbonamento a cui appartiene
  dataOraUtc: string;
  nomeIt: string;
  nomeDe: string | null;
  nomeEn: string | null;
};

/** Catalogo completo (usato da /api/catalogo/completo, se ti serve altrove). */
export type GaraCatalogo = Gara & {
  settori: SettoreCatalogo[];
};

// ------------------------------------------------------------- Cache -------
// Cache in-memory: Map<garaId, Promise<SettoreCatalogo[]>>. La promise viene
// messa subito in cache (prima che risolva) così due chiamate concorrenti
// sullo stesso garaId condividono lo stesso fetch.
const dettaglioCache = new Map<number, Promise<SettoreCatalogo[]>>();

// --------------------------------------------------------------- Loader ----

/**
 * Elenco gare + abbonamenti (payload leggero: niente settori/prezzi).
 * Endpoint: GET /api/gare  → sp_GetGare
 */
export async function loadGare(): Promise<Gara[]> {
  return api.catalogoSp.gare() as Promise<Gara[]>;
}

/**
 * Dettaglio di una singola gara: settori + prezzi, uniti in `SettoreCatalogo[]`.
 * Fa DUE chiamate (settori, prezzi) in parallelo e le unisce per settoreId.
 * Il risultato è cache-ato: chiamate successive sullo stesso garaId tornano subito.
 */
export function prefetchDettaglioGara(garaId: number): Promise<SettoreCatalogo[]> {
  const cached = dettaglioCache.get(garaId);
  if (cached) return cached;

  const promise = Promise.all([
    api.catalogoSp.settori(garaId) as Promise<Settore[]>,
    api.catalogoSp.prezzi(garaId) as Promise<Prezzo[]>,
  ])
    .then(([settori, prezzi]) => {
      const bySettore = new Map<string, Prezzo[]>();
      for (const p of prezzi) {
        const list = bySettore.get(p.settoreId) ?? [];
        list.push(p);
        bySettore.set(p.settoreId, list);
      }
      return settori.map<SettoreCatalogo>((s) => ({
        ...s,
        prezzi: bySettore.get(s.id) ?? [],
      }));
    })
    .catch((err) => {
      // Non cache-are gli errori: al prossimo hover si ritenta.
      dettaglioCache.delete(garaId);
      throw err;
    });

  dettaglioCache.set(garaId, promise);
  return promise;
}

/**
 * Eventi compresi in un abbonamento.
 * Endpoint: GET /api/abbonamenti/eventi?garaId=X
 */
export async function loadEventiAbbonamento(garaId: number): Promise<EventoAbbonamento[]> {
  return api.catalogoSp.eventiAbbonamento(garaId) as Promise<EventoAbbonamento[]>;
}

/** Svuota la cache del dettaglio (utile dopo un "refresh catalogo"). */
export function clearCatalogoCache() {
  dettaglioCache.clear();
}

/** Forza il refresh lato backend e svuota la cache locale. */
export async function refreshCatalogo(): Promise<void> {
  await api.catalogoSp.refresh();
  clearCatalogoCache();
}

// ------------------------------------------------------- Etichette i18n ----

function pick(
  lang: Lingua,
  it: string,
  de: string | null | undefined,
  en: string | null | undefined,
): string {
  if (lang === "de") return de?.trim() || it;
  if (lang === "en") return en?.trim() || it;
  return it;
}

/** Nome gara/abbonamento tradotto. */
export function nomeGara(g: Gara, lang: Lingua): string {
  return pick(lang, g.nomeIt, g.nomeDe, g.nomeEn);
}

/** Nome evento di un abbonamento tradotto. */
export function nomeEvento(e: EventoAbbonamento, lang: Lingua): string {
  return pick(lang, e.nomeIt, e.nomeDe, e.nomeEn);
}

/** Nome settore tradotto. */
export function nomeSettore(s: Settore, lang: Lingua): string {
  return pick(lang, s.nomeIt, s.nomeDe, s.nomeEn);
}

/** Tipologia prezzo tradotta. */
export function tipologiaPrezzo(p: Prezzo, lang: Lingua): string {
  return pick(lang, p.tipologia, p.tipologiaDe, p.tipologiaEn);
}
