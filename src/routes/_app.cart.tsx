import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useToStore, fmtEur, fmtDateOnly } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { prefetchDettaglioGara } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { generatePdfBase64, languageFromUser } from "@/lib/pdf";

export const Route = createFileRoute("/_app/cart")({
  component: CartPage,
  head: () => ({
    meta: [
      { title: "Carrello richieste — Area Tour Operator Antholz" },
      {
        name: "description",
        content:
          "Componi una singola richiesta multi-gara di opzione o prenotazione per la Coppa del Mondo Biathlon ad Anterselva.",
      },
      { property: "og:title", content: "Carrello richieste — Area Tour Operator Antholz" },
      {
        property: "og:description",
        content: "Richieste multi-gara di opzioni e prenotazioni per i Tour Operator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Role = "admin" | "to";
type SubmitKind = "option" | "booking";

// Se dopo questo timeout i settori non sono ancora risolvibili,
// forziamo il render (evita skeleton infinito se una gara/settore
// è stato cancellato dal DB ma è ancora in sessionStorage).
const DETAILS_TIMEOUT_MS = 8000;

function CartPage() {
  const {
    cart,
    races,
    sectors,
    user,
    updateCartItem,
    removeCartItem,
    clearCart,
    submitCart,
    expiryDate: optionExpiry,
    registerSectors,
    sendBookingPdf,
  } = useToStore();
  const { t } = useI18n();
  const [customer, setCustomer] = React.useState("");
  const [note, setNote] = React.useState("");
  const [forcedReady, setForcedReady] = React.useState(false);
  // pending = quale submit è in corso (null = nessuno). Così lo spinner
  // appare SOLO sul bottone cliccato, ma entrambi restano disabilitati.
  const [pending, setPending] = React.useState<SubmitKind | null>(null);
  const loading = pending !== null;
  const canOption = can(user?.ruolo?.toLowerCase() as Role, "option.create");
  const canBooking = can(user?.ruolo?.toLowerCase() as Role, "booking.create");

  // ---- Fix race condition -------------------------------------------------
  // Tutti gli item del carrello hanno il loro settore risolto?
  // I settori sono la parte che manca di solito al reload della pagina.
  const detailsReady = React.useMemo(
    () => cart.length === 0 || cart.every((c) => sectors.some((s) => s.id === c.sectorId)),
    [cart, sectors],
  );

  // Assicura che i settori di tutte le gare nel carrello siano caricati.
  // Idempotente: se già presenti, non fa nulla (prefetchDettaglioGara è cached).
  React.useEffect(() => {
    if (cart.length === 0) return;

    const missingRaceIds = [
      ...new Set(
        cart
          .filter((c) => !sectors.some((s) => s.id === c.sectorId))
          .map((c) => Number(c.raceId))
          .filter(Number.isFinite),
      ),
    ];
    if (missingRaceIds.length === 0) return;

    let alive = true;
    Promise.all(
      missingRaceIds.map((id) =>
        prefetchDettaglioGara(id)
          .then((d) => {
            if (alive) registerSectors(id, d);
          })
          .catch(() => undefined),
      ),
    ).catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [cart, sectors, registerSectors]);

  // Safety net: se dopo N secondi i settori non sono ancora risolti
  // (es. gara cancellata), forziamo il render per non restare bloccati.
  React.useEffect(() => {
    if (cart.length === 0 || detailsReady || forcedReady) return;
    const timer = setTimeout(() => setForcedReady(true), DETAILS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [cart.length, detailsReady, forcedReady]);

  // Reset del flag quando il carrello cambia (nuovi item → rivaluta da zero).
  React.useEffect(() => {
    setForcedReady(false);
  }, [cart.length]);

  // ---- Derivate -----------------------------------------------------------
  const rows = React.useMemo(
    () =>
      cart.map((c) => {
        const race = races.find((r) => r.id === c.raceId);
        const sector = sectors.find((s) => s.id === c.sectorId);
        const price = sector?.priceTo ?? 0;
        return { ...c, race, sector, price, subtotal: price * c.qty };
      }),
    [cart, races, sectors],
  );

  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const total = rows.reduce((a, r) => a + r.subtotal, 0);
  const hasNumbered = rows.some((r) => r.sector?.numbered);

  const send = async (kind: SubmitKind) => {
    if (rows.length === 0) return;
    if (pending !== null) return;

    setPending(kind);
    try {
      const result = await submitCart({ kind, note });

      if (result.count > 0) {
        toast.success(
          kind === "option"
            ? t("cart.sent.option", { n: result.count })
            : t("cart.sent.booking", { n: result.count }),
        );
        setCustomer("");
        setNote("");
      }

      // --- NEW: PDF + upload per il booking ---
      if (kind === "booking" && result.prenotazione) {
        try {
          // const pren = result.prenotazione;
          // const b64 = await generatePdfBase64({
          //   kind: "BOOKING",
          //   lang: languageFromUser(user?.lingua),
          //   date: pren.creatoIl,
          //   number: pren.numero,
          //   rows: pren.righe.map((r) => ({
          //     date: "", // opzionale: potresti passare la data della gara
          //     race: r.gara,
          //     ticketType: r.tipologia,
          //     category: r.settore,
          //     qty: r.quantita,
          //     unitPrice: r.prezzoUnitario,
          //     total: r.totale,
          //   })),
          //   serviceFees: pren.totaleCommissioni,
          //   emailFees: 0,
          //   grandTotal: pren.totale,
          //   customer: { name: pren.cliente },
          //   user,
          //   settings: null, // vedi nota sotto
          //   t,
          // });
          // await api.uploadPrenotazionePdf(pren.id, b64);
          await sendBookingPdf(result.prenotazione);
        } catch (pdfErr) {
          console.error("[cart] PDF upload failed:", pdfErr);
          toast.error("Prenotazione creata, ma invio email/PDF non riuscito.");
        }
      }
    } catch (err) {
      console.error("[cart] submitCart failed:", err);
    } finally {
      setPending(null);
    }
  };

  // ---- Guard: skeleton finché i settori non sono pronti -------------------
  if (cart.length > 0 && !detailsReady && !forcedReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("cart.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cart.subtitle")}</p>
        </div>

        <ReadOnlyNotice />

        <Card>
          <CardContent
            className="space-y-3 p-6"
            aria-busy="true"
            aria-label={t("races.loadingDetail")}
          >
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Render normale -----------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("cart.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("cart.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ShoppingCart className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
            <Button asChild size="sm">
              <Link to="/races">{t("cart.goToRaces")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                {t("cart.lines", { n: rows.length })}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearCart} disabled={loading}>
                {t("cart.clear")}
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {/* Mobile: card per riga */}
              <div className="space-y-3 md:hidden">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{r.race?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.sector?.name} · {fmtEur(r.price)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCartItem(r.id)}
                        disabled={loading}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-24"
                        value={r.qty}
                        disabled={loading}
                        onChange={(e) =>
                          updateCartItem(r.id, { qty: Math.max(1, Number(e.target.value)) })
                        }
                      />
                      <span className="ml-auto text-sm font-semibold tabular-nums">
                        {fmtEur(r.subtotal)}
                      </span>
                    </div>
                    <Textarea
                      className="mt-2"
                      value={r.note ?? ""}
                      placeholder={t("cart.lineNote")}
                      disabled={loading}
                      onChange={(e) => updateCartItem(r.id, { note: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              {/* Desktop: tabella */}
              <div className="hidden overflow-x-auto rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.race")}</TableHead>
                      <TableHead>{t("common.sector")}</TableHead>
                      <TableHead className="w-28">{t("common.quantity")}</TableHead>
                      <TableHead>{t("cart.lineNote")}</TableHead>
                      <TableHead className="text-right">{t("common.total")}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.race?.name}</TableCell>
                        <TableCell>
                          {r.sector?.name}{" "}
                          {r.sector?.numbered && (
                            <Badge variant="secondary" className="ml-1">
                              {t("races.seatingNumbered")}
                            </Badge>
                          )}
                          <div className="text-xs text-muted-foreground">{fmtEur(r.price)}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-24"
                            value={r.qty}
                            disabled={loading}
                            onChange={(e) =>
                              updateCartItem(r.id, { qty: Math.max(1, Number(e.target.value)) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={r.note ?? ""}
                            placeholder={t("cart.lineNote")}
                            disabled={loading}
                            onChange={(e) => updateCartItem(r.id, { note: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {fmtEur(r.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCartItem(r.id)}
                            disabled={loading}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">{t("cart.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  {t("common.quantity")}: <b className="tabular-nums">{totalQty}</b>
                </span>
                <span>
                  {t("common.total")}: <b className="tabular-nums">{fmtEur(total)}</b>
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* <div className="space-y-2">
                  <Label htmlFor="cust">{t("common.customer")}</Label>
                  <Input id="cust" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                </div> */}
                <div className="space-y-2">
                  <Label htmlFor="gnote">
                    {t("cart.requestNote")} ({t("common.optional")})
                  </Label>
                  <Input
                    id="gnote"
                    value={note}
                    disabled={loading}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {t("cart.expiryInfo", { date: fmtDateOnly(optionExpiry) })}
                {hasNumbered ? ` ${t("cart.numberedHint")}` : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                {canOption && (
                  <Button
                    onClick={() => void send("option")}
                    disabled={hasNumbered || loading}
                    aria-busy={pending === "option"}
                  >
                    {pending === "option" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t("cart.submit.option")}
                  </Button>
                )}
                {canBooking && (
                  <Button
                    variant="outline"
                    onClick={() => void send("booking")}
                    disabled={loading}
                    aria-busy={pending === "booking"}
                  >
                    {pending === "booking" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t("cart.submit.booking")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
