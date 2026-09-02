/**
 * Store demo dell'Area Riservata Tour Operator (mockup front-end).
 * ----------------------------------------------------------------
 * Riproduce il flusso definito nelle specifiche:
 *   Richiesta opzione → validazione Admin → prenotazione → pagamento → vendita.
 *
 * Due ruoli:
 *   - "admin": vede e opera su tutti i Tour Operator, valida le richieste,
 *              registra i pagamenti ed emette i titoli di accesso;
 *   - "to":    vede ed opera solo sui dati del proprio Tour Operator.
 *
 * Le collezioni esposte (options/bookings/sales) sono già filtrate in base al
 * ruolo e al TO selezionato; le collezioni "all*" contengono tutti i dati e
 * servono alle pagine di amministrazione.
 */
import * as React from "react";

export type Role = "admin" | "to";

export type RaceCode =
  | "SPRINT_M" | "SPRINT_W" | "PURSUIT_M" | "PURSUIT_W"
  | "INDIVIDUAL_M" | "INDIVIDUAL_W" | "MASSSTART_M" | "MASSSTART_W"
  | "RELAY_M" | "RELAY_W" | "MIXED_RELAY";

export type Race = {
  id: string;
  code: RaceCode;
  name: string;
  date: string; // ISO
  discipline: string;
};

export type Sector = {
  id: string;
  raceId: string;
  name: string;
  capacity: number;
  sold: number;
  priceTo: number; // EUR
  /** Settori a posti numerati: non opzionabili, solo prenotazione diretta. */
  numbered: boolean;
  /** Tipologia di prezzo usata nei riepiloghi Admin. */
  priceCategory: "INTERO" | "RIDOTTO" | "ABBONAMENTO";
};

/** "pending" = richiesta inviata, in attesa di validazione dell'Admin. */
export type OptionStatus = "pending" | "active" | "expired" | "released" | "converted" | "rejected";
export type BookingStatus = "pending_payment" | "partially_paid" | "paid" | "cancelled" | "issued";

export type TicketOption = {
  id: string;
  toId: string;
  raceId: string;
  sectorId: string;
  qty: number;
  createdAt: string;
  expiresAt: string;
  status: OptionStatus;
  note?: string;
  /** true quando l'Admin ha già inviato il PDF Optionsformular. */
  pdfSent?: boolean;
};

export type Booking = {
  id: string;
  fromOptionId?: string;
  toId: string;
  raceId: string;
  sectorId: string;
  qty: number;
  total: number;
  deposit: number;
  paid: number;
  paymentDueAt: string;
  customer: string;
  status: BookingStatus;
  createdAt: string;
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
  entity: "option" | "booking" | "sale" | "auth" | "operator";
  entityId: string;
  action: string;
  details?: string;
};

export type TourOperator = {
  id: string;
  name: string;
  type: "TO" | "FanClub";
  email: string;
  plafond: number;
  used: number;
  /** Flag di abilitazione all'area riservata, gestito solo dall'Admin. */
  enabled: boolean;
  /** Sconto partner (%) impostato manualmente dall'Admin. */
  partnerDiscount: number;
};

// ----- Dati demo: tappa di Anterselva/Antholz -----
const RACES: Race[] = [
  { id: "r1", code: "SPRINT_W", name: "Sprint Donne 7.5km", date: "2027-01-21T14:15:00", discipline: "Sprint" },
  { id: "r2", code: "SPRINT_M", name: "Sprint Uomini 10km", date: "2027-01-21T17:00:00", discipline: "Sprint" },
  { id: "r3", code: "PURSUIT_W", name: "Pursuit Donne 10km", date: "2027-01-22T13:30:00", discipline: "Pursuit" },
  { id: "r4", code: "PURSUIT_M", name: "Pursuit Uomini 12.5km", date: "2027-01-22T15:45:00", discipline: "Pursuit" },
  { id: "r5", code: "MIXED_RELAY", name: "Single Mixed Relay", date: "2027-01-23T13:00:00", discipline: "Relay" },
  { id: "r6", code: "RELAY_W", name: "Staffetta Donne 4x6km", date: "2027-01-23T15:30:00", discipline: "Relay" },
  { id: "r7", code: "MASSSTART_W", name: "Mass Start Donne 12.5km", date: "2027-01-24T12:30:00", discipline: "Mass Start" },
  { id: "r8", code: "MASSSTART_M", name: "Mass Start Uomini 15km", date: "2027-01-24T15:00:00", discipline: "Mass Start" },
];

