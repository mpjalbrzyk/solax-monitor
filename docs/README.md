# docs/ — struktura folderów

Cały folder `docs/` jest wersjonowany w git **z wyjątkiem** czterech podfolderów które trzymają wrażliwe pliki rodziny (faktury, umowy, dane finansowe). Te są lokalne i `.gitignore`'owane.

## Co jest w gicie

- **`docs/context/`** — dokumentacja projektu (00-context, 01-strategia, 03-decisions, 04-api-spec, 05-implementation-plan, 06-tariff, 07-installation-history, 08-phase-status, project-instructions). Czyta to każdy kto wchodzi w projekt, w tym Claude Code.
- **`docs/README.md`** (ten plik) — mapa folderów.

## Co jest gitignored (lokalne tylko, nie w repo)

### `docs/source-documents/`

Faktury i dokumenty od wykonawcy instalacji + przelewy bankowe.

**Co tu wrzucić:**
- Faktura PRO-FORMA 40/2022 SunWise (28 000 zł zaliczka)
- Potwierdzenia 3 przelewów PKO BP → mBank SunWise (2022-11-28, 2023-01-31, 2023-02-22)
- Faktura końcowa VAT od SunWise (jeśli tata ma w archiwum — bo proforma to nie jest pełna faktura)
- Decyzja NFOŚiGW o przyznaniu dotacji Mój Prąd 4.0 (16 000 zł)
- Potwierdzenie wypłaty dotacji na konto rodziców
- Protokół odbioru instalacji
- Karta gwarancyjna falownika i paneli
- Koncepcja `Proj_WM7KSSe.pdf` SunWise z 2021 (już jest)

### `docs/pge-invoices/`

Faktury PGE Obrót — to z czego wyciągamy `historical_yearly_consumption`.

**Co tu wrzucić:**
- **Faktura PGE roczna 2023** (Krzysztof + Izabela, post-PV od lutego)
- **Faktura PGE roczna 2024** (cały rok PV) ← obecnie placeholder w bazie, idealne do uzupełnienia
- **Faktura PGE roczna 2025** (już znamy 4282 kWh, ale dokładny `total_cost_brutto_pln` zaktualizujemy)
- Faktury miesięczne 2023-2025 jeśli są (do `monthly_aggregates` historycznie — pozwoli zrobić Year-over-year za 2024 z prawdziwymi danymi)
- Komunikaty informacyjne PGE z cennikiem URE 2026 (już jest jako Druki-2026-energia-PGE.pdf)

### `docs/solax-pdfs/`

Manuale producenta — używane przez Fazę 5 (chatbot techniczny RAG).

**Co tu wrzucić (z solaxpower.com → Downloads):**
- X3-Hybrid-G4 User Manual EN
- X3-Hybrid-G4 Datasheet EN
- X3-Hybrid-G4 Installation Manual EN
- Battery Manual (model TBD — najpierw potwierdzić czy bateria jest, patrz O-003)

### `docs/private/`

Lokalne notatki finansowe które nie pasują nigdzie indziej.

**Co tu jest:**
- `financials.md` — kluczowe liczby (koszt instalacji, dotacja, breakdown przelewów, numery kont). Czytane przez sekcję Financial dashboardu i ROI calc.

## Jak wrzucić nowe dokumenty

1. Skanujesz dokumenty (telefon → CamScanner / Adobe Scan / iOS Notes "Skanuj") jako PDF
2. Nazywasz po polsku, opisowo: `pge-faktura-roczna-2024.pdf`, `umowa-sunwise-2022.pdf`, `dotacja-moj-prad-decyzja.pdf`
3. Wrzucasz do właściwego folderu (patrz wyżej)
4. **Mówisz mi w czacie** "Wrzuciłem `pge-faktura-roczna-2024.pdf` do `docs/pge-invoices/`" — Claude Code lokalnie ma dostęp przez `Read` tool i wyciągnie z niego dane
5. Ja wpisuję precyzyjne dane do bazy (`historical_yearly_consumption`, `monthly_aggregates`, etc.) i pchaję migrację

## Co Claude Code może wyciągnąć z faktury PGE

Z jednej rocznej faktury PGE wyciągamy do bazy:
- `consumption_from_grid_kwh` — kWh pobranych z sieci w danym roku
- `total_cost_brutto_pln` — łączna kwota zapłacona (zmienna część + opłaty stałe)
- Opcjonalnie: breakdown miesięczny jeśli faktura go pokazuje

Z faktury miesięcznej dodatkowo:
- Wpis do `monthly_aggregates.import_energy_kwh` — dokładny import za dany miesiąc
- Cena RCEm jeśli było rozliczenie net-billingu — do `tariffs.rcem_history`

## Co Claude Code może wyciągnąć z umowy SunWise

- Dokładna konfiguracja sprzętu (model paneli, model falownika, **czy bateria jest** w specyfikacji ← rozstrzyga O-003!)
- Cena instalacji netto + VAT + brutto (dokładny breakdown vs nasze obecne 24 000 zł)
- Warunki gwarancji
- Data odbioru / podłączenia do sieci

## Co NIE wrzucamy (nawet do gitignored)

- Hasła w plain text (do password manager)
- API tokens (do `.env.local` lub Vault)
- Dokumenty zawierające PESEL osób trzecich bez zgody

---

*Ostatnia aktualizacja: 30 kwietnia 2026.*
