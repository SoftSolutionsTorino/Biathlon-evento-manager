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

  // Cache locale: mantiene visibile il TO selezionato anche se non è nella
  // lista caricata (paginazione, ricerca svuotata, arrivo da un'altra pagina…).
  const [selectedOperator, setSelectedOperator] = React.useState<TourOperator | null>(null);

  // Stable ref per non far ripartire il debounce ad ogni render.
  const searchRef = React.useRef(getTourOperatorsByName);
  searchRef.current = getTourOperatorsByName;

  // Ricerca server-side debounced
  React.useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const handle = setTimeout(() => searchRef.current(q), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Sincronizza `selectedOperator` quando `selectedToId` cambia (dal
  // combobox, dal log email, da localStorage…). Ordine di risoluzione:
  //   1. liste già caricate (tourOperators / tourOperatorsByName)
  //   2. selectedTOperator dallo store (fallback: set da EmailLogSection)
  //   3. previous (nessun cambio)
  React.useEffect(() => {
    if (!selectedToId) {
      setSelectedOperator(null);
      return;
    }
    setSelectedOperator((prev) => {
      if (prev && prev.id === selectedToId) return prev;

      const fromList =
        tourOperators.find((o) => o.id === selectedToId) ??
        tourOperatorsByName.find((o) => o.id === selectedToId);
      if (fromList) return fromList;

      if (selectedTOperator && selectedTOperator.id === selectedToId) {
        return selectedTOperator;
      }

      return prev;
    });
  }, [selectedToId, tourOperators, tourOperatorsByName, selectedTOperator]);

  // Lista visibile nel popover: ricerca server-side o lista completa.
  const baseList = query.trim() ? tourOperatorsByName : tourOperators;

  // Assicura che il TO selezionato compaia nella lista (con la ✓), anche
  // quando non è tra i primi risultati caricati.
  const list = React.useMemo(() => {
    if (!selectedToId || !selectedOperator) return baseList;
    if (baseList.some((o) => o.id === selectedToId)) return baseList;
    return [selectedOperator, ...baseList];
  }, [baseList, selectedToId, selectedOperator]);

  // Etichetta trigger: company → name → placeholder.
  const label = selectedOperator?.company || selectedOperator?.name || t("common.search");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between sm:w-[260px]"
          title={label}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        {/* shouldFilter={false}: il filtro avviene sul backend */}
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
