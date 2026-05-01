"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, BookOpen } from "lucide-react";

// Pełna instrukcja działania dashboardu i fizyki instalacji.
// Nie streszczenie, ale rzetelne wprowadzenie dla taty / brata / dowolnego
// nowego użytkownika. Akordeon — domyślnie zwinięty.

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
            Instrukcja: jak to wszystko działa
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="pb-4 pt-1 flex flex-col gap-4 text-sm leading-relaxed text-foreground/85">
            <Section title="Twoja instalacja w 3 zdaniach">
              <p>
                <strong>1.</strong> 20 paneli na dachu zamienia światło słoneczne
                w prąd (do 7,7 kW mocy szczytowej). To co dom zużyje od razu
                (lodówka, oświetlenie, sprzęt), idzie prosto z paneli — pieniądze
                które nie poszły do PGE.
              </p>
              <p>
                <strong>2.</strong> Czego dom nie zużyje (np. w słoneczne
                południe, gdy nikogo nie ma), wpada do sieci PGE. PGE odkłada to
                jako kredyt — wartość depozytu prosumenckiego, którą odejmie od
                następnej faktury.
              </p>
              <p>
                <strong>3.</strong> Po zachodzie słońca panele odpoczywają, dom
                bierze prąd z sieci. PGE policzy zużycie po pełnej cenie taryfy
                G11, ale najpierw odejmie kredyt z depozytu. W praktyce w 2025
                płaciliśmy ~85 zł/mies. zamiast ~310 zł bez fotowoltaiki.
              </p>
            </Section>

            <Section title="Co znaczą jednostki na dashboardzie">
              <ul className="list-disc list-outside pl-5 space-y-1">
                <li>
                  <strong>W (wat)</strong> — moc chwilowa. „Panele dają 4500 W"
                  znaczy że w tej sekundzie produkują 4,5 kW.
                </li>
                <li>
                  <strong>kW (kilowat)</strong> — to samo co W, tylko ÷1000.
                  Falownik X3-Hybrid ma max 10 kW = 10 000 W.
                </li>
                <li>
                  <strong>kWh (kilowatogodzina)</strong> — energia
                  skumulowana. „Dziś +30 kWh" znaczy że przez cały dzień
                  panele wyprodukowały 30 kWh łącznie.
                </li>
                <li>
                  <strong>MWh (megawatogodzina)</strong> — to samo co kWh,
                  tylko ÷1000. Lifetime 17,7 MWh = 17 700 kWh.
                </li>
                <li>
                  <strong>PLN brutto</strong> — z VAT-em (zwykle 23%, dla
                  mikroinstalacji sprzętu 8%). Faktury PGE zawsze są brutto.
                </li>
              </ul>
            </Section>

            <Section title="Co znaczy 'bilans inwestycji'">
              <p>
                Instalacja kosztowała 40 000 zł brutto. Mój Prąd 4.0 zwrócił
                16 000 zł dotacji. <strong>Realny koszt netto: 24 000 zł.</strong>{" "}
                Tego liczbę „spłacasz" oszczędnościami i przychodami z eksportu.
                Gdy dojdzie do 24 000 zł = pełen zwrot inwestycji.
              </p>
              <p>
                Pokazujemy <strong>dwa scenariusze</strong>: <em>Realny tempo
                (PGE)</em> z faktur — pieniądze które naprawdę nie poszły do
                PGE, najbliższe prawdy. <em>Solax tempo</em> z bieżących
                pomiarów inwertera — optymistyczne, bo Solax zaniża pobór z
                sieci. Prawda zwykle blisko Realnego.
              </p>
            </Section>

            <Section title="Co znaczy 'eksport' i 'autokonsumpcja'">
              <ul className="list-disc list-outside pl-5 space-y-1">
                <li>
                  <strong>Autokonsumpcja</strong> = energia ze słońca zużyta
                  od razu w domu. Najwartościowsza forma — 1 kWh = ~1,10 zł
                  oszczędności (cena G11 brutto której nie zapłaciłeś).
                </li>
                <li>
                  <strong>Eksport do sieci (RCEm/RCE)</strong> = nadwyżka
                  oddana do PGE. Mniej wartościowa — PGE odkupuje po
                  Rynkowej Cenie Energii (~0,17–0,40 zł/kWh w 2025), 3-5×
                  taniej niż cena zakupu.
                </li>
                <li>
                  <strong>Wniosek:</strong> najlepiej zużywać prąd gdy panele
                  produkują. Włącz pralkę, zmywarkę, podgrzewacz wody w
                  południe — nie wieczorem.
                </li>
              </ul>
            </Section>

            <Section title="Co znaczy 'alarmy i błędy'">
              <p>
                Inwerter X3-Hybrid raportuje błędy do API Solax. Polling co
                15 min sprawdza i zapisuje alarmy w bazie. Sekcja „Alarmy i
                błędy" pokazuje ostatnie 30 dni. „Bez alarmów. Instalacja
                pracuje normalnie." = wszystko OK. Każdy konkretny error code
                będzie miał wyjaśnienie w przyszłej Fazie 5 (chatbot
                techniczny z RAG na manualach Solax).
              </p>
            </Section>

            <Section title="Co znaczy 'cel roczny 7000 kWh'">
              <p>
                Twoja instalacja 7,7 kWp w Ząbkach (woj. mazowieckie) powinna
                produkować ok. 1000 kWh na każdy 1 kWp rocznie ={" "}
                <strong>~7700 kWh łącznie</strong>. To uśredniona wartość dla
                Polski centralnej (mniej w pochmurne lata, więcej w słoneczne).
                Pasek statusu pokazuje stosunek <strong>projekcji końca roku</strong>{" "}
                do celu — zielony „przed planem" znaczy że według obecnego tempa
                skończysz powyżej celu, pomarańczowy „pod plan" — poniżej.
                Status przemilczany przez pierwsze 3 miesiące roku, bo solar
                jest mocno sezonowy i styczeń-luty mają niski wkład.
              </p>
            </Section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {title}
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
