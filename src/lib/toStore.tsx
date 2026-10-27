import * as React from "react";
import { toast } from "sonner";
import { loadGare, prefetchDettaglioGara, type SettoreCatalogo } from "@/lib/catalog";
import {
  api,
  UtenteDto,
  ApiError,
  type StatoRichiestaDto,
  type OpzioneDto,
  type ConversioneEsitoDto,
  PrenotazioneDto,
  type UtenteDta,
} from "@/lib/api";
import { useI18n } from "./i18n";
import { generatePdfBase64, languageFromUser, loadPdfImages } from "./pdf";

const cartKey = (userId: number | string | undefined) => `areato.cart.${userId ?? "anon"}`;

function readCartFromSession(userId: number | string | undefined): CartItem[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.sessionStorage.getItem(cartKey(userId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCartToSession(userId: number | string | undefined, cart: CartItem[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.sessionStorage.setItem(cartKey(userId), JSON.stringify(cart));
  } catch {
    /* quota / privacy mode: ignora */
  }
}

function removeCartFromSession(userId: number | string | undefined) {
  if (typeof window === "undefined" || !userId) return;
  window.sessionStorage.removeItem(cartKey(userId));
}

// ----- Tipi -----
export type Role = "admin" | "to";

export type Race = {
  id: string;
  code: string;
  name: string;
  nameIt: string;
  nameDe: string | null;
  nameEn: string | null;
  date: string | null;
  discipline: string;
};

export type SectorPrice = {
  id: number;
  importo: number;
  tipologia?: string;
  tipologiaDE?: string | null;
  tipologiaEN?: string | null;
};

export type Sector = {
  id: string;
  raceId: string;
  name: string;
  nameIt: string;
  nameDe: string | null;
  nameEn: string | null;
  capacity: number;
  sold: number;
  priceTo: number;
  numbered: boolean;
  priceCategory: "INTERO" | "RIDOTTO" | "ABBONAMENTO";
  prezzi?: SectorPrice[];
};

export type BookingStatus = "pending_payment" | "partially_paid" | "paid" | "cancelled" | "issued";

export type TicketOption = {
  id: string;
  toId: string;
  optionId: number;
  numeroOpzione?: string;
  rigaId: number;
  raceId: string;
  sectorId: string;
  qty: number;
  prezzoUnitario?: number;
  totale?: number;
  quantitaDaConvertire?: number;
  createdAt: string;
  expiresAt: string;
  statoId: number;
  note?: string;
  pdfSent?: boolean;
  prezzoId?: number;
  tipologia?: string;
  tipologiaDE?: string;
  tipologiaEN?: string;
};

export type Booking = {
  prenotazioneId?: number;
  rigaId?: number;
  numeroPrenotazione?: string;
  id: string;
  fromOptionId?: string;
  toId: string;
  raceId: string;
  sectorId: string;
  prezzoId: number;
  qty: number;
  total: number;
  deposit: number;
  paid: number;
  paymentDueAt: string;
  customer: string;
  statoId: number;
  status: BookingStatus;
  createdAt: string;
  tipologia?: string;
  tipologiaDE?: string;
  tipologiaEN?: string;
};

export type Sale = {
  id: string;
  bookingId: string;
  toId: string;
  voucherCode: string;
  qty: number;
  total: number;
  issuedAt: string;
  customer: string;
  raceId: string;
  sectorId: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  user: string;
  ip: string;
  entity: string;
  entityId: string;
  action: string;
  details?: string;
  datetime?: string;
};

export type TourOperator = {
  id: string;
  name: string;
  type: string;
  email: string;
  plafond: number;
  used: number;
  enabled: boolean;
  partnerDiscount: number;
  company?: string;
};

// ----- Helper localizzazione -----
export function nomeLocalizzato(
  e: { nameIt: string; nameDe?: string | null; nameEn?: string | null } | null | undefined,
  lang: string,
): string {
  if (!e) return "";
  const l = (lang ?? "it").toLowerCase();
  if (l.startsWith("en") && e.nameEn) return e.nameEn;
  if (l.startsWith("de") && e.nameDe) return e.nameDe;
  return e.nameIt;
}

// ----- Store -----
type State = {
  user: UtenteDto | null;
  selectedToId: string | null;
  tourOperators: TourOperator[];
  tourOperatorsByName: TourOperator[];
  races: Race[];
  sectors: Sector[];
  options: TicketOption[];
  bookings: Booking[];
  sales: Sale[];
  audit: AuditEntry[];
  cart: CartItem[];
  currentToId: string | null;
  statiRichiesta: StatoRichiestaDto[];
  expiryDate: string | null;
  rawOptions: OpzioneDto[];
  selectedTOperator: TourOperator | null;
  /** Impostazioni globali (IBAN/SWIFT/bank, emailPrezzo, servizioPrezzo). */
  settings: UtenteDta | null;
};

export type CartItem = {
  id: string;
  raceId: string;
  sectorId: string;
  prezzoId: number;
  qty: number;
  note?: string;
};

type Ctx = Omit<State, "options" | "bookings" | "sales"> & {
  options: TicketOption[];
  bookings: Booking[];
  sales: Sale[];
  allOptions: TicketOption[];
  allBookings: Booking[];
  allSales: Sale[];
  isAdmin: boolean;
  role: Role;
  currentToId: string | null;
  currentUserEmail: string;
  setUser: (u: UtenteDto) => void;
  logout: () => void;
  setSelectedTo: (id: string) => void;
  createOption: (input: {
    raceId: string;
    sectorId: string;
    qty: number;
    ttlDays: number;
    note?: string;
  }) => void;
  releaseOption: (id: string, idnum: number) => void;
  validateOption: (id: string) => void;
  rejectOption: (id: string) => void;
  sendOptionPdf: (id: string) => void;
  sendExpiryAlerts: (ids: string[]) => void;
  convertOptionToBooking: (
    id: string,
    customer: string,
    depositPct: number,
    qtyToConvert?: number,
  ) => Promise<PrenotazioneDto | undefined>;
  createDirectBooking: (input: {
    raceId: string;
    sectorId: string;
    qty: number;
    customer: string;
    note?: string;
    prezzoId: number;
  }) => void;
  submitCart: (input: {
    kind: "option" | "booking";
    customer?: string;
    note?: string;
  }) => Promise<{ count: number; prenotazione?: PrenotazioneDto }>;
  registerPayment: (bookingId: string, amount: number) => void;
  convertBookingToSale: (bookingId: string) => void;
  cancelBooking: (id: string) => Promise<void>;
  toggleOperatorEnabled: (id: string) => void;
  setPartnerDiscount: (id: string, pct: number) => void;
  sendInvite: (id: string) => void;
  getTourOperatorsByName: (name: string) => void;
  sendEmailForResetPassword: (email: string) => void;
  addToCart: (input: {
    raceId: string;
    sectorId: string;
    qty: number;
    note?: string;
    prezzoId: number;
  }) => void;
  updateCartItem: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  registerSectors: (garaId: number, settori: SettoreCatalogo[]) => void;
  refreshBookings: () => void;
  refreshOptions: () => void;
  convertiOpzioni: (body: OpzioneDto[]) => Promise<ConversioneEsitoDto[]>;

  updateOptionStato: (
    optionId: number,
    idStato: number,
    idTourOperator: number,
    utenteId: number,
  ) => Promise<void>;
  updatePrenotazioneStato: (
    prenotazioneId: number,
    idStato: number,
    idTourOperator: number,
    utenteId: number,
  ) => Promise<void>;
  setSelectedTOperator: (operator: TourOperator | null) => void;
  aggiornaTariffaRigaOpzione: (params: {
    opzioneId: number;
    tourOperatorId: number;
    rigaId: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
  }) => Promise<void>;

  aggiornaTariffaRigaPrenotazione: (params: {
    prenotazioneId: number;
    tourOperatorId: number;
    rigaId: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
  }) => Promise<void>;

  aggiornaQuantitaRigaOpzione: (params: {
    opzioneId: number;
    tourOperatorId: number;
    rigaId: number;
    quantita: number;
  }) => Promise<void>;

  aggiornaQuantitaRigaPrenotazione: (params: {
    prenotazioneId: number;
    tourOperatorId: number;
    rigaId: number;
    quantita: number;
  }) => Promise<void>;

  /** Genera il PDF lato client e lo carica sul server (che invia l'email). */
  sendBookingPdf: (pren: PrenotazioneDto) => Promise<void>;
};

const StoreContext = React.createContext<Ctx | null>(null);

const STATO_IDS = {
  IN_VALIDAZIONE: 1,
  VALIDATA: 2,
  CONVERTITA: 3,
  RILASCIATA: 4,
  SALDATA: 5,
  CANCELLATA: 6,
  DA_SALDARE: 7,
} as const;

function bookingStatusFromStatoId(statoId: number): BookingStatus {
  switch (statoId) {
    case STATO_IDS.CANCELLATA:
      return "cancelled";
    case STATO_IDS.RILASCIATA:
      return "issued";
    case STATO_IDS.SALDATA:
      return "paid";
    case STATO_IDS.DA_SALDARE:
    case STATO_IDS.IN_VALIDAZIONE:
    default:
      return "pending_payment";
  }
}

export function ToStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>({
    user: null,
    selectedToId: null,
    currentToId: "to1",
    tourOperators: [],
    tourOperatorsByName: [],
    races: [],
    sectors: [],
    options: [],
    bookings: [],
    sales: [],
    audit: [],
    cart: [],
    statiRichiesta: [],
    expiryDate: null,
    rawOptions: [],
    selectedTOperator: null,
    settings: null,
  });

  const { t } = useI18n();

  const isAdmin = state.user?.ruolo === "ADMIN";
  const currentTo = state.tourOperators.find((t) => t.id === state.currentToId);

  const currentToId = isAdmin
    ? state.selectedToId
    : (state.user?.tourOperatorId?.toString() ?? null);

  const statoIdByDescrizioneIT = (desc: string): number | undefined => {
    const target = desc.trim().toLowerCase();
    return state.statiRichiesta.find((s) => s.descrizioneIT.trim().toLowerCase() === target)?.id;
  };

  // ---- Auth ----
  const setUser = (u: UtenteDto) => {
    setState((s) => ({
      ...s,
      user: u,
      selectedToId: u.ruolo === "ADMIN" ? s.selectedToId : null,
    }));
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("areato.session");
        const parsed = saved ? JSON.parse(saved) : {};
        window.localStorage.setItem(
          "areato.session",
          JSON.stringify({
            ...parsed,
            user: u,
            selectedToId: u.ruolo === "ADMIN" ? state.selectedToId : undefined,
          }),
        );
      } catch {
        /* ignorato */
      }
    }
  };

  const logout = () => {
    removeCartFromSession(state.user?.id);
    setState((s) => ({ ...s, user: null, selectedToId: null, cart: [] }));
    cartHydratedFor.current = undefined;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("areato.session");
    }
    api.logout();
  };

  const setSelectedTo = (id: string) => {
    if (!isAdmin) return;
    setState((s) => ({ ...s, selectedToId: id }));
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("areato.session");
        const parsed = saved ? JSON.parse(saved) : {};
        window.localStorage.setItem(
          "areato.session",
          JSON.stringify({ ...parsed, selectedToId: id }),
        );
      } catch {}
    }
  };

  const registerSectors = React.useCallback((garaId: number, settori: SettoreCatalogo[]) => {
    const raceKey = String(garaId);
    const mapped: Sector[] = settori.map((s) => {
      const priceTo = s.prezzi.length ? Math.min(...s.prezzi.map((p) => p.importo)) : 0;
      return {
        id: `${garaId}-${s.id}`,
        raceId: raceKey,
        name: s.nomeIt,
        nameIt: s.nomeIt,
        nameDe: (s as any).nomeDe ?? null,
        nameEn: (s as any).nomeEn ?? null,
        capacity: s.capienza,
        sold: 0,
        priceTo,
        numbered: s.postiNumerati,
        priceCategory: "INTERO",
        prezzi: s.prezzi.map((p) => ({
          id: p.id,
          importo: p.importo,
          tipologia: (p as any).tipologia || "",
          tipologiaDE: (p as any).tipologiaDE || null,
          tipologiaEN: (p as any).tipologiaEN || null,
        })),
      };
    });
    setState((prev) => ({
      ...prev,
      sectors: [...prev.sectors.filter((x) => x.raceId !== raceKey), ...mapped],
    }));
  }, []);

  // ---- Mock / legacy actions ----
  const createOption = ({ raceId, sectorId, qty, ttlDays, note }: any) => {
    if (!currentToId) {
      toast.error("Seleziona un Tour Operator per creare un'opzione.");
      return;
    }
    const id = `o${Math.random().toString(36).slice(2, 7)}`;
    setState((s) => ({
      ...s,
      options: [
        {
          id,
          toId: currentToId,
          optionId: 0,
          rigaId: 0,
          raceId,
          sectorId,
          qty,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + ttlDays * 86400000).toISOString(),
          statoId: statoIdByDescrizioneIT("In validazione") ?? STATO_IDS.IN_VALIDAZIONE,
          note,
        },
        ...s.options,
      ],
    }));
  };

  const releaseOption = async (id: string, idnum: number) => {
    const statoId = statoIdByDescrizioneIT("Cancellata") ?? STATO_IDS.CANCELLATA;
    setState((s) => ({
      ...s,
      options: s.options.map((o) => (o.id === id ? { ...o, statoId } : o)),
    }));
    await api.aggiornaStatoOpzione(idnum, statoId, state.user?.tourOperatorId ?? 0, 0);
  };

  const validateOption = (id: string) => {
    const statoId = statoIdByDescrizioneIT("Validata") ?? STATO_IDS.VALIDATA;
    setState((s) => ({
      ...s,
      options: s.options.map((o) => (o.id === id ? { ...o, statoId } : o)),
    }));
  };

  const rejectOption = (id: string) => {
    const statoId = statoIdByDescrizioneIT("Cancellata") ?? STATO_IDS.CANCELLATA;
    setState((s) => ({
      ...s,
      options: s.options.map((o) => (o.id === id ? { ...o, statoId } : o)),
    }));
  };

  const sendOptionPdf = (id: string) => {
    setState((s) => ({
      ...s,
      options: s.options.map((o) => (o.id === id ? { ...o, pdfSent: true } : o)),
    }));
  };

  const sendExpiryAlerts = (_ids: string[]) => {};

  // ---- Fetch helpers ----
  async function fetchTourOperators() {
    try {
      const data = await api.tourOperators();
      const mapped: TourOperator[] = data.map((dto) => ({
        id: dto.id.toString(),
        name: dto.ragioneSociale,
        type:
          (dto.tipo === "A" && "Azienda") ||
          (dto.tipo === "F" && "FanClub") ||
          (dto.tipo === "T" && "TO") ||
          (dto.tipo === "H" && "Hotel") ||
          "TO",
        email: dto.emailContatto || "",
        plafond: dto.plafond ?? 0,
        used: 0,
        enabled: dto.abilitato,
        partnerDiscount: dto.scontoPartner,
        company: dto.azienda,
      }));
      setState((s) => ({ ...s, tourOperators: mapped }));
    } catch {
      /* silenzioso */
    }
  }

  async function fetchGare() {
    try {
      const data = await loadGare();
      const mapped: Race[] = data.map((g) => ({
        id: String(g.id),
        code: (g as any).codice ?? (g as any).code ?? "SPRINT_M",
        name: g.nomeIt ?? "",
        nameIt: g.nomeIt ?? "",
        nameDe: g.nomeDe ?? null,
        nameEn: g.nomeEn ?? null,
        date: g.dataOraUtc,
        discipline: (g as any).disciplina ?? "",
      }));
      setState((s) => ({ ...s, races: mapped }));
    } catch (error) {
      console.error("Errore fetchGare", error);
    }
  }

  async function fetchStatiRichiesta() {
    try {
      const data = await api.statiRichiesta();
      setState((s) => ({ ...s, statiRichiesta: data }));
    } catch (error) {
      console.error("fetchStatiRichiesta", error);
    }
  }

  async function fetchExpiryDate() {
    try {
      const data = await api.getExpireDate();
      setState((s) => ({ ...s, expiryDate: new Date(data).toISOString() }));
    } catch (e) {
      console.error("fetchExpiryDate", e);
    }
  }

  /**
   * Carica le impostazioni globali (IBAN, SWIFT, bank, emailPrezzo,
   * servizioPrezzo) usate dal PDF per il blocco coordinate bancarie
   * e per le commissioni.
   *
   * Nota: sia `/admin/utenti` sia `/admin/utenti/{id}` sono endpoint
   * admin-only. Per un utente TO entrambe le chiamate falliscono con
   * 403 e `settings` resta `null`: il PDF verrà generato comunque, solo
   * senza il blocco IBAN/SWIFT.
   */
  async function fetchSettings(uid?: number) {
    try {
      const list = await api.utenti();
      setState((s) => ({ ...s, settings: list?.[0] ?? null }));
      return;
    } catch {
      /* admin-only: provo con la riga dell'utente corrente */
    }
  }

  async function fetchPrenotazioni() {
    const role = state.user?.ruolo;
    if (!role) return;

    const toId = isAdmin ? state.selectedToId : state.user?.tourOperatorId?.toString();
    if (!toId) return;

    try {
      const data = await api.prenotazioni({ role, tourOperatorId: Number(toId) });
      const mapped: Booking[] = data.flatMap((p) =>
        p.righe.map((r) => ({
          prenotazioneId: p.id,
          rigaId: r.id,
          id: `${p.id}-${r.id}`,
          numeroPrenotazione: p.numero,
          fromOptionId: p.opzioneId ? String(p.opzioneId) : undefined,
          toId: String(p.tourOperatorId),
          raceId: String(r.garaId),
          sectorId: `${r.garaId}-${r.settoreId}`,
          prezzoId: r.prezzoId,
          qty: r.quantita,
          total: r.totale,
          deposit: 0,
          paid: p.totalePagato,
          paymentDueAt: p.scadenzaPagamento ?? p.creatoIl,
          customer: p.cliente ?? p.tourOperatorNome,
          statoId: p.idStato,
          status: bookingStatusFromStatoId(p.idStato),
          createdAt: p.creatoIl,
          tipologia: "",
        })),
      );
      setState((s) => ({ ...s, bookings: mapped }));

      const raceIds = [...new Set(mapped.map((b) => b.raceId))];
      raceIds.forEach((id) => {
        prefetchDettaglioGara(Number(id))
          .then((d) => registerSectors(Number(id), d))
          .catch(() => undefined);
      });
    } catch (e) {
      console.error("fetchPrenotazioni", e);
    }
  }

  async function fetchOpzioni() {
    const ruolo = state.user?.ruolo;
    if (!ruolo) return;

    const toId = isAdmin ? state.selectedToId : state.user?.tourOperatorId?.toString();
    if (!toId) return;

    try {
      const data = await api.opzioni({ role: ruolo, tourOperatorId: Number(toId) });
      const mapped: TicketOption[] = data.flatMap((o) =>
        o.righe.map((r) => ({
          id: `${o.id}-${r.id}`,
          optionId: o.id,
          numeroOpzione: o.numero,
          rigaId: r.id,
          toId: String(o.tourOperatorId),
          raceId: String(r.garaId),
          sectorId: `${r.garaId}-${r.settoreId}`,
          prezzoId: r.prezzoId,
          prezzoUnitario: r.prezzoUnitario,
          totale: r.totale,
          qty: r.quantita,
          quantitaDaConvertire: (r as any).quantitaDaConvertire ?? undefined,
          createdAt: o.creatoIl,
          expiresAt: o.scadeIl,
          statoId: o.idStato,
          note: o.note,
          pdfSent: !!o.pdfInviatoIl,
          tipologia: "",
        })),
      );

      setState((s) => ({ ...s, options: mapped, rawOptions: data }));
      const raceIds = [...new Set(mapped.map((o) => o.raceId))];
      raceIds.forEach((id) => {
        prefetchDettaglioGara(Number(id))
          .then((d) => registerSectors(Number(id), d))
          .catch(() => undefined);
      });
    } catch (e) {
      console.error("fetchOpzioni", e);
    }
  }

  const fetchAudits = async () => {
    let toId = 0;
    let userId = 0;

    if (isAdmin) {
      // Admin: SUE azioni (su qualunque TO) ∪ TUTTE le azioni del TO selezionato.
      // Servono ENTRAMBI: userId per il ramo "le mie", toId per il ramo "di quel TO".
      userId = state?.user?.id ?? 0;
      toId = state?.selectedToId ? Number(state.selectedToId) : 0;
    } else {
      // TO: solo le azioni del proprio TO.
      toId = state?.user?.tourOperatorId ?? 0;
    }

    // Nessun filtro utile → lista vuota (evita full-scan accidentale).
    if (toId <= 0 && userId <= 0) {
      setState((s) => ({ ...s, audit: [] }));
      return;
    }

    try {
      const res = await api.audit(toId || undefined, userId || undefined);

      // NIENTE .filter(): il backend con OR restituisce già l'insieme corretto
      // (le mie azioni ∪ le azioni del TO selezionato).
      const mapped: AuditEntry[] = res.map((o) => ({
        id: String(o.id),
        at: o.creatoIl ?? "",
        user: o.utente ?? o.tourOperator ?? "",
        ip: o.ip ?? "",
        entity: o.entita ?? "",
        entityId: o.entitaId ?? "",
        action: o.azione ?? "",
        details: o.dettagli ?? "",
        datetime: o.creatoIl,
      }));

      setState((s) => ({ ...s, audit: mapped }));
    } catch (e) {
      console.error("fetchAudits", e);
    }
  };

  const getTourOperatorsByName = async (name: string) => {
    try {
      const data = await api.tourOperatorsByName(name);
      const mapped: TourOperator[] = data.map((dto) => ({
        id: dto.id.toString(),
        name: dto.ragioneSociale,
        type:
          (dto.tipo === "A" && "Azienda") ||
          (dto.tipo === "F" && "FanClub") ||
          (dto.tipo === "T" && "TO") ||
          (dto.tipo === "H" && "Hotel") ||
          "TO",
        email: dto.emailContatto || "",
        plafond: dto.plafond ?? 0,
        used: 0,
        enabled: dto.abilitato,
        partnerDiscount: dto.scontoPartner,
        company: dto.azienda,
      }));
      setState((s) => ({ ...s, tourOperatorsByName: mapped }));
    } catch (error) {
      console.log(error);
    }
  };

  const sendEmailForResetPassword = async (email: string) => {
    try {
      const res = await api.sendEmailForResetPassword(email);
      console.log(res);
    } catch {
      /* silenzioso */
    }
  };

  // ---- Admin state updates ----
  const updateOptionStato = async (
    optionId: number,
    idStato: number,
    idTourOperator: number,
    utenteId: number,
  ) => {
    try {
      // Stato precedente (dalla cache, se presente)
      const previous = state.options.find((o) => o.optionId === optionId);
      const previousStato = previous?.statoId;

      // Rileva transizione ≠VALIDATA → VALIDATA
      const becomesValidata =
        previousStato !== STATO_IDS.VALIDATA && idStato === STATO_IDS.VALIDATA;

      await api.aggiornaStatoOpzione(optionId, idStato, idTourOperator, utenteId);

      if (becomesValidata) {
        try {
          // Ricarica il dettaglio completo per avere righe + scadeIl aggiornati
          const full = await api.opzione(optionId, {
            tourOperatorId: idTourOperator,
            role: state.user?.ruolo === "ADMIN" ? "ADMIN" : "TO",
          });
          await sendOptionPdfValidata(full);
          toast.success(`Email 'validata' inviata per ${full.numero}.`);
        } catch (e) {
          console.error("[updateOptionStato] invio email validata fallito", e);
          toast.error("Stato aggiornato ma email 'validata' non inviata.");
        }
      }

      await fetchOpzioni();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore aggiornamento stato opzione";
      toast.error(msg);
      throw error;
    }
  };

  const updatePrenotazioneStato = async (
    prenotazioneId: number,
    idStato: number,
    idTourOperator: number,
    utenteId: number,
  ) => {
    try {
      // Stato precedente (dal Booking in cache, se presente)
      const previous = state.bookings.find((b) => b.prenotazioneId === prenotazioneId);
      const previousStato = previous?.statoId;

      // Rileva le transizioni: ≠X → X
      const becomesValidata =
        previousStato !== STATO_IDS.VALIDATA && idStato === STATO_IDS.VALIDATA;
      const becomesSaldato = previousStato !== STATO_IDS.SALDATA && idStato === STATO_IDS.SALDATA;

      const updated = await api.aggiornaStatoPrenotazione(
        prenotazioneId,
        idStato,
        idTourOperator,
        utenteId,
      );

      // Ricarica il dettaglio completo SOLO se dobbiamo generare il PDF
      let full: PrenotazioneDto | undefined;
      if (becomesValidata || becomesSaldato) {
        full = updated?.righe?.length
          ? updated
          : await api.prenotazione(prenotazioneId, {
              tourOperatorId: idTourOperator,
              role: state.user?.ruolo === "ADMIN" ? "ADMIN" : "TO",
            });
      }

      if (becomesValidata && full) {
        try {
          await sendBookingPdfValidata(full);
          toast.success(`Email 'validata' inviata per ${full.numero}.`);
        } catch (e) {
          console.error("[updatePrenotazioneStato] invio email validata fallito", e);
          toast.error("Stato aggiornato ma email 'validata' non inviata.");
        }
      }

      if (becomesSaldato && full) {
        try {
          await sendBookingPdfSaldata(full);
          toast.success(`Email 'saldata' inviata per ${full.numero}.`);
        } catch (e) {
          console.error("[updatePrenotazioneStato] invio email saldata fallito", e);
          toast.error("Stato aggiornato ma email 'saldata' non inviata.");
        }
      }

      await fetchPrenotazioni();
    } catch (error) {
      const msg =
        error instanceof ApiError ? error.message : "Errore aggiornamento stato prenotazione";
      toast.error(msg);
      throw error;
    }
  };

  const aggiornaTariffaRigaOpzione = async (params: {
    opzioneId: number;
    tourOperatorId: number;
    rigaId: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
  }) => {
    try {
      await api.aggiornaTariffaRigaOpzione(params.opzioneId, params.rigaId, {
        tourOperatorId: params.tourOperatorId,
        garaId: params.garaId,
        settoreId: params.settoreId,
        prezzoId: params.prezzoId,
      });
      await fetchOpzioni();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore aggiornamento tariffa";
      toast.error(msg);
      throw error;
    }
  };

  const aggiornaTariffaRigaPrenotazione = async (params: {
    prenotazioneId: number;
    tourOperatorId: number;
    rigaId: number;
    garaId: number;
    settoreId: string;
    prezzoId: number;
  }) => {
    try {
      await api.aggiornaTariffaRigaPrenotazione(params.prenotazioneId, params.rigaId, {
        tourOperatorId: params.tourOperatorId,
        garaId: params.garaId,
        settoreId: params.settoreId,
        prezzoId: params.prezzoId,
      });
      await fetchPrenotazioni();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore aggiornamento tariffa";
      toast.error(msg);
      throw error;
    }
  };

  const aggiornaQuantitaRigaOpzione = async (params: {
    opzioneId: number;
    tourOperatorId: number;
    rigaId: number;
    quantita: number;
  }) => {
    try {
      await api.aggiornaQuantitaRigaOpzione(params.opzioneId, params.rigaId, {
        tourOperatorId: params.tourOperatorId,
        quantita: params.quantita,
      });
      await fetchOpzioni();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore aggiornamento quantità";
      toast.error(msg);
      throw error;
    }
  };

  const aggiornaQuantitaRigaPrenotazione = async (params: {
    prenotazioneId: number;
    tourOperatorId: number;
    rigaId: number;
    quantita: number;
  }) => {
    try {
      await api.aggiornaQuantitaRigaPrenotazione(params.prenotazioneId, params.rigaId, {
        tourOperatorId: params.tourOperatorId,
        quantita: params.quantita,
      });
      await fetchPrenotazioni();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore aggiornamento quantità";
      toast.error(msg);
      throw error;
    }
  };

  // ---- PDF upload helper ----
  /**
   * Genera il PDF lato client e lo carica sul server. Il server salva
   * il file in `Prenotazione.PdfAllegato` e invia l'email con l'allegato.
   *
   * Usa `state.settings` per IBAN/SWIFT/bank, e `pren.totaleCommissioni`
   * come totale service fees.
   */
  const sendBookingPdf = async (pren: PrenotazioneDto): Promise<void> => {
    try {
      const b64 = await buildBookingPdfBase64(pren);
      await api.uploadPrenotazionePdf(pren.id, b64);
    } catch (e) {
      console.error("[sendBookingPdf] upload PDF fallito per", pren.numero, e);
      toast.error(`PDF/email non inviati per ${pren.numero}`);
    }
  };

  const sendBookingPdfSaldata = async (pren: PrenotazioneDto): Promise<void> => {
    try {
      const b64 = await buildBookingPdfBase64(pren);
      await api.uploadPrenotazionePdfSaldata(pren.id, b64);
    } catch (e) {
      console.error("[sendBookingPdfSaldata] upload PDF fallito per", pren.numero, e);
      toast.error(`PDF/email 'saldata' non inviati per ${pren.numero}`);
    }
  };
  const sendBookingPdfValidata = async (pren: PrenotazioneDto): Promise<void> => {
    try {
      const b64 = await buildBookingPdfBase64(pren);
      await api.uploadPrenotazionePdfValidata(pren.id, b64);
    } catch (e) {
      console.error("[sendBookingPdfValidata] upload PDF fallito per", pren.numero, e);
      toast.error(`PDF/email 'validata' non inviati per ${pren.numero}`);
    }
  };

  const sendOptionPdfValidata = async (opt: OpzioneDto): Promise<void> => {
    try {
      const b64 = await buildOptionPdfBase64(opt);
      await api.uploadOpzionePdfValidata(opt.id, b64);
    } catch (e) {
      console.error("[sendOptionPdfValidata] upload PDF fallito per", opt.numero, e);
      toast.error(`PDF/email 'validata' non inviati per ${opt.numero}`);
    }
  };
  /** Genera il PDF lato client come base64 (condiviso da creazione e saldata). */
  const buildBookingPdfBase64 = async (pren: PrenotazioneDto): Promise<string> => {
    const lang = languageFromUser(state?.user?.lingua);

    console.log();
    const imgs = await loadPdfImages();

    const dateFmt = new Intl.DateTimeFormat(
      lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : "it-IT",
      { day: "2-digit", month: "2-digit", year: "numeric" },
    );
    const formatDate = (iso: string | null | undefined) => {
      if (!iso) return "—";
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
    };

    const rows = pren.righe.map((r) => {
      const race = state.races.find((x) => x.id === String(r.garaId));
      const sector = state.sectors.find((x) => x.id === `${r.garaId}-${r.settoreId}`);
      const price = sector?.prezzi?.find((p) => p.id === r.prezzoId);

      const ticketType =
        lang === "en"
          ? (price?.tipologiaEN ?? price?.tipologia ?? "Full Price")
          : lang === "de"
            ? (price?.tipologiaDE ?? price?.tipologia ?? "Normalpreis")
            : (price?.tipologia ?? "Intero");

      return {
        date: race?.date ? formatDate(race.date) : "—",
        race: race ? nomeLocalizzato(race, lang) : `Gara #${r.garaId}`,
        ticketType,
        category: sector ? nomeLocalizzato(sector, lang) : r.settoreId,
        qty: r.quantita,
        unitPrice: r.prezzoUnitario,
        total: r.totale,
      };
    });

    const rowsSum = rows.reduce((s, r) => s + r.total, 0);
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const serviceFeeTotal =
      pren.totaleCommissioni > 0
        ? pren.totaleCommissioni
        : (state.settings?.servizioPrezzo ?? 0) * totalQty;
    const emailFeeTotal = state.settings?.emailPrezzo ?? 0;
    const grandTotal = rowsSum + serviceFeeTotal + emailFeeTotal;

    const paymentDueDays = pren.scadenzaPagamento
      ? Math.max(
          0,
          Math.round(
            (new Date(pren.scadenzaPagamento).getTime() - new Date(pren.creatoIl).getTime()) /
              86_400_000,
          ),
        )
      : 7;

    return generatePdfBase64({
      kind: "BOOKING",
      lang,
      date: pren.creatoIl,
      number: pren.numero,
      operator: pren.tourOperatorNome,
      customer: { name: pren.cliente ?? pren.tourOperatorNome },
      rows,
      serviceFees: serviceFeeTotal,
      emailFees: emailFeeTotal,
      grandTotal,
      paymentDueDays,
      notes: pren.noteTo ?? undefined,
      headerImage: imgs.header,
      footerImage: imgs.footer,
      user: state?.user ?? null,
      settings: state.settings,
      t,
    });
  };

  const buildOptionPdfBase64 = async (opt: OpzioneDto): Promise<string> => {
    const lang = languageFromUser(state?.user?.lingua);
    const imgs = await loadPdfImages();

    const dateFmt = new Intl.DateTimeFormat(
      lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : "it-IT",
      { day: "2-digit", month: "2-digit", year: "numeric" },
    );
    const formatDate = (iso: string | null | undefined) => {
      if (!iso) return "—";
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
    };

    const rows = opt.righe.map((r) => {
      const race = state.races.find((x) => x.id === String(r.garaId));
      const sector = state.sectors.find((x) => x.id === `${r.garaId}-${r.settoreId}`);
      const price = sector?.prezzi?.find((p) => p.id === r.prezzoId);

      const ticketType =
        lang === "en"
          ? (price?.tipologiaEN ?? price?.tipologia ?? "Full Price")
          : lang === "de"
            ? (price?.tipologiaDE ?? price?.tipologia ?? "Normalpreis")
            : (price?.tipologia ?? "Intero");

      return {
        date: race?.date ? formatDate(race.date) : "—",
        race: race ? nomeLocalizzato(race, lang) : `Gara #${r.garaId}`,
        ticketType,
        category: sector ? nomeLocalizzato(sector, lang) : r.settoreId,
        qty: r.quantita,
        unitPrice: r.prezzoUnitario,
        total: r.totale,
      };
    });

    const rowsSum = rows.reduce((s, r) => s + r.total, 0);
    const serviceFeeTotal = opt.totaleCommissioni ?? 0;
    const emailFeeTotal = state.settings?.emailPrezzo ?? 0;
    const grandTotal = rowsSum + serviceFeeTotal + emailFeeTotal;

    return generatePdfBase64({
      kind: "OPTION",
      lang,
      date: opt.creatoIl,
      number: opt.numero,
      operator: opt.tourOperatorNome,
      customer: { name: opt.tourOperatorNome },
      rows,
      serviceFees: serviceFeeTotal,
      emailFees: emailFeeTotal,
      grandTotal,
      expiresAt: opt.scadeIl, // obbligatorio per il blocco "scadenza opzione"
      notes: opt.note ?? undefined,
      headerImage: imgs.header,
      footerImage: imgs.footer,
      user: state?.user ?? null,
      settings: state.settings,
      t,
    });
  };

  // ---- Conversione opzione → prenotazione ----
  const convertOptionToBooking = async (
    id: string,
    customer: string,
    depositPct: number,
    qtyToConvert?: number,
  ): Promise<PrenotazioneDto | undefined> => {
    const opt = state.options.find((o) => o.id === id);
    if (!opt) return undefined;
    const sector = state.sectors.find((x) => x.id === opt.sectorId);
    if (!sector) return undefined;

    const qty = Math.max(1, Math.min(qtyToConvert ?? opt.qty, opt.qty));
    const residuo = opt.qty - qty;
    const total = qty * sector.priceTo;
    const deposit = Math.round(total * (depositPct / 100));
    const bid = `b${Math.random().toString(36).slice(2, 7)}`;
    const convertitaId = statoIdByDescrizioneIT("Convertita") ?? STATO_IDS.CONVERTITA;
    const validataId = statoIdByDescrizioneIT("Validata") ?? STATO_IDS.VALIDATA;
    const daSaldareId = statoIdByDescrizioneIT("Da saldare") ?? STATO_IDS.DA_SALDARE;

    // Aggiornamento ottimistico locale
    setState((s) => ({
      ...s,
      options: s.options.map((o) =>
        o.id === id
          ? residuo > 0
            ? { ...o, qty: residuo, statoId: validataId }
            : { ...o, statoId: convertitaId, quantitaDaConvertire: qty }
          : o,
      ),
      bookings: [
        {
          id: bid,
          fromOptionId: id,
          toId: opt.toId,
          raceId: opt.raceId,
          sectorId: opt.sectorId,
          prezzoId: opt.prezzoId ?? 0,
          qty,
          total,
          deposit,
          paid: deposit,
          paymentDueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          customer,
          statoId: daSaldareId,
          status: deposit >= total ? "paid" : deposit > 0 ? "partially_paid" : "pending_payment",
          createdAt: new Date().toISOString(),
        },
        ...s.bookings,
      ],
    }));

    // Chiamata reale al backend + PDF
    if (opt.optionId > 0 && opt.rigaId > 0) {
      try {
        const esito = await api.convertiOpzione(opt.optionId, {
          tourOperatorId: Number(currentToId ?? 0),
          cliente: customer,
          applicaScontoPartner: false,
          righe: [{ opzioneRigaId: opt.rigaId, quantita: qty }],
        });
        await fetchOpzioni();
        await fetchPrenotazioni();

        // PDF + email (il server salva il file e spedisce la mail con allegato)
        await sendBookingPdf(esito.prenotazione);

        return esito.prenotazione;
      } catch (e) {
        console.error("convertiOpzione", e);
        toast.error("Conversione non riuscita. Riprova.");
      }
    }
    return undefined;
  };

  // ---- Booking / sale actions ----
  const createDirectBooking = ({ raceId, sectorId, qty, customer, prezzoId }: any) => {
    if (!currentToId) {
      toast.error("Seleziona un Tour Operator per creare una prenotazione.");
      return;
    }
    const sector = state.sectors.find((x) => x.id === sectorId);
    if (!sector) return;
    const total = qty * sector.priceTo;
    const bid = `b${Math.random().toString(36).slice(2, 7)}`;
    const daSaldareId = statoIdByDescrizioneIT("Da saldare") ?? STATO_IDS.DA_SALDARE;
    setState((s) => ({
      ...s,
      bookings: [
        {
          id: bid,
          toId: currentToId,
          raceId,
          sectorId,
          prezzoId,
          qty,
          total,
          deposit: 0,
          paid: 0,
          paymentDueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          customer,
          statoId: daSaldareId,
          status: "pending_payment",
          createdAt: new Date().toISOString(),
        },
        ...s.bookings,
      ],
    }));
  };

  const registerPayment = (bookingId: string, amount: number) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const paid = b.paid + amount;
        const status: BookingStatus =
          paid >= b.total ? "paid" : paid > 0 ? "partially_paid" : b.status;
        return { ...b, paid, status };
      }),
    }));
  };

  const convertBookingToSale = (bookingId: string) => {
    const b = state.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const voucher = `ANT27-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const sid = `s${Math.random().toString(36).slice(2, 7)}`;
    const rilasciataId = statoIdByDescrizioneIT("Rilasciata") ?? STATO_IDS.RILASCIATA;
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((x) =>
        x.id === bookingId ? { ...x, statoId: rilasciataId, status: "issued" } : x,
      ),
      sales: [
        {
          id: sid,
          bookingId,
          toId: b.toId,
          voucherCode: voucher,
          qty: b.qty,
          total: b.total,
          issuedAt: new Date().toISOString(),
          customer: b.customer,
          raceId: b.raceId,
          sectorId: b.sectorId,
        },
        ...s.sales,
      ],
    }));
  };

  const cancelBooking = async (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return;

    const prenotazioneId = Number(id.split("-")[0]);
    if (!Number.isFinite(prenotazioneId) || prenotazioneId <= 0) {
      toast.error("ID prenotazione non valido.");
      return;
    }

    try {
      await api.aggiornaStatoPrenotazione(prenotazioneId, STATO_IDS.CANCELLATA, Number(b.toId), 0);
      await fetchPrenotazioni();
      toast.success("Prenotazione cancellata.");
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Errore durante la cancellazione.";
      toast.error(msg);
      throw error;
    }
  };

  const toggleOperatorEnabled = async (id: string) => {
    try {
      await api.toggleAbilitato(Number(id));
      setState((s) => ({
        ...s,
        tourOperators: s.tourOperators.map((t) =>
          t.id === id ? { ...t, enabled: !t.enabled } : t,
        ),
      }));
      toast.success("Stato abilitazione aggiornato.");
    } catch (error) {
      console.error("Errore durante il toggle:", error);
      toast.error("Impossibile aggiornare lo stato. Riprova.");
      await fetchTourOperators();
    }
  };

  const setPartnerDiscount = (id: string, pct: number) => {
    setState((s) => ({
      ...s,
      tourOperators: s.tourOperators.map((t) => (t.id === id ? { ...t, partnerDiscount: pct } : t)),
    }));
  };

  const sendInvite = async (id: string) => {
    const operatorId = parseInt(id, 10);
    if (isNaN(operatorId) || operatorId <= 0) {
      toast.error("ID operatore non valido");
      return;
    }
    try {
      await api.sendInvitationEmail(operatorId);
      toast.success("Invito inviato con successo!");
    } catch (error) {
      console.error("Errore durante l'invio dell'invito:", error);
      const msg = error instanceof ApiError ? error.message : "Errore durante l'invio dell'email";
      toast.error(msg);
    }
  };

  // ---- Effects ----
  React.useEffect(() => {
    if (!state.user) return;
    if (state.user.ruolo === "ADMIN" && !state.selectedToId) return;
    fetchPrenotazioni();
    fetchOpzioni();
    fetchStatiRichiesta();
    fetchExpiryDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id, state.user?.ruolo, state.selectedToId]);

  React.useEffect(() => {
    fetchAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.user?.id, state?.selectedToId, state?.user?.tourOperatorId]);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("areato.session");
      if (raw) {
        const saved = JSON.parse(raw) as {
          user?: UtenteDto;
          selectedToId?: string;
        };
        if (saved.user) {
          setState((s) => ({
            ...s,
            user: saved.user as UtenteDto,
            selectedToId: saved?.user?.ruolo === "ADMIN" ? (saved.selectedToId ?? null) : null,
          }));
        }
      }
    } catch {}

    fetchTourOperators();
    fetchGare();
    fetchStatiRichiesta();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload settings when the user changes (fresh login)
  React.useEffect(() => {
    if (!state.user) return;
    fetchSettings(state.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id]);

  // Hydrate + persist cart
  const cartHydratedFor = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    const uid = state.user?.id;
    if (!uid) return;

    if (cartHydratedFor.current !== uid) {
      cartHydratedFor.current = uid;

      const saved = readCartFromSession(uid);
      setState((s) => ({ ...s, cart: saved }));

      const raceIds = [...new Set(saved.map((c) => c.raceId))];
      raceIds.forEach((id) => {
        prefetchDettaglioGara(Number(id))
          .then((d) => registerSectors(Number(id), d))
          .catch(() => undefined);
      });

      return;
    }

    writeCartToSession(uid, state.cart);
  }, [state.cart, state.user?.id, registerSectors]);

  // ---- Scoped memo ----
  const scopedOptions = React.useMemo(
    () => (currentToId ? state.options.filter((o) => o.toId === currentToId) : state.options),
    [state.options, currentToId],
  );

  const scopedBookings = React.useMemo(
    () => (currentToId ? state.bookings.filter((b) => b.toId === currentToId) : state.bookings),
    [state.bookings, currentToId],
  );

  const scopedSales = React.useMemo(
    () => (currentToId ? state.sales.filter((s) => s.toId === currentToId) : state.sales),
    [state.sales, currentToId],
  );

  // ---- Context value ----
  const ctx: Ctx = {
    ...state,
    options: scopedOptions,
    bookings: scopedBookings,
    sales: scopedSales,
    allOptions: state.options,
    allBookings: state.bookings,
    allSales: state.sales,
    audit: state.audit,
    isAdmin,
    role: isAdmin ? "admin" : "to",
    currentToId,
    currentUserEmail: state.user?.email ?? "",
    setUser,
    logout,

    addToCart: ({ raceId, sectorId, prezzoId, qty, note }) => {
      setState((s) => {
        const existing = s.cart.find((c) => c.sectorId === sectorId && c.raceId === raceId);
        if (existing) {
          return {
            ...s,
            cart: s.cart.map((c) =>
              c.id === existing.id ? { ...c, qty: c.qty + qty, note: note || c.note } : c,
            ),
          };
        }
        return {
          ...s,
          cart: [
            ...s.cart,
            {
              id: `c${Math.random().toString(36).slice(2, 8)}`,
              raceId,
              sectorId,
              prezzoId,
              qty,
              note,
            },
          ],
        };
      });
    },

    updateCartItem: (id, patch) =>
      setState((s) => ({
        ...s,
        cart: s.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),

    removeCartItem: (id) => setState((s) => ({ ...s, cart: s.cart.filter((c) => c.id !== id) })),

    clearCart: () => setState((s) => ({ ...s, cart: [] })),

    setSelectedTo,
    createOption,
    releaseOption,
    validateOption,
    rejectOption,
    sendOptionPdf,
    sendExpiryAlerts,
    convertOptionToBooking,
    createDirectBooking,
    registerPayment,
    convertBookingToSale,
    cancelBooking,
    toggleOperatorEnabled,
    setPartnerDiscount,
    sendInvite,
    getTourOperatorsByName,
    sendEmailForResetPassword,
    registerSectors,
    sendBookingPdf,

    submitCart: async ({ kind, note }) => {
      const items = state.cart;
      if (items.length === 0) return { count: 0 };

      if (!currentToId) {
        toast.error("Seleziona un Tour Operator per proseguire.");
        return { count: 0 };
      }

      const rows = items.map((c) => {
        const race = state.races.find((r) => r.id === c.raceId);
        const sector = state.sectors.find((s) => s.id === c.sectorId);
        const price = sector?.priceTo ?? 0;
        return {
          ...c,
          raceName: race?.name ?? "",
          sectorName: sector?.name ?? "",
          price,
          subtotal: price * c.qty,
        };
      });

      const righe = rows.map((r) => {
        const idx = r.sectorId.indexOf("-");
        const race = state.races.find((x) => x.id === r.raceId);
        return {
          garaId: Number(r.sectorId.slice(0, idx)),
          settoreId: r.sectorId.slice(idx + 1),
          prezzoId: r.prezzoId,
          quantita: r.qty,
          abbonamento: !race?.date,
        };
      });

      const reqNote = note?.trim() || undefined;
      const righeNote = rows
        .map((r) => (r.note ? `${r.raceName} / ${r.sectorName}: ${r.note}` : null))
        .filter(Boolean)
        .join(" | ");

      const inValidazioneId = statoIdByDescrizioneIT("In validazione") ?? STATO_IDS.IN_VALIDAZIONE;

      try {
        if (kind === "option") {
          await api.creaOpzione({
            tourOperatorId: Number(currentToId),
            idStato: inValidazioneId,
            note: [righeNote, reqNote].filter(Boolean).join(" — ") || undefined,
            righe,
          });

          setState((s) => ({ ...s, cart: [] }));
          removeCartFromSession(state.user?.id);
          return { count: rows.length };
        }

        // kind === "booking"
        const pren = await api.creaPrenotazione({
          tourOperatorId: Number(currentToId),
          cliente: state.user?.nomeCompleto?.trim() || currentTo?.name,
          noteTo: [righeNote, reqNote].filter(Boolean).join(" — ") || undefined,
          applicaScontoPartner: false,
          role: state.user?.ruolo === "ADMIN" ? "ADMIN" : "TO",
          righe,
        });

        setState((s) => ({ ...s, cart: [] }));
        removeCartFromSession(state.user?.id);

        // Il PDF + email viene inviato dal chiamante (cart.tsx) tramite
        // `sendBookingPdf(pren)`, così può mostrare un toast specifico.
        return { count: rows.length, prenotazione: pren };
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Errore invio richiesta";
        toast.error(msg);
        return { count: 0 };
      }
    },

    refreshBookings: fetchPrenotazioni,
    refreshOptions: fetchOpzioni,
    convertiOpzioni: async (body: OpzioneDto[]) => {
      const result = await api.convertiOpzioni(body);

      // Genera + uploada il PDF per ogni prenotazione creata
      for (const { prenotazione } of result) {
        await sendBookingPdf(prenotazione);
      }

      await fetchOpzioni();
      await fetchPrenotazioni();
      return result;
    },
    updateOptionStato,
    updatePrenotazioneStato,
    aggiornaTariffaRigaOpzione,
    aggiornaTariffaRigaPrenotazione,
    setSelectedTOperator: (operator: TourOperator | null) =>
      setState((s) => ({ ...s, selectedTOperator: operator })),
    aggiornaQuantitaRigaOpzione,
    aggiornaQuantitaRigaPrenotazione,
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useToStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useToStore must be used within ToStoreProvider");
  return ctx;
}

// ----- Utility di formattazione -----
export const fmtEur = (n: number) => {
  const whole = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${whole} €`;
};

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getUTCDate())} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export const fmtDateOnly = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getUTCDate().toString().padStart(2, "0")} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
