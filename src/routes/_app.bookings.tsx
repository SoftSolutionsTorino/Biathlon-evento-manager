import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import {
  useToStore,
  nomeLocalizzato,
  fmtEur,
  daysUntil,
  type Booking,
  type Role,
} from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { generatePdf, languageFromUser, loadPdfImages } from "@/lib/pdf";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api, type StatoRichiestaDto } from "@/lib/api";

export const Route = createFileRoute("/_app/bookings")({
  component: BookingsPage,
});

const VARIANT_BY_STATO_ID: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  1: "secondary",
  2: "default",
  3: "secondary",
  4: "secondary",
  5: "default",
  6: "destructive",
  7: "outline",
};

const CLOSED_STATO_IDS = new Set<number>([4, 3]);
const PENDING_STATO_IDS = new Set<number>([1, 7]);

/** Griglia senza colonna azioni: i pulsanti sono nell'header del gruppo. */
const GRID_ROWS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_4.5rem_10rem] items-center gap-3";

function ColLabel({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`text-xs font-medium text-muted-foreground ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </span>
  );
}

/** Riga di prenotazione con eventuale id prenotazione "padre". */
type BookingRow = Booking & {
  prenotazioneId?: string;
  numero?: string;
};

type BookingGroup = {
  prenotazioneId: string;
  numero: string;
  customer: string;
  statoId: number;
  paymentDueAt: string;
  rows: BookingRow[];
};

function BookingsPage() {
  const {
    bookings,
    races,
    sectors,
    cancelBooking,
    user,
    tourOperators,
    currentToId,
    refreshBookings,
    statiRichiesta,
  } = useToStore();
  const { t, lang } = useI18n();
  const { fmtDate, fmtDateOnly } = useFormatters();
  const [filter, setFilter] = React.useState<"all" | string>("all");

  const pdfLang = languageFromUser(user?.lingua);

  const role = (user?.ruolo.toLowerCase() ?? "to") as Role;
  const operatorName = tourOperators.find((x) => x.id === currentToId)?.name ?? "";

  const statoLabel = React.useCallback(
    (s: StatoRichiestaDto) => {
      const l = (lang ?? "it").toLowerCase();
      if (l.startsWith("en")) return s.descrizioneEN;
      if (l.startsWith("de")) return s.descrizioneDE;
      return s.descrizioneIT;
    },
    [lang],
  );

  const statoById = React.useMemo(() => {
    const m = new Map<number, StatoRichiestaDto>();
    statiRichiesta.forEach((s) => m.set(s.id, s));
    return m;
  }, [statiRichiesta]);

  const labelFor = (b: BookingRow) => {
    const s = statoById.get(b.statoId);
    return s ? statoLabel(s) : String(b.statoId);
  };

  const filtered = bookings.filter((b) => filter === "all" || String(b.statoId) === filter);

  // Lookup maps
  const racesById = React.useMemo(() => {
    const m = new Map<string, (typeof races)[number]>();
    races.forEach((r) => m.set(r.id, r));
    return m;
  }, [races]);

  const sectorsById = React.useMemo(() => {
    const m = new Map<string, (typeof sectors)[number]>();
    sectors.forEach((s) => m.set(s.id, s));
    return m;
  }, [sectors]);

  /** Raggruppa le righe per id prenotazione. */
  const groupedFiltered = React.useMemo<BookingGroup[]>(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of filtered as BookingRow[]) {
      const key = b.prenotazioneId ?? b.id;
      const arr = map.get(key);
      if (arr) arr.push(b);
      else map.set(key, [b]);
    }
    return Array.from(map.entries()).map(([key, rows]) => {
      const first = rows[0];
      return {
        prenotazioneId: key,
        numero: first.numeroPrenotazione ?? key,
        customer: first.customer,
        statoId: first.statoId,
        paymentDueAt: first.paymentDueAt,
        rows,
      };
    });
  }, [filtered]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refreshBookings();
  }, []);

  const countsByStato = React.useMemo(() => {
    const m = new Map<number, Set<string>>();
    for (const b of bookings) {
      const prenId = b.id.split("-")[0];
      let set = m.get(b.statoId);
      if (!set) {
        set = new Set<string>();
        m.set(b.statoId, set);
      }
      set.add(prenId);
    }
    const out = new Map<number, number>();
    for (const [statoId, set] of m) out.set(statoId, set.size);
    return out;
  }, [bookings]);

  // Totale PRENOTAZIONI distinte (per il tab "all").
  const totalPrenotazioni = React.useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.id.split("-")[0]);
    return set.size;
  }, [bookings]);

  /**
   * PDF per l'INTERA prenotazione (una riga PDF per ogni riga prenotazione).
   */
  const downloadPdfGroup = React.useCallback(
    async (g: BookingGroup) => {
      if (g.rows.length === 0) return;
      let settings: import("@/lib/api").UtenteDta | null = null;
      try {
        const list = await api.utenti();
        settings = list[0] ?? null;
      } catch (e) {}

      const pdfRows = g.rows.map((b) => {
        const r = racesById.get(b.raceId);
        const s = sectorsById.get(b.sectorId);
        const priceInfo = s?.prezzi?.find((p) => p.id === b.prezzoId);

        let ticketType = b.tipologia || "Intero";
        if (pdfLang === "en") ticketType = priceInfo?.tipologiaEN || b.tipologia || "Full Price";
        else if (pdfLang === "de")
          ticketType = priceInfo?.tipologiaDE || b.tipologia || "Normalpreis";

        // FALLBACK SUL PREZZO: se b.total è 0/falsy, usa il prezzo del catalogo
        const unitPrice =
          b.total && b.qty > 0 ? b.total / b.qty : (priceInfo?.importo ?? s?.priceTo ?? 0);
        const total = b.total || b.qty * unitPrice;

        return {
          date: r ? fmtDateOnly(r.date || new Date().toISOString()) : "—",
          race: nomeLocalizzato(r, pdfLang),
          raceTime: (r as any)?.time ?? undefined,
          ticketType: ticketType,
          category: nomeLocalizzato(s, pdfLang),
          seatRow: (b as any).seatRow ?? undefined,
          seatNumber: (b as any).seatNumber ?? undefined,
          qty: b.qty,
          unitPrice,
          total,
        };
      });

      const grandTotal = pdfRows.reduce((sum, r) => sum + r.total, 0);
      const imgs = await loadPdfImages();

      const file = generatePdf({
        kind: "BOOKING",
        lang: pdfLang,
        date: new Date().toISOString(),
        number: g.numero,
        operator: operatorName || g.customer,
        customer: { name: g.customer },
        rows: pdfRows,
        grandTotal,
        paymentDueDays: 7,
        headerImage: imgs.header,
        footerImage: imgs.footer,
        user: user,
        settings: settings,
        t: t, // <-- AGGIUNGI QUESTO
      });

      toast.success(t("pdf.generated", { file }));
    },
    [racesById, sectorsById, pdfLang, operatorName, fmtDateOnly, t, user],
  );

  // button onClick must swallow the promise

  /** PDF del gruppo (memoizzata). */
  const pdfButtonGroup = React.useCallback(
    (g: BookingGroup) => (
      <Button size="sm" variant="outline" onClick={() => void downloadPdfGroup(g)}>
        <FileDown className="mr-2 h-3.5 w-3.5" />
        {t("pdf.confirm")}
      </Button>
    ),
    [downloadPdfGroup, t],
  );

  /** Cancellazione dell'INTERA prenotazione (memoizzata). */
  const cancelButtonGroup = React.useCallback(
    (g: BookingGroup) => {
      const closed = CLOSED_STATO_IDS.has(g.statoId);
      const cancellableByStato = g.statoId === 1 || g.statoId === 2;
      const paid = g.rows[0].paid ?? 0;
      const canCancel =
        !closed &&
        (cancellableByStato ||
          (paid === 0 && can(role, "booking.cancelUnpaid")) ||
          can(role, "booking.cancelPaid"));

      if (!canCancel) {
        if (!closed && role === "to" && paid > 0) {
          return (
            <span className="self-center text-xs text-muted-foreground">
              {t("bookings.adminOnly")}
            </span>
          );
        }
        return null;
      }

      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              {t("bookings.cancel")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("bookings.cancel.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("bookings.cancel.desc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    // Basta una riga: cancelBooking estrae l'ID prenotazione.
                    await cancelBooking(g.rows[0].id);
                  } catch {
                    /* il toast d'errore è già dentro cancelBooking */
                  }
                }}
              >
                {t("common.yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
    [cancelBooking, role, t],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("bookings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("bookings.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="all">
              {t("common.all")} ({totalPrenotazioni})
            </TabsTrigger>
            {statiRichiesta
              .filter((s) => !CLOSED_STATO_IDS.has(s.id))
              .map((s) => (
                <TabsTrigger key={s.id} value={String(s.id)}>
                  {statoLabel(s)} ({countsByStato.get(s.id) ?? 0})
                </TabsTrigger>
              ))}
          </TabsList>
        </div>
      </Tabs>

      {groupedFiltered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("bookings.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedFiltered.map((g) => {
            const first = g.rows[0];
            const closed = CLOSED_STATO_IDS.has(g.statoId);
            const d = daysUntil(g.paymentDueAt);
            return (
              <div key={g.prenotazioneId} className="rounded-md border">
                {/* Header del gruppo con PDF + Cancellazione a livello di PRENOTAZIONE */}
                <div className="flex flex-col gap-2 bg-muted/30 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{g.customer}</span>
                    <span className="text-xs text-muted-foreground">#{g.numero}</span>
                    <Badge variant={VARIANT_BY_STATO_ID[g.statoId] ?? "secondary"}>
                      {labelFor(first)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("bookings.col.due")}: {fmtDate(g.paymentDueAt)}
                      {!closed && (
                        <>
                          {" · "}
                          <span className={d <= 0 ? "text-destructive" : undefined}>
                            {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {pdfButtonGroup(g)}
                    {cancelButtonGroup(g)}
                  </div>
                </div>

                {/* Corpo */}
                <div className="overflow-x-auto px-5">
                  <div className="min-w-[680px]">
                    {/* Intestazione colonne */}
                    <div className={`${GRID_ROWS} px-5 py-1.5`}>
                      <ColLabel>{t("common.race")}</ColLabel>
                      <ColLabel>{t("common.sector")}</ColLabel>
                      <ColLabel align="right">{t("common.seats")}</ColLabel>
                      <ColLabel align="right">{t("bookings.col.payment")}</ColLabel>
                    </div>

                    {/* Righe */}
                    <div className="divide-y">
                      {g.rows.map((b) => {
                        const r = racesById.get(b.raceId);
                        const s = sectorsById.get(b.sectorId);
                        return (
                          <div key={b.id} className={`${GRID_ROWS} px-5 py-2 text-sm`}>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{r?.name ?? b.raceId}</div>
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(r?.date || new Date().toISOString())}
                              </div>
                            </div>
                            <span className="truncate text-xs text-muted-foreground">
                              {s?.name ?? b.sectorId}
                            </span>
                            <span className="text-right font-medium tabular-nums">{b.qty}</span>
                            <span className="text-right tabular-nums">{fmtEur(b.total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
