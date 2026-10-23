import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToStore, type TourOperator } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import React from "react";
import { Button } from "./ui/button";

export function ToSearchCombobox() {
  const {
    tourOperators,
    tourOperatorsByName,
    selectedToId,
    setSelectedTo,
    getTourOperatorsByName,
    selectedTOperator,
    setSelectedTOperator,
  } = useToStore();
  const { t } = useI18n();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Cache the selected operator so the trigger keeps showing it even when
  // it's not present in the currently-loaded list (pagination, search reset…).
  const [selectedOperator, setSelectedOperator] = React.useState<TourOperator | null>(null);

  // Stable ref so the debounce effect doesn't re-run on every render.
  const searchRef = React.useRef(getTourOperatorsByName);
  searchRef.current = getTourOperatorsByName;

  // Debounced server-side search
  React.useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const handle = setTimeout(() => searchRef.current(q), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Keep the cached operator in sync when selectedToId changes
  // (e.g. restored from localStorage, or set elsewhere).
  React.useEffect(() => {
    if (!selectedToId) {
      setSelectedOperator(null);
      return;
    }
    setSelectedOperator((prev) => {
      if (prev && prev.id === selectedToId) return prev;
      return (
        tourOperators.find((o) => o.id === selectedToId) ??
        tourOperatorsByName.find((o) => o.id === selectedToId) ??
        prev
      );
    });
  }, [selectedToId, tourOperators, tourOperatorsByName]);

  // If we're searching → results from the API; otherwise → full list
  const list = query.trim() ? tourOperatorsByName : tourOperators;

  // Display `company` if available, otherwise fall back to `name`,
  // otherwise the search placeholder.
  const label = selectedOperator?.company || selectedOperator?.name || t("common.search");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between sm:w-[260px]"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        {/* shouldFilter={false} because filtering happens on the backend */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={t("common.search")} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nessun risultato</CommandEmpty>
            <CommandGroup>
              {list.map((op) => (
                <CommandItem
                  key={op.id}
                  value={op.id}
                  onSelect={() => {
                    setSelectedOperator(op);
                    setSelectedTOperator(op);
                    setSelectedTo(op.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedToId === op.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{op.company || op.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
