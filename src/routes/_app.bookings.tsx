
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import {
  useToStore,
  fmtEur,
  daysUntil,
  type BookingStatus,
  type Booking,
  Role,
} from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { generatePdf } from "@/lib/pdf";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Ruolo } from "@/lib/api";

export const Route = createFileRoute("/_app/bookings")({
  component: BookingsPage,
});

const VARIANT: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "outline",
  partially_paid: "secondary",
  paid: "default",
  cancelled: "destructive",
  issued: "secondary",
};

function BookingsPage() {
  const { bookings, races, sectors, cancelBooking, user, tourOperators, currentToId } =
    useToStore();
  const { t, lang } = useI18n();
  const { fmtDate, fmtDateOnly } = useFormatters();
  const [filter, setFilter] = React.useState<"all" | BookingStatus>("all");
  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);
  const operatorName = tourOperators.find((x) => x.id === currentToId)?.name ?? "";

  const role = user?.ruolo.toLowerCase() as Role;
  /** PDF di richiesta o conferma d'ordine (Bestellformular). */
  const downloadPdf = (b: Booking) => {
    const r = races.find((x) => x.id === b.raceId)!;
    const s = sectors.find((x) => x.id === b.sectorId)!;
    const confirmed = b.status !== "pending_payment";
    const file = generatePdf({
      kind: confirmed ? "BOOKING_CONFIRM" : "BOOKING_REQUEST",
      lang,
      number: `BKG-${b.id.toUpperCase()}`,
      operator: operatorName,
      rows: [
        {
          date: fmtDateOnly(r.date),
          race: r.name,
          sector: s.name,
          category: s.priceCategory,
          qty: b.qty,
          unitPrice: s.priceTo,
          total: b.total,
        },
      ],
      total: b.total,
      extra: [
        [t("common.customer"), b.customer],
        [t("bookings.col.due"), fmtDateOnly(b.paymentDueAt)],
        [t("bookings.col.payment"), `${fmtEur(b.paid)} / ${fmtEur(b.total)}`],
      ],
    });
    toast.success(t("pdf.generated", { file }));
  };

  const actions = (b: Booking) => {
    const closed = b.status === "issued" || b.status === "cancelled";
    const canCancel =
      !closed &&
      ((b.paid === 0 && can(role, "booking.cancelUnpaid")) || can(role, "booking.cancelPaid"));
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => downloadPdf(b)}>
          <FileDown className="mr-2 h-3.5 w-3.5" />
          {b.status === "pending_payment" ? t("pdf.request") : t("pdf.confirm")}
        </Button>
        {canCancel && (
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
                  onClick={() => {
                    cancelBooking(b.id);
                    toast.success(t("bookings.cancelled"));
                  }}
                >
                  {t("bookings.cancel.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!closed && !canCancel && role === "to" && b.paid > 0 && (
          <span className="self-center text-xs text-muted-foreground">
            {t("bookings.adminOnly")}
          </span>
        )}
      </div>
    );
  };

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
              {t("common.all")} ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="pending_payment">
              {t("bookings.status.pending_payment")}
            </TabsTrigger>
            <TabsTrigger value="partially_paid">{t("bookings.status.partially_paid")}</TabsTrigger>
            <TabsTrigger value="paid">{t("bookings.status.paid")}</TabsTrigger>
            <TabsTrigger value="issued">{t("bookings.status.issued")}</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* --- vista mobile a schede --- */}
      <div className="space-y-3 md:hidden">
        {filtered.map((b) => {
          const r = races.find((x) => x.id === b.raceId)!;
          const s = sectors.find((x) => x.id === b.sectorId)!;
          const pct = Math.round((b.paid / b.total) * 100);
          return (
            <Card key={b.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.customer}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.name} — {s.name}
                    </div>
                  </div>
                  <Badge variant={VARIANT[b.status]}>{t(`bookings.status.${b.status}`)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("common.seats")}: <span className="font-medium text-foreground">{b.qty}</span>{" "}
                  · {fmtEur(b.paid)} / {fmtEur(b.total)}
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="text-xs text-muted-foreground">
                  {t("bookings.col.due")}: {fmtDate(b.paymentDueAt)}
                </div>
                {actions(b)}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("bookings.empty")}
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- vista desktop a tabella --- */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("bookings.col.customerRace")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead>{t("bookings.col.payment")}</TableHead>
                <TableHead>{t("bookings.col.due")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const r = races.find((x) => x.id === b.raceId)!;
                const s = sectors.find((x) => x.id === b.sectorId)!;
                const pct = Math.round((b.paid / b.total) * 100);
                const d = daysUntil(b.paymentDueAt);
                const closed = b.status === "issued" || b.status === "cancelled";
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{b.customer}</div>
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
                      {!closed && b.status !== "paid" && (
                        <div
                          className={`text-xs ${d <= 0 ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANT[b.status]}>{t(`bookings.status.${b.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{actions(b)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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