// Pseudo-random deterministico: SSR e client producono gli stessi numeri.
const seeded = (seed: number, max: number) =>
  Math.floor(((((Math.sin(seed * 12.9898) * 43758.5453) % 1) + 1) % 1) * max);

const SECTORS: Sector[] = RACES.flatMap((r, i) => [
  { id: `${r.id}-A`, raceId: r.id, name: "Tribuna A — Arrivo", capacity: 1200, sold: seeded(i + 1, 800), priceTo: 95, numbered: true, priceCategory: "INTERO" },
  { id: `${r.id}-B`, raceId: r.id, name: "Tribuna B — Poligono", capacity: 1500, sold: seeded(i + 21, 900), priceTo: 75, numbered: false, priceCategory: "INTERO" },
  { id: `${r.id}-C`, raceId: r.id, name: "Settore C — In piedi", capacity: 3000, sold: seeded(i + 41, 1800), priceTo: 35, numbered: false, priceCategory: "RIDOTTO" },
]);

const TOUR_OPERATORS: TourOperator[] = [
  { id: "to1", name: "Alpine Tours GmbH", type: "TO", email: "mario.rossi@alpinetours.de", plafond: 80000, used: 32450, enabled: true, partnerDiscount: 25 },
  { id: "to2", name: "Südtirol Sport Travel", type: "TO", email: "info@sportravel.it", plafond: 50000, used: 18200, enabled: true, partnerDiscount: 0 },
  { id: "to3", name: "Fan Club Lukas Hofer", type: "FanClub", email: "board@fanclub-hofer.it", plafond: 15000, used: 4800, enabled: true, partnerDiscount: 0 },
  { id: "to4", name: "Nordic Travel Norge AS", type: "TO", email: "post@nordictravel.no", plafond: 40000, used: 0, enabled: false, partnerDiscount: 0 },
  { id: "to5", name: "Biathlon Fans Bayern e.V.", type: "FanClub", email: "kontakt@bfb.de", plafond: 12000, used: 0, enabled: false, partnerDiscount: 0 },
];

const today = new Date();
const inDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString();
const ago = (d: number) => new Date(today.getTime() - d * 86400000).toISOString();

const OPTIONS: TicketOption[] = [
  { id: "o1", toId: "to1", raceId: "r2", sectorId: "r2-B", qty: 24, createdAt: ago(2), expiresAt: inDays(5), status: "active", note: "Gruppo Monaco di Baviera", pdfSent: true },
  { id: "o2", toId: "to1", raceId: "r4", sectorId: "r4-B", qty: 40, createdAt: ago(1), expiresAt: inDays(6), status: "pending" },
  { id: "o3", toId: "to1", raceId: "r8", sectorId: "r8-C", qty: 12, createdAt: ago(8), expiresAt: inDays(1), status: "active", note: "Scadenza imminente", pdfSent: true },
  { id: "o4", toId: "to1", raceId: "r1", sectorId: "r1-C", qty: 60, createdAt: ago(15), expiresAt: ago(2), status: "expired" },
  { id: "o5", toId: "to1", raceId: "r6", sectorId: "r6-C", qty: 80, createdAt: ago(10), expiresAt: ago(3), status: "converted" },
  { id: "o6", toId: "to2", raceId: "r3", sectorId: "r3-C", qty: 120, createdAt: ago(1), expiresAt: inDays(6), status: "pending", note: "Pullman da Bolzano" },
  { id: "o7", toId: "to2", raceId: "r7", sectorId: "r7-B", qty: 35, createdAt: ago(4), expiresAt: inDays(3), status: "active", pdfSent: true },
  { id: "o8", toId: "to3", raceId: "r5", sectorId: "r5-C", qty: 50, createdAt: ago(0.5), expiresAt: inDays(7), status: "pending", note: "Fan club — settore in piedi" },
];

const BOOKINGS: Booking[] = [
  { id: "b1", fromOptionId: "o5", toId: "to1", raceId: "r6", sectorId: "r6-C", qty: 80, total: 80 * 35, deposit: 840, paid: 840, paymentDueAt: inDays(10), customer: "Tour Bus Bayern e.V.", status: "partially_paid", createdAt: ago(3) },
  { id: "b2", toId: "to1", raceId: "r3", sectorId: "r3-A", qty: 30, total: 30 * 95, deposit: 0, paid: 0, paymentDueAt: inDays(4), customer: "Norwegian Biathlon Friends", status: "pending_payment", createdAt: ago(1) },
  { id: "b3", toId: "to1", raceId: "r7", sectorId: "r7-B", qty: 18, total: 18 * 75, deposit: 0, paid: 18 * 75, paymentDueAt: ago(1), customer: "Ski Club Innsbruck", status: "paid", createdAt: ago(5) },
  { id: "b4", toId: "to2", raceId: "r2", sectorId: "r2-A", qty: 44, total: 44 * 95, deposit: 1000, paid: 1000, paymentDueAt: inDays(6), customer: "Sportreisen Meran", status: "partially_paid", createdAt: ago(2) },
  { id: "b5", toId: "to3", raceId: "r8", sectorId: "r8-C", qty: 26, total: 26 * 35, deposit: 0, paid: 26 * 35, paymentDueAt: ago(2), customer: "Fan Club trasferta Antholz", status: "paid", createdAt: ago(6) },
];

