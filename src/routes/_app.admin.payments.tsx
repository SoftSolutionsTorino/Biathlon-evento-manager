/**
 * Admin — Pagamenti ed emissione titoli.
 * Registrazione pagamento ed emissione dei titoli di accesso sono operazioni
 * riservate all'amministratore (specifiche cliente rev. 19/05).
 */
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Ticket } from "lucide-react";
import { useToStore, fmtEur, daysUntil, type BookingStatus } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

export const Route = createFileRoute("/_app/admin/payments")({
  component: () => (
    <AdminOnly>
      <AdminPaymentsPage />
    </AdminOnly>
  ),
});

function AdminPaymentsPage() {
  const { allBookings, tourOperators, races, sectors, convertBookingToSale } = useToStore();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();

  const rows = allBookings.filter((b) => b.status !== "cancelled" && b.status !== "issued");
  const toName = (id: string) => tourOperators.find((x) => x.id === id)?.name ?? id;
  const statusLabel = (s: BookingStatus) => t(`bookings.status.${s}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.payments.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.payments.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.summary.col.operator")}</TableHead>
                <TableHead>{t("bookings.col.customerRace")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead>{t("bookings.col.payment")}</TableHead>
                <TableHead>{t("bookings.col.due")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const r = races.find((x) => x.id === b.raceId)!;
                const s = sectors.find((x) => x.id === b.sectorId)!;
                const pct = Math.round((b.paid / b.total) * 100);
                const d = daysUntil(b.paymentDueAt);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm font-medium">{toName(b.toId)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{b.customer}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.name} — {s.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{b.qty}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="text-xs text-muted-foreground">
                        {fmtEur(b.paid)} / {fmtEur(b.total)}
                      </div>
                      <Progress value={pct} className="mt-1 h-1.5" />
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{fmtDate(b.paymentDueAt)}</div>
                      {b.status !== "paid" && (
                        <div className={`text-xs ${d <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {d <= 0 ? "—" : `${d} ${t("common.days")}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.status === "paid" ? "default" : "secondary"}>{statusLabel(b.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <PaymentDialog bookingId={b.id} remaining={b.total - b.paid} />
                        <Button
                          size="sm"
                          disabled={b.status !== "paid"}
                          onClick={() => {
                            convertBookingToSale(b.id);
                            toast.success(t("admin.payments.issued", { code: "ANT27" }));
                          }}
                        >
                          <Ticket className="mr-2 h-3.5 w-3.5" />
                          {t("bookings.issue")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {t("bookings.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentDialog({ bookingId, remaining }: { bookingId: string; remaining: number }) {
  const { registerPayment } = useToStore();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(remaining);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={remaining <= 0}>
          <Wallet className="mr-2 h-3.5 w-3.5" />
          {t("bookings.registerPayment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bookings.registerPayment")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {t("bookings.remaining")} <span className="font-semibold text-foreground">{fmtEur(remaining)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amt">{t("common.amount")} (€)</Label>
            <Input
              id="amt"
              type="number"
              min={1}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              if (amount <= 0) return;
              registerPayment(bookingId, amount);
              toast.success(t("bookings.registerPayment.done", { amount: fmtEur(amount) }));
              setOpen(false);
            }}
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
