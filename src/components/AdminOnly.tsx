import { useToStore } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import { ShieldAlert, Eye } from "lucide-react";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useToStore();
  const { t } = useI18n();
  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("bookings.adminOnly")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function ReadOnlyNotice() {
  const { isAdmin } = useToStore();
  const { t } = useI18n();
  if (!isAdmin) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-info/40 bg-info/10 p-3 text-xs text-foreground sm:text-sm">
      <Eye className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <span>{t("common.readOnly.admin")}</span>
    </div>
  );
}