const SALES: Sale[] = [
  { id: "s1", bookingId: "b-old-1", toId: "to1", voucherCode: "ANT27-7H3K-9MX2", qty: 50, total: 50 * 95, issuedAt: ago(7), customer: "Finnish Biathlon Tours", raceId: "r2", sectorId: "r2-A" },
  { id: "s2", bookingId: "b-old-2", toId: "to1", voucherCode: "ANT27-A2P8-LL11", qty: 22, total: 22 * 75, issuedAt: ago(4), customer: "Czech Wax Travel", raceId: "r4", sectorId: "r4-B" },
  { id: "s3", bookingId: "b-old-3", toId: "to2", voucherCode: "ANT27-QQ41-77ZA", qty: 64, total: 64 * 35, issuedAt: ago(5), customer: "Südtirol Sport Travel — gruppo A", raceId: "r6", sectorId: "r6-C" },
];

const AUDIT: AuditEntry[] = [
  { id: "a1", at: ago(0.01), user: "mario.rossi@alpinetours.de", ip: "82.150.10.4", entity: "auth", entityId: "-", action: "Login SSO", details: "JWT exchange OK" },
  { id: "a2", at: ago(0.05), user: "mario.rossi@alpinetours.de", ip: "82.150.10.4", entity: "option", entityId: "o2", action: "Richiesta opzione", details: "40 posti — Pursuit M, Tribuna B" },
  { id: "a3", at: ago(0.2), user: "admin@biathlon-antholz.it", ip: "10.0.0.9", entity: "option", entityId: "o1", action: "Validazione opzione", details: "PDF Optionsformular inviato" },
  { id: "a4", at: ago(1.1), user: "admin@biathlon-antholz.it", ip: "10.0.0.9", entity: "sale", entityId: "s2", action: "Emissione titoli", details: "Voucher ANT27-A2P8-LL11" },
];

// --- Store ---
type State = {
  role: Role;
  /** TO attualmente in visualizzazione (per l'Admin è il TO selezionato). */
  currentToId: string;
  tourOperators: TourOperator[];
  races: Race[];
  sectors: Sector[];
  options: TicketOption[];
  bookings: Booking[];
  sales: Sale[];
  audit: AuditEntry[];
};

type Ctx = Omit<State, "options" | "bookings" | "sales"> & {
  /** Dati filtrati in base al ruolo/TO selezionato. */
  options: TicketOption[];
  bookings: Booking[];
  sales: Sale[];
  /** Dati completi (uso amministrativo). */
  allOptions: TicketOption[];
  allBookings: Booking[];
  allSales: Sale[];
  isAdmin: boolean;
  currentUserEmail: string;
  setRole: (r: Role) => void;
  setCurrentTo: (id: string) => void;
  createOption: (input: { raceId: string; sectorId: string; qty: number; ttlDays: number; note?: string }) => void;
  releaseOption: (id: string) => void;
  validateOption: (id: string) => void;
  rejectOption: (id: string) => void;
  sendOptionPdf: (id: string) => void;
  sendExpiryAlerts: (ids: string[]) => void;
  convertOptionToBooking: (id: string, customer: string, depositPct: number) => void;
  createDirectBooking: (input: { raceId: string; sectorId: string; qty: number; customer: string; note?: string }) => void;
  registerPayment: (bookingId: string, amount: number) => void;
  convertBookingToSale: (bookingId: string) => void;
  cancelBooking: (id: string) => void;
  toggleOperatorEnabled: (id: string) => void;
  setPartnerDiscount: (id: string, pct: number) => void;
  sendInvite: (id: string) => void;
};

const StoreContext = React.createContext<Ctx | null>(null);

const ADMIN_EMAIL = "admin@biathlon-antholz.it";
const ADMIN_IP = "10.0.0.9";
const TO_IP = "82.150.10.4";

