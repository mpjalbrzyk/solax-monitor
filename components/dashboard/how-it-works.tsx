"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, BookOpen } from "lucide-react";

// Onboarding for non-technical viewers (tata, brat). Three short paragraphs
// in plain Polish — answers the implicit question "co tu się właściwie dzieje".
// Collapsed by default to not distract; one click expands.

export function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="glass">
      <CardContent className="px-4 py-0">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 text-left hover:opacity-80 transition-opacity"
          aria-expanded={open}
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            Jak to działa? — w trzech zdaniach
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="pb-4 pt-1 flex flex-col gap-3 text-sm leading-relaxed text-foreground/85">
            <p>
              <strong>1. Słońce → panele → dom.</strong> 20 paneli na dachu
              zamienia światło słoneczne w prąd. Co dom zużyje od razu (lodówka,
              komputer, oświetlenie), idzie prosto z paneli — to są pieniądze
              które nie poszły do PGE.
            </p>
            <p>
              <strong>2. Nadwyżka → sieć → kredyt.</strong> Czego dom nie
              zużyje (np. w słoneczne południe gdy nikogo nie ma w domu),
              wpada do sieci PGE. PGE odkłada ten kredyt jako wartość depozytu
              prosumenckiego — odejmie go od następnej faktury.
            </p>
            <p>
              <strong>3. Wieczór → sieć → płacisz.</strong> Po zachodzie słońca
              panele odpoczywają, a dom bierze prąd z sieci. PGE policzy zużyty
              prąd po pełnej cenie taryfy G11, ale najpierw odejmie kredyt z
              depozytu. W praktyce w 2025 płaciliście ~85 zł miesięcznie zamiast
              ~310 zł bez fotowoltaiki.
            </p>
            <p className="text-xs text-muted-foreground border-t border-zinc-200/40 pt-3">
              Dlaczego dwa numery na hero (Solax tempo / Realny tempo)? Solax
              raportuje pomiary z inwertera, ale nie liczy całego importu z
              sieci który widzi licznik PGE. Stąd w bieżących pomiarach bilans
              wychodzi optymistyczny. Realny tempo bazuje na fakturach PGE —
              pokazuje pieniądze które faktycznie nie poszły do PGE.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
