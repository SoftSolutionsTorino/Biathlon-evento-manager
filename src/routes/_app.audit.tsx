import { createFileRoute } from "@tanstack/react-router";
import { useToStore, downloadCsv } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { audit } = useToStore();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();

  const exportCsv = () =>
    downloadCsv(`audit-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        t("audit.col.datetime"),
        t("audit.col.user"),
        "IP",
        t("audit.col.entity"),
        "ID",
        t("audit.col.action"),
        t("audit.col.details"),
      ],
      ...audit.map((a) => [a.at, a.user, a.ip, a.entity, a.entityId, a.action, a.details ?? ""]),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("audit.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
        </div>
        {/* <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          {t("common.export.csv")}
        </Button> */}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.col.datetime")}</TableHead>
                <TableHead>{t("audit.col.user")}</TableHead>
                <TableHead>{t("audit.col.action")}</TableHead>
                {/* <TableHead>{t("audit.col.details")}</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(a.at)}</TableCell>
                  <TableCell className="text-sm">{a.entity}</TableCell>
                  {/* <TableCell className="font-mono text-xs">{a.ip}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {a.entity} #{a.entityId}
                    </Badge>
                  </TableCell> */}
                  <TableCell className="text-sm font-medium">{a.action}</TableCell>
                  {/* <TableCell className="text-xs text-muted-foreground">{a.details}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
