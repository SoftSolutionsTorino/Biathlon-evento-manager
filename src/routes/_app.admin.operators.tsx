import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useToStore } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

export const Route = createFileRoute("/_app/admin/operators")({
  component: () => (
    <AdminOnly>
      <OperatorsPage />
    </AdminOnly>
  ),
});

function OperatorsPage() {
  const {
    tourOperators,
    toggleOperatorEnabled,
    setPartnerDiscount,
    sendInvite,
    getTourOperatorsByName,
    tourOperatorsByName,
  } = useToStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  const rows = q ? tourOperatorsByName : tourOperators;

  console.log(tourOperatorsByName);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.operators.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.operators.subtitle")}</p>
      </div>

      <Input
        onChange={(e) => {
          setQ(e.target.value);
          getTourOperatorsByName(e.target.value);
        }}
        placeholder={t("common.search")}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="px-10 pt-2">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.operators.col.name")}</TableHead>
                <TableHead>{t("admin.operators.col.company")}</TableHead>
                <TableHead>{t("admin.operators.col.type")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                {/* <TableHead className="text-right">{t("admin.operators.col.plafond")}</TableHead>
                <TableHead className="text-center">{t("admin.operators.col.discount")}</TableHead> */}
                <TableHead className="text-center">{t("admin.operators.col.enabled")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="font-medium">{o.company}</TableCell>
                  <TableCell>
                    <Badge variant={o.type === "FanClub" ? "secondary" : "outline"}>{o.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.email}</TableCell>
                  {/* <TableCell className="text-right text-sm">{fmtEur(o.plafond)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={o.partnerDiscount}
                        onChange={(e) => setPartnerDiscount(o.id, Number(e.target.value))}
                        onBlur={() => toast.success(t("admin.operators.discount.updated", { pct: o.partnerDiscount }))}
                        className="h-8 w-20 text-right"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </TableCell> */}
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={o.enabled}
                        onCheckedChange={() => toggleOperatorEnabled(o.id)}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {o.enabled ? t("admin.operators.enabled") : t("admin.operators.disabled")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!o.enabled}
                        onClick={() => {
                          sendInvite(o.id);
                          toast.success(t("admin.operators.invite.sent", { email: o.email }));
                        }}
                      >
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        {t("admin.operators.invite")}
                      </Button>
                      {/* <Button
                        size="sm"
                        onClick={() => {
                          // setCurrentTo(o.id);
                          toast.success(t("admin.operators.impersonating", { name: o.name }));
                          navigate({ to: "/" });
                        }}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        {t("admin.operators.impersonate")}
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