export function ToStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>({
    role: "to",
    currentToId: "to1",
    tourOperators: TOUR_OPERATORS,
    races: RACES,
    sectors: SECTORS,
    options: OPTIONS,
    bookings: BOOKINGS,
    sales: SALES,
    audit: AUDIT,
  });

  /**
   * Ruolo e TO selezionato vengono conservati nel browser (solo mockup) così che
   * un refresh non riporti l'utente alla vista Tour Operator. La lettura avviene
   * dopo l'idratazione per evitare differenze fra HTML server e client.
   */
  const restored = React.useRef(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("areato.session");
      if (raw) {
        const saved = JSON.parse(raw) as { role?: Role; currentToId?: string };
        setState((s) => ({
          ...s,
          role: saved.role === "admin" ? "admin" : s.role,
          currentToId:
            saved.currentToId && s.tourOperators.some((t) => t.id === saved.currentToId)
              ? saved.currentToId
              : s.currentToId,
        }));
      }
    } catch {
      /* storage non disponibile: si resta sui valori di default */
    }
    restored.current = true;
  }, []);

  React.useEffect(() => {
    // Si scrive solo dopo il ripristino, altrimenti il primo render sovrascriverebbe il valore salvato.
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        "areato.session",
        JSON.stringify({ role: state.role, currentToId: state.currentToId }),
      );
    } catch {
      /* ignorato */
    }
  }, [state.role, state.currentToId]);

  const isAdmin = state.role === "admin";
  const currentTo = state.tourOperators.find((t) => t.id === state.currentToId)!;
  const currentUserEmail = isAdmin ? ADMIN_EMAIL : currentTo.email;

  const log = (entry: Omit<AuditEntry, "id" | "at" | "user" | "ip">) => {
    setState((s) => {
      const to = s.tourOperators.find((t) => t.id === s.currentToId)!;
      return {
        ...s,
        audit: [
          {
            id: `a${Math.random().toString(36).slice(2, 8)}`,
            at: new Date().toISOString(),
            user: s.role === "admin" ? ADMIN_EMAIL : to.email,
            ip: s.role === "admin" ? ADMIN_IP : TO_IP,
            ...entry,
          },
          ...s.audit,
        ],
      };
    });
  };

  const scoped = <T extends { toId: string }>(rows: T[]) =>
    rows.filter((r) => r.toId === state.currentToId);

  const ctx: Ctx = {
    ...state,
    options: scoped(state.options),
    bookings: scoped(state.bookings),
    sales: scoped(state.sales),
    // L'audit globale è riservato all'Admin: il TO vede solo le proprie azioni.
    audit: isAdmin ? state.audit : state.audit.filter((a) => a.user === currentTo.email),
    allOptions: state.options,
    allBookings: state.bookings,
    allSales: state.sales,
    isAdmin,
    currentUserEmail,

    setRole: (r) => setState((s) => ({ ...s, role: r })),
    setCurrentTo: (id) => setState((s) => ({ ...s, currentToId: id })),

    createOption: ({ raceId, sectorId, qty, ttlDays, note }) => {
      const id = `o${Math.random().toString(36).slice(2, 7)}`;
      setState((s) => ({
        ...s,
        options: [
          {
            id, toId: s.currentToId, raceId, sectorId, qty,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttlDays * 86400000).toISOString(),
            // Ogni nuova opzione nasce come richiesta da validare.
            status: "pending", note,
          },
          ...s.options,
        ],
      }));
      log({ entity: "option", entityId: id, action: "Richiesta opzione", details: `${qty} posti, scadenza ${ttlDays}gg` });
    },

    releaseOption: (id) => {
      setState((s) => ({ ...s, options: s.options.map((o) => (o.id === id ? { ...o, status: "released" } : o)) }));
      log({ entity: "option", entityId: id, action: "Rilascio opzione" });
    },

    validateOption: (id) => {
      setState((s) => ({ ...s, options: s.options.map((o) => (o.id === id ? { ...o, status: "active" } : o)) }));
      log({ entity: "option", entityId: id, action: "Validazione opzione" });
    },

    rejectOption: (id) => {
      setState((s) => ({ ...s, options: s.options.map((o) => (o.id === id ? { ...o, status: "rejected" } : o)) }));
      log({ entity: "option", entityId: id, action: "Rifiuto richiesta opzione" });
    },

    sendOptionPdf: (id) => {
      setState((s) => ({ ...s, options: s.options.map((o) => (o.id === id ? { ...o, pdfSent: true } : o)) }));
      log({ entity: "option", entityId: id, action: "Invio PDF Optionsformular" });
    },

    sendExpiryAlerts: (ids) => {
      log({ entity: "option", entityId: ids.join(","), action: "Invio avvisi di scadenza", details: `${ids.length} opzioni` });
    },

    convertOptionToBooking: (id, customer, depositPct) => {
      const opt = state.options.find((o) => o.id === id);
      if (!opt) return;
      const sector = state.sectors.find((x) => x.id === opt.sectorId)!;
      const total = opt.qty * sector.priceTo;
      const deposit = Math.round(total * (depositPct / 100));
      const bid = `b${Math.random().toString(36).slice(2, 7)}`;
      setState((s) => ({
        ...s,
        options: s.options.map((o) => (o.id === id ? { ...o, status: "converted" } : o)),
        bookings: [
          {
            id: bid, fromOptionId: id, toId: opt.toId,
            raceId: opt.raceId, sectorId: opt.sectorId, qty: opt.qty,
            total, deposit, paid: deposit,
            paymentDueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
            customer, status: deposit >= total ? "paid" : deposit > 0 ? "partially_paid" : "pending_payment",
            createdAt: new Date().toISOString(),
          },
          ...s.bookings,
        ],
      }));
      log({ entity: "booking", entityId: bid, action: "Conversione opzione → prenotazione", details: `Cliente: ${customer}, acconto ${depositPct}%` });
    },

    createDirectBooking: ({ raceId, sectorId, qty, customer, note }) => {
      const sector = state.sectors.find((x) => x.id === sectorId)!;
      const total = qty * sector.priceTo;
      const bid = `b${Math.random().toString(36).slice(2, 7)}`;
      setState((s) => ({
        ...s,
        bookings: [
          {
            id: bid, toId: s.currentToId, raceId, sectorId, qty,
            total, deposit: 0, paid: 0,
            paymentDueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
            customer, status: "pending_payment", createdAt: new Date().toISOString(),
          },
          ...s.bookings,
        ],
      }));
      log({ entity: "booking", entityId: bid, action: "Richiesta prenotazione diretta", details: `${qty} posti${note ? ` — ${note}` : ""}` });
    },

    registerPayment: (bookingId, amount) => {
      setState((s) => ({
        ...s,
        bookings: s.bookings.map((b) => {
          if (b.id !== bookingId) return b;
          const paid = b.paid + amount;
          const status: BookingStatus = paid >= b.total ? "paid" : paid > 0 ? "partially_paid" : b.status;
          return { ...b, paid, status };
        }),
      }));
      log({ entity: "booking", entityId: bookingId, action: "Registrazione pagamento", details: `+ ${fmtEur(amount)}` });
    },

    convertBookingToSale: (bookingId) => {
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b) return;
      const voucher = `ANT27-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const sid = `s${Math.random().toString(36).slice(2, 7)}`;
      setState((s) => ({
        ...s,
        bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: "issued" } : x)),
        sales: [
          {
            id: sid, bookingId, toId: b.toId, voucherCode: voucher, qty: b.qty, total: b.total,
            issuedAt: new Date().toISOString(), customer: b.customer,
            raceId: b.raceId, sectorId: b.sectorId,
          },
          ...s.sales,
        ],
      }));
      log({ entity: "sale", entityId: sid, action: "Emissione titoli di accesso", details: `Voucher ${voucher}` });
    },

    cancelBooking: (id) => {
      setState((s) => ({ ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) }));
      log({ entity: "booking", entityId: id, action: "Annullamento prenotazione" });
    },

    toggleOperatorEnabled: (id) => {
      setState((s) => ({
        ...s,
        tourOperators: s.tourOperators.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
      }));
      log({ entity: "operator", entityId: id, action: "Modifica abilitazione area riservata" });
    },

    setPartnerDiscount: (id, pct) => {
      setState((s) => ({
        ...s,
        tourOperators: s.tourOperators.map((t) => (t.id === id ? { ...t, partnerDiscount: pct } : t)),
      }));
      log({ entity: "operator", entityId: id, action: "Modifica sconto partner", details: `${pct}%` });
    },

    sendInvite: (id) => {
      log({ entity: "operator", entityId: id, action: "Invio link impostazione email/password" });
    },
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useToStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useToStore must be used within ToStoreProvider");
  return ctx;
}

export const fmtEur = (n: number) => {
  const whole = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${whole} €`;
};

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

// Formattazione deterministica (UTC) per evitare mismatch SSR/client.
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getUTCDate())} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export const fmtDateOnly = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate().toString().padStart(2, "0")} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

/** Esportazione CSV (apribile in Excel) usata dalle pagine admin/audit. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
