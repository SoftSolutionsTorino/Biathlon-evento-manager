import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, ShoppingCart } from "lucide-react";
import { useToStore, fmtEur, fmtDateOnly } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    optionExpiry,
  } = useToStore();
  const { t } = useI18n();
  const [customer, setCustomer] = React.useState("");
  const [note, setNote] = React.useState("");

  const canOption = can(user?.ruolo?.toLowerCase() as Role, "option.create");
  const canBooking = can(user?.ruolo?.toLowerCase() as Role, "booking.create");

  const rows = cart.map((c) => {
    const race = races.find((r) => r.id === c.raceId);
    const sector = sectors.find((s) => s.id === c.sectorId);
    const price = sector?.priceTo ?? 0;
    return { ...c, race, sector, price, subtotal: price * c.qty };
  });

  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const total = rows.reduce((a, r) => a + r.subtotal, 0);
  const hasNumbered = rows.some((r) => r.sector?.numbered);

  const send = async (kind: "option" | "booking") => {
    if (rows.length === 0) return;
    if (kind === "booking" && !customer.trim()) {
      toast.error(t("cart.customerRequired"));
      return;
    }
    const n = await submitCart({ kind, customer, note });
    if (n > 0) {
      toast.success(
        kind === "option" ? t("cart.sent.option", { n }) : t("cart.sent.booking", { n }),
      );
      setCustomer("");
      setNote("");
    }
  };

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
              <Button variant="ghost" size="sm" onClick={clearCart}>
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
                      <Button variant="ghost" size="icon" onClick={() => removeCartItem(r.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-24"
                        value={r.qty}
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
                            onChange={(e) => updateCartItem(r.id, { note: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {fmtEur(r.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeCartItem(r.id)}>
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
                  {t("common.seats")}: <b className="tabular-nums">{totalQty}</b>
                </span>
                <span>
                  {t("common.total")}: <b className="tabular-nums">{fmtEur(total)}</b>
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cust">{t("common.customer")}</Label>
                  <Input id="cust" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gnote">
                    {t("cart.requestNote")} ({t("common.optional")})
                  </Label>
                  <Input id="gnote" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>

              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {t("cart.expiryInfo", { date: fmtDateOnly(optionExpiry) })}
                {hasNumbered ? ` ${t("cart.numberedHint")}` : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                {canOption && (
                  <Button onClick={() => void send("option")} disabled={hasNumbered}>
                    {t("cart.submit.option")}
                  </Button>
                )}
                {canBooking && (
                  <Button variant="outline" onClick={() => void send("booking")}>
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
