import { EventoAbbonamento } from "./catalog";

export const BASE = import.meta.env["VITE_API_BASE_URL"] + "/api";

const TOKEN_KEY = "areato.token";
type Dict = Record<string, string>;
export const auth = {
  get token(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set token(v: string | null) {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(TOKEN_KEY, v);
    else window.localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const t = auth.token;
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  // --- Handle 401 Unauthorized ---
  if (res.status === 401) {
    auth.token = null; // clear expired token
    // Optional: redirect to login, but avoid if already on login page
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login"; // adapt to your actual login route
    }
    // throw new ApiError(401, "Sessione scaduta, effettuare nuovamente l'accesso.");
  }

  if (!res.ok) {
    let msg = `Errore ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      /* risposta senza corpo JSON */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  return (
    ct.includes("application/json") ? await res.json() : ((await res.blob()) as unknown)
  ) as T;
}

const get = <T>(p: string) => request<T>(p);
const post = <T>(p: string, body?: unknown) =>
  request<T>(p, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(p: string, body?: unknown) =>
  request<T>(p, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });

// -----------------------------------------------------------------

export type Ruolo = "ADMIN" | "TO";

export type UtenteDto = {
  id: number;
  email: string;
  nomeCompleto?: string;
  ruolo: Ruolo;
  tourOperatorId?: number;
  tourOperatorNome?: string;
  lingua: string;
  loginTemporaneo?: boolean;
  indirizzo?: string;
};

export type PrezzoDto = { id: number; tipologia: string; importo: number };
export type SettoreDto = {
  id: number;
  nome: string;
  postiNumerati: boolean;
  capienza: number;
  disponibilita?: number;
  ammessoInOpzione: boolean;
  prezzi: PrezzoDto[];
};
export type GaraDto = {
  id: number;
  codice: string;
  disciplina: string;
  nome: string;
  dataOraUtc: string;
  settori: SettoreDto[];
};

export type RigaRequest = { garaId: number; settoreId: string; prezzoId: number; quantita: number };

// --------------------------------------------------------------- stati -----
// Codici di [dbo].[StatiRichiesta]: unica fonte degli stati di opzioni e
// prenotazioni. Le etichette mostrate all'utente arrivano dal backend.
export type StatoCodice =
  | "IN_VALIDAZIONE"
  | "VALIDATA"
  | "CONVERTITI_IN_PRENOTAZIONE"
  | "RILASCIATA"
  | "SALDATA"
  | "CANCELLATA"
  | "DA_SALDARE"
  | "CONVERTITA";

export type StatoRichiestaDto = {
  id: number;
  descrizioneIT: string;
  descrizioneEN: string;
  descrizioneDE: string;
};

export type OpzioneRigaDto = {
  id: number;
  garaId: number;
  settoreId: string;
  prezzoId: number;
  quantita: number;
  /** Quantit� che il TO ha chiesto di convertire in prenotazione. */
  quantitaDaConvertire: number;
  prezzoUnitario: number;
  totale: number;
  abbonamento: boolean;
};

export type OpzioneDto = {
  id: number;
  numero: string;
  tourOperatorId: number;
  tourOperatorNome: string;
  /** FK verso [dbo].[StatiRichiesta]. */
  idStato: number;
  statoDescrizione: string;
  scadeIl: string;
  note?: string;
  totaleStimato: number;
  totaleCommissioni: number;
  creatoIl: string;
  validataIl?: string;
  rifiutatoIl?: string;
  convertitail?: string;
  pdfInviatoIl?: string;
  righe: OpzioneRigaDto[];
};

/** Payload di creazione/modifica di un'OPZIONE. */
export type OpzioneUpsertRequest = {
  id?: number;
  tourOperatorId: number;
  idStato?: number;
  scadeIl?: string;
  note?: string;
  totaleCommissioni?: number;
  righe: Array<{
    id?: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
    quantita: number;
    quantitaDaConvertire?: number;
    prezzoUnitario?: number;
    abbonamento: boolean;
  }>;
};

export type SpettatoreDto = {
  id: number;
  nome: string;
  cognome: string;
  email?: string;
  nazione?: string;
  titoloId?: number;
};

export type PrenotazioneRigaDto = {
  id: number;
  /** Riga di opzione di origine, se la prenotazione deriva da una conversione. */
  opzioneRigaId?: number;
  garaId: number;
  settoreId: string;
  prezzoId: number;
  quantita: number;
  prezzoUnitario: number;
  scontoPercentuale: number;
  totale: number;
  abbonamento: boolean;

  spettatori: SpettatoreDto[];
};

export type PrenotazioneDto = {
  id: number;
  numero: string;
  tourOperatorId: number;
  tourOperatorNome: string;
  opzioneId?: number;
  idStato: number;
  statoDescrizione: string;
  cliente?: string;
  noteTo?: string;
  imponibile: number;
  scontoQuantita: number;
  scontoPartner: number;
  totale: number;
  totaleCommissioni: number;
  totalePagato: number;
  scadenzaPagamento?: string;
  creatoIl: string;
  confermataIl?: string;
  annullataIl?: string;
  pdfInviatoIl?: string;
  righe: PrenotazioneRigaDto[];
};

/** Payload di creazione/modifica di una PRENOTAZIONE. */
export type PrenotazioneUpsertRequest = {
  id?: number;
  tourOperatorId: number;
  opzioneId?: number;
  idStato?: number;
  cliente?: string;
  noteTo?: string;
  totaleCommissioni?: number;
  scadenzaPagamento?: string;
  applicaScontoPartner: boolean;
  righe: Array<{
    id?: number;
    opzioneRigaId?: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
    quantita: number;
    prezzoUnitario?: number;
    abbonamento: boolean;
  }>;
  role: string;
};

/** Conversione OPZIONE ? PRENOTAZIONE (totale o parziale). */
export type ConversioneOpzioneRequest = {
  tourOperatorId: number;
  cliente?: string;
  noteTo?: string;
  applicaScontoPartner: boolean;
  scadenzaPagamento?: string;
  /** Per ogni riga la quantit� da confermare (= quantit� richiesta). */
  righe: Array<{ opzioneRigaId: number; quantita: number }>;
};

export type ConversioneEsitoDto = {
  prenotazione: PrenotazioneDto;
  opzione: OpzioneDto;
};
export type EmailLogDto = {
  id: number;
  creatoIl: string;
  azione: "PRENOTAZIONE_CREATA" | "OPZIONE_CREATA" | "OPZIONE_CONVERTITA" | string;
  entita: "Prenotazione" | "Opzione" | string;
  entitaId: number;
  numero?: string | null;
  tourOperatorId: number;
  tourOperatorNome?: string | null;
  subject?: string | null;
  pdfAllegato: boolean;
};

export type TourOperatorDto = {
  id: number;
  externalId: string;
  ragioneSociale: string;
  tipo: string;
  emailContatto?: string;
  lingua: string;
  plafond?: number;
  scontoPartner: number;
  abilitato: boolean;
  azienda?: string;
};

export type RiepilogoRigaDto = {
  settore: string;
  tipologia: string;
  qtaOpzioni: number;
  importoOpzioni: number;
  qtaPrenotazioni: number;
  importoPrenotazioni: number;
  qtaVendite: number;
  importoVendite: number;
};

export type OpzioneInScadenzaDto = {
  id: number;
  numero: string;
  tourOperatorId: number;
  tourOperatorNome: string;
  email?: string;
  lingua: string;
  scadeIl: string;
  giorniAllaScadenza: number;
  qtaResidua: number;
};

export type AuditDto = {
  id: number;
  creatoIl: string;
  utente?: string;
  tourOperator?: string;
  tourOperatorId?: number;
  utenteId?: number;
  entita: string;
  entitaId?: string;
  azione: string;
  dettagli?: string;
  ip?: string;
};

export type AggiornaTariffaRigaItem = {
  rigaId: number;
  garaId: number;
  settoreId: string;
  prezzoId: number;
};

export type AggiornaTariffaRequest = {
  tourOperatorId: number;
  garaId: number;
  settoreId: string;
  prezzoId: number;
};
// ---- endpoint ----
export type UtenteDta = {
  id: number;
  email: string;
  creatoIl: string;
  iban?: string | null;
  indirizzo?: string | null;
  swift?: string | null;
  scadenzaOpzioni?: string | null;
  bank?: string | null;
  emailPrezzo: number | null;
  servizioPrezzo: number | null;
};

export type AggiornaUtenteRequest = {
  email?: string;
  iban?: string | null;
  indirizzo?: string | null;
  swift?: string | null;
  scadenzaOpzioni?: number | null;
  bank?: string | null;
};

export type AggiornaQuantitaRigaRequest = {
  tourOperatorId: number;
  quantita: number;
};
export const api = {
  login: async (identifier: string, password: string, ruolo: "TO" | "ADMIN") => {
    const r = await post<{ token: string; scadeIl: string; utente: UtenteDto }>("/auth/login", {
      name: identifier,
      password,
      ruolo,
    });
    auth.token = r.token;
    return r.utente;
  },
  logout: () => {
    auth.token = null;
  },
  me: () => get<UtenteDto>("/auth/me"),
  setPassword: (id: number, password: string) =>
    post<void>("/auth/set-password", { Id: id, password }),

  // Catalogo
  gare: (lang = "it") => get<GaraDto[]>(`/catalogo/gare?lang=${lang}`),
  syncCatalogo: () => post<unknown>("/catalogo/sync"),
  // --- Cambio tariffa su singola RIGA (opzione o prenotazione) ---
  // Il backend valida che settoreId/prezzoId appartengano alla garaId indicata.

  aggiornaTariffaRigaOpzione: (opzioneId: number, rigaId: number, body: AggiornaTariffaRequest) =>
    put<OpzioneDto>(`/opzioni/${opzioneId}/righe/${rigaId}/tariffa`, body),

  aggiornaTariffaRigaPrenotazione: (
    prenotazioneId: number,
    rigaId: number,
    body: AggiornaTariffaRequest,
  ) => put<PrenotazioneDto>(`/prenotazioni/${prenotazioneId}/righe/${rigaId}/tariffa`, body),

  catalogoSp: {
    gare: (garaId?: number) =>
      get<import("./catalog").Gara[]>(`/gare${garaId ? `?garaId=${garaId}` : ""}`),
    settori: (garaId?: number, soloAttive?: boolean) => {
      const q = new URLSearchParams();
      if (garaId) q.set("garaId", String(garaId));
      // Admin area: passare esplicitamente `false` per includere settori non attivi.
      // Default: parametro omesso → comportamento attuale del backend.
      if (soloAttive !== undefined) q.set("soloAttive", String(soloAttive));
      const s = q.toString();
      return get<import("./catalog").Settore[]>(`/settori${s ? `?${s}` : ""}`);
    },
    prezzi: (garaId?: number, settoreId?: string, soloAttive?: boolean) => {
      const q = new URLSearchParams();
      if (garaId) q.set("garaId", String(garaId));
      if (soloAttive !== undefined) q.set("soloAttive", String(soloAttive));
      if (settoreId) q.set("settoreId", settoreId);
      const s = q.toString();
      return get<import("./catalog").Prezzo[]>(`/prezzi${s ? `?${s}` : ""}`);
    },
    eventiAbbonamento: (garaId: number) =>
      get<EventoAbbonamento[]>(`/abbonamenti/eventi?garaId=${garaId}`),
    eventiAbbonamentoAll: (garaId: number) => get<EventoAbbonamento[]>(`/abbonamenti/eventi`),
    completo: () => get<import("./catalog").GaraCatalogo[]>("/catalogo/completo"),
    refresh: () => post<unknown>("/catalogo/refresh"),
  },

  // Stati di opzioni e prenotazioni (tabella dbo.StatiRichiesta)
  statiRichiesta: () => get<StatoRichiestaDto[]>("/stati-richiesta"),

  // Opzioni
  opzioni: (
    params: {
      role?: string;
      tourOperatorId?: number;
      toId?: number;
      idStato?: number;
      lang?: string;
    } = {},
  ) => get<OpzioneDto[]>(`/opzioni?${new URLSearchParams(clean(params))}`),
  opzione: (id: number, params: { role?: string; tourOperatorId?: number; lang?: string } = {}) =>
    get<OpzioneDto>(`/opzioni/${id}?${new URLSearchParams(clean(params))}`),
  creaOpzione: (body: OpzioneUpsertRequest) => post<OpzioneDto>("/opzioni", body),
  aggiornaOpzione: (id: number, body: OpzioneUpsertRequest) =>
    put<OpzioneDto>(`/opzioni/${id}`, body),
  /** Cambio stato tramite codice di dbo.StatiRichiesta. */
  cambiaStatoOpzione: (id: number) => post<OpzioneDto>(`/opzioni/${id}/stato`),
  validaOpzione: (id: number, inviaEmail = true) =>
    post<OpzioneDto>(`/opzioni/${id}/valida?inviaEmail=${inviaEmail}`),
  rifiutaOpzione: (id: number, motivo: string) => post<void>(`/opzioni/${id}/rifiuta`, motivo),
  rilasciaOpzione: (id: number) => post<void>(`/opzioni/${id}/rilascia`),
  opzioniInScadenza: (giorni?: number) =>
    get<OpzioneInScadenzaDto[]>(`/opzioni/in-scadenza${giorni ? `?giorni=${giorni}` : ""}`),
  inviaAvvisiScadenza: (ids: number[], messaggioAggiuntivo?: string) =>
    post<{ accodate: number }>("/opzioni/avvisi-scadenza", { ids, messaggioAggiuntivo }),

  // Prenotazioni
  prenotazioni: (params: {
    role: string;
    tourOperatorId: number;
    toId?: number;
    idStato?: number;
    lang?: string;
  }) => get<PrenotazioneDto[]>(`/prenotazioni?${new URLSearchParams(clean(params))}`),
  prenotazione: (
    id: number,
    params: { role?: string; tourOperatorId?: number; lang?: string } = {},
  ) => get<PrenotazioneDto>(`/prenotazioni/${id}?${new URLSearchParams(clean(params))}`),

  creaPrenotazione: (body: PrenotazioneUpsertRequest) =>
    post<PrenotazioneDto>("/prenotazioni", body),
  aggiornaPrenotazione: (id: number, body: PrenotazioneUpsertRequest) =>
    put<PrenotazioneDto>(`/prenotazioni/${id}`, body),
  cambiaStatoPrenotazione: (id: number, idStato: number, idTourOperator: number) =>
    put<PrenotazioneDto>(`/prenotazioni/${id}/stato`, { id, idStato, idTourOperator }),

  convertiOpzione: (opzioneId: number, body: ConversioneOpzioneRequest) =>
    post<ConversioneEsitoDto>(`/opzioni/${opzioneId}/converti`, body),
  confermaPrenotazione: (
    id: number,
    role: string,
    tourOperatorId: number,
    userId?: number,
    inviaEmail = true,
  ) =>
    post<PrenotazioneDto>(
      `/prenotazioni/${id}/conferma?inviaEmail=${inviaEmail}&role=${role}&tourOperatorId=${tourOperatorId}` +
        (userId ? `&userId=${userId}` : ""),
    ),
  annullaPrenotazione: (
    id: number,
    motivo: string | undefined,
    role: string,
    tourOperatorId: number,
    userId?: number,
  ) =>
    post<void>(
      `/prenotazioni/${id}/annulla?role=${role}&tourOperatorId=${tourOperatorId}` +
        (userId ? `&userId=${userId}` : ""),
      motivo ?? null,
    ),
  salvaSpettatori: (
    rigaId: number,
    spettatori: { id?: number; nome: string; cognome: string; email?: string; nazione?: string }[],
  ) => put<void>(`/prenotazioni/righe/${rigaId}/spettatori`, spettatori),
  pdfPrenotazione: (id: number, lang?: string) =>
    `${BASE}/prenotazioni/${id}/pdf${lang ? `?lang=${lang}` : ""}`,

  // Admin
  tourOperators: (q?: string) =>
    get<TourOperatorDto[]>(`/admin/tour-operators${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  abilitaTo: (id: number, abilitato: boolean) =>
    post<void>(`/admin/tour-operators/${id}/abilita?abilitato=${abilitato}`),
  scontoPartner: (id: number, percentuale: number) =>
    post<void>(`/admin/tour-operators/${id}/sconto-partner?percentuale=${percentuale}`),
  invito: (body: {
    tourOperatorId: number;
    email: string;
    nomeCompleto?: string;
    lingua: string;
  }) => post<{ utenteId: number }>("/admin/inviti", body),
  registraPagamento: (
    prenotazioneId: number,
    body: { importo: number; dataValuta: string; metodo: string; riferimento?: string },
  ) =>
    post<{ totalePagato: number; stato: string }>(
      `/admin/prenotazioni/${prenotazioneId}/pagamenti`,
      body,
    ),
  emettiTitoli: (prenotazioneId: number) =>
    post<unknown>(`/admin/prenotazioni/${prenotazioneId}/emetti`),
  aggiornaIntestatario: (titoloId: number, nominativo: string) =>
    put<void>(`/admin/titoli/${titoloId}/intestatario`, nominativo),
  riepilogo: (toId?: number) =>
    get<RiepilogoRigaDto[]>(`/admin/riepilogo${toId ? `?toId=${toId}` : ""}`),
  riepilogoExcelUrl: (toId?: number) =>
    `${BASE}/admin/riepilogo/excel${toId ? `?toId=${toId}` : ""}`,
  audit: (toId?: number, userId?: number) => {
    const params = new URLSearchParams();
    if (toId) params.set("toId", String(toId));
    if (userId) params.set("userId", String(userId));
    return get<AuditDto[]>(`/auth/audit?${params.toString()}`);
  },
  postAudit: (body: { UtenteId: string }) => post<{ message: string }>(`/`, body),
  inviaCodaEmail: () => post<{ inviate: number }>("/admin/email/invia"),
  getTraduzioni: async (lang: string): Promise<{ lingua: string; traduzioni: Dict }> => {
    return get<{ lingua: string; traduzioni: Dict }>(`/i18n/traduzioni?lang=${lang}`);
  },
  toggleAbilitato: (id: number) => post<void>("/admin/toggle-abilitato", { tourOperatorId: id }),
  tourOperatorsByName: (name: string) =>
    get<TourOperatorDto[]>(`/admin/tour-operatorsbyname?name=${encodeURIComponent(name)}`),
  sendInvitationEmail: (tourOperatoreId: number) =>
    post<{ message: string }>("/email/send-invitation", { tourOperatoreId }),
  sendEmailForResetPassword: (email: string) =>
    post<{ message: string }>("/email/emailresetpassword", { email }),

  getExpireDate: () => get<string>("/catalogo/expire-date"),
  convertiOpzioni: (body: OpzioneDto[]) => post<ConversioneEsitoDto[]>("/opzioni/converti", body),

  // --- NEW: minimal state updates (used by Admin → Validations) ---
  aggiornaStatoOpzione: (id: number, idStato: number, idTourOperator: number, utenteId: number) =>
    put<OpzioneDto>(`/opzioni/${id}`, { id, idStato, idTourOperator, utenteId }),
  aggiornaStatoPrenotazione: (
    id: number,
    idStato: number,
    idTourOperator: number,
    utenteId: number,
  ) => put<PrenotazioneDto>(`/prenotazioni/${id}`, { id, idStato, idTourOperator, utenteId }),

  utenti: () => get<UtenteDta[]>("/admin/utenti"),
  utente: (id: number) => get<UtenteDta>(`/admin/utenti/${id}`),
  aggiornaUtente: (id: number, body: AggiornaUtenteRequest) =>
    put<UtenteDta>(`/admin/utenti/${id}`, body),

  // inside `api` object, next to aggiornaTariffaRigaOpzione:
  aggiornaQuantitaRigaOpzione: (
    opzioneId: number,
    rigaId: number,
    body: AggiornaQuantitaRigaRequest,
  ) => put<OpzioneDto>(`/opzioni/${opzioneId}/righe/${rigaId}/quantita`, body),

  aggiornaQuantitaRigaPrenotazione: (
    prenotazioneId: number,
    rigaId: number,
    body: AggiornaQuantitaRigaRequest,
  ) => put<PrenotazioneDto>(`/prenotazioni/${prenotazioneId}/righe/${rigaId}/quantita`, body),

  uploadPrenotazionePdf: (id: number, base64: string) =>
    post<{ message: string }>(`/prenotazioni/${id}/pdf`, { base64 }),
  uploadPrenotazionePdfSaldata: (id: number, base64: string) =>
    post<{ message: string }>(`/prenotazioni/${id}/pdf-saldata`, { base64 }),
  uploadPrenotazionePdfValidata: (id: number, base64: string) =>
    post<{ message: string }>(`/prenotazioni/${id}/pdf-validata`, { base64 }),
  uploadOpzionePdfValidata: (id: number, base64: string) =>
    post<{ message: string }>(`/opzioni/${id}/pdf-validata`, { base64 }),
  emailLog: (take = 100) => get<EmailLogDto[]>(`/admin/email-log?take=${take}`),
};

function clean(o: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}
