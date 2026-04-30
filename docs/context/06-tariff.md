# Solax Monitor — Konfiguracja taryfy

**Cel pliku:** kompletna konfiguracja taryfy energetycznej dla instalacji w Ząbkach. Używana przez n8n workflow "Daily Aggregates" do liczenia savings_pln, cost_pln, earnings_pln. Wgrywana do tabeli `tariffs` w Supabase przy onboardingu.

**Status danych:** **VERIFIED** na podstawie realnej faktury PGE z 16 marca 2026 (faktura nr 03/2603/10663516/00000001) plus komunikat informacyjny PGE z 6 marca 2026 z cennikiem URE 2026.

---

## 1. Podstawowe info

| Field | Value | Source |
|-------|-------|--------|
| Adres instalacji | Legionów 17, 05-091 Ząbki | faktura PGE |
| Nabywca (umowa) | Krzysztof Jałbrzykowski + Izabela Jałbrzykowska | faktura PGE |
| Sprzedawca | **PGE Obrót S.A.** (Rzeszów, NIP 813-02-68-082) | faktura PGE |
| Operator dystrybucji (OSD) | PGE Dystrybucja S.A. | komunikat PGE |
| Numer klienta PGE | **10663516** | faktura PGE |
| Numer PPE | **590543570401506181** | faktura PGE |
| Numer licznika | **13931416** | faktura PGE |
| Taryfa | **G11** (jednostrefowa, całodobowa) | faktura PGE |
| Status prosumencki | **Net-billing** | faktura PGE |
| Tryb rozliczeń | Sumaryczne godzinowe bilansowanie od 1.04.2022 (Ustawa OZE 29.10.2021) | faktura PGE |
| Data podpięcia PV | 2023-02-23 | confirmed |

---

## 2. Cennik 2026 — REALNE stawki z faktury PGE

Ceny z faktury 03/2603/10663516/00000001 wystawionej 2026-03-16, prognoza na 2026-03-01 do 2026-04-30.

### Część zmienna (PLN/kWh)

| Składowa | Netto PLN/kWh | Brutto PLN/kWh (VAT 23%) |
|----------|---------------|--------------------------|
| Energia całodobowa (G11) | **0,5032** | 0,6189 |
| Opłata sieciowa zmienna całodobowa | **0,3469** | 0,4267 |
| Opłata jakościowa | **0,0332** | 0,0408 |
| Opłata kogeneracyjna | **0,003** | 0,0037 |
| Opłata OZE | **0,0073** | 0,0090 |
| **SUMA ZMIENNA** | **0,8936** | **1,0991** |

**Akcyza:** 5 zł/MWh = 0,005 PLN/kWh (z komunikatu PGE str. 2). Doliczana do brutto.

### Część stała (PLN/miesiąc)

| Składowa | Netto PLN/m-c | Brutto PLN/m-c |
|----------|---------------|-----------------|
| Opłata sieciowa stała (układ 3-faz) | **9,98** | 12,28 |
| Opłata przejściowa (>1200 kWh) | **0,33** | 0,41 |
| Opłata mocowa (>2800 kWh, 2026) | **24,05** | 29,58 |
| Opłata abonamentowa | **0,75** | 0,92 |
| **SUMA STAŁA** | **35,11** | **43,18** |

**Średnia cena brutto wszystko w jednym (z faktury):** **1,22 PLN/kWh** przy 714 kWh prognozy 2-miesięcznej. To jest punkt referencyjny dla naszych kalkulacji.

### VAT
- Stawka VAT na energię: **23%** (od 2024)
- Akcyza: 5 PLN/MWh

---

## 3. Historyczne RCEm — REALNE z faktury PGE 2025-2026

Z drugiej strony PDF, sekcja "Rozliczenie wartości energii wprowadzonej do sieci".

| Miesiąc | RCEm PLN/kWh | RCEm PLN/MWh | Wolumen (kWh) |
|---------|--------------|---------------|----------------|
| 2025-07 | 0,28483 | 284,83 | 387 |
| 2025-08 | 0,21468 | 214,68 | 500 |
| 2025-09 | 0,27971 | 279,71 | 352 |
| 2025-10 | 0,34084 | 340,84 | 134 |
| 2025-11 | 0,38288 | 382,88 | 35 |
| 2025-12 | 0,46608 | 466,08 | 1 |
| 2026-01 | 0,55196 | 551,96 | 0 |
| 2026-02 | 0,33901 | 339,01 | 52 |

**Suma 2025-07 do 2026-02:** wprowadzono 1461 kWh, wartość depozytu 483,62 PLN.

**Z 2023:** mamy 12 miesięcy z arkusza brata, suma wprowadzenia = 3169 kWh za 1370,91 PLN.

**Brakuje:** RCEm dla okresu 2024-01 do 2025-06 (18 miesięcy luki). Dociągniemy z PSE (https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej).

**Workflow n8n "Update RCEm":** cron raz miesięcznie 5. dnia o 8:00, ściąga ze strony PSE, parsuje HTML, appenduje do `tariffs.rcem_history`.

---

## 4. Realne dane zużycia z faktury — punkt odniesienia

Dane pomiarowe z licznika 13931416 (z faktury PGE).

### Pobór z sieci (2025-09 do 2026-02)

| Data odczytu | Pobór kWh w miesiącu |
|--------------|----------------------|
| 2025-09-30 | 244 |
| 2025-10-31 | 377 |
| 2025-11-30 | 454 |
| 2025-12-31 | 578 |
| 2026-01-31 | 583 |
| 2026-02-28 | 447 |

### Wprowadzenie do sieci (2025-09 do 2026-02)

| Data | Wprowadzenie kWh |
|------|------------------|
| 2025-09-30 | 352 |
| 2025-10-31 | 134 |
| 2025-11-30 | 35 |
| 2025-12-31 | 1 |
| 2026-01-31 | 0 |
| 2026-02-28 | 52 |

**Łącznie 2025: zużyto z sieci 4282 kWh** (z PDF: "Ilość energii zużytej w roku 2025: 4282 kWh"). Vs 2023: 4073 kWh, **wzrost 5%**. Wprowadzenie 2025-07 do 2026-02: 1461 kWh za 483,62 PLN. Vs 2023: 3169 kWh — **autokonsumpcja znacząco się poprawiła** (mniej eksportu = więcej własnego zużycia z PV i baterii).

---

## 5. Format dla bazy Supabase (SQL insert)

```sql
INSERT INTO tariffs (
  user_id,
  inverter_id,
  effective_from,
  seller,
  tariff_code,
  is_net_billing,
  zones,
  fixed_handling_pln_month,
  fixed_distribution_pln_month,
  fixed_capacity_pln_month,
  fixed_oze_pln_month,
  fixed_other_pln_month,
  rcem_history
) VALUES (
  '[USER_UUID]',
  '[INVERTER_UUID]',
  '2026-01-01',
  'PGE Obrót',
  'G11',
  true,
  -- G11 ma jedną strefę "całodobowa". Suma zmienna brutto: 1,0991 PLN/kWh
  '[{"name":"calodobowa","price_brutto_pln_kwh":1.0991,"hours":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"days_of_week":[0,1,2,3,4,5,6]}]'::jsonb,
  0.92,    -- abonamentowa brutto
  12.28,   -- sieciowa stała 3-faz brutto
  29.58,   -- mocowa brutto (>2800 kWh)
  0,       -- OZE jako stała = 0
  0.41,    -- przejściowa brutto
  '[
    {"month":"2023-01","price_pln_mwh":596.56},
    {"month":"2023-02","price_pln_mwh":668.51},
    {"month":"2023-03","price_pln_mwh":508.90},
    {"month":"2023-04","price_pln_mwh":505.44},
    {"month":"2023-05","price_pln_mwh":381.44},
    {"month":"2023-06","price_pln_mwh":454.62},
    {"month":"2023-07","price_pln_mwh":439.22},
    {"month":"2023-08","price_pln_mwh":412.33},
    {"month":"2023-09","price_pln_mwh":404.82},
    {"month":"2023-10","price_pln_mwh":329.25},
    {"month":"2023-11","price_pln_mwh":378.97},
    {"month":"2023-12","price_pln_mwh":304.63},
    {"month":"2025-07","price_pln_mwh":284.83},
    {"month":"2025-08","price_pln_mwh":214.68},
    {"month":"2025-09","price_pln_mwh":279.71},
    {"month":"2025-10","price_pln_mwh":340.84},
    {"month":"2025-11","price_pln_mwh":382.88},
    {"month":"2025-12","price_pln_mwh":466.08},
    {"month":"2026-01","price_pln_mwh":551.96},
    {"month":"2026-02","price_pln_mwh":339.01}
  ]'::jsonb
);
```

---

## 6. Algorytm kalkulacji finansowej (n8n workflow "Daily Aggregates")

```javascript
// Pseudo-code dla n8n Function node, codziennie o 1:00 dla każdej instalacji

const tariff = await getActiveTariff(inverterId, date);
const pricePerKwhBrutto = tariff.zones[0].price_brutto_pln_kwh; // 1.0991 dla G11

// SAVINGS: ile zaoszczędziliśmy dzięki autokonsumpcji
const savingsPln = self_use_kwh * pricePerKwhBrutto;

// COST: ile zapłaciliśmy za import z sieci
const costPln = import_kwh * pricePerKwhBrutto;

// EARNINGS: ile zarobiliśmy na eksporcie (RCEm dla bieżącego miesiąca)
const monthStr = date.toISOString().slice(0, 7); // "2026-04"
const rcemEntry = tariff.rcem_history.find(r => r.month === monthStr);
const rcemPerKwh = rcemEntry ? rcemEntry.price_pln_mwh / 1000 : 0;
const earningsPln = export_kwh * rcemPerKwh;

// NET BALANCE
const netBalancePln = savingsPln + earningsPln - costPln;
```

**Opłaty stałe** rozliczamy w `monthly_aggregates`, nie daily. Łącznie ~43,18 PLN/m-c brutto = **518,16 PLN/rok** stałych opłat za bycie podłączonym do sieci.

---

## 7. Historia zużycia (długoterminowy trend)

Dane do tabeli `historical_yearly_consumption`.

| Rok | Pobór z sieci (kWh) | Koszt łączny brutto (PLN) | Źródło |
|-----|---------------------|---------------------------|--------|
| 2015 | 5766 | brak | arkusz brata |
| 2016 | 5731 | brak | arkusz |
| 2017 | 6715 | 4018 | arkusz |
| 2018 | 5508 | 3330 | arkusz |
| 2019 | 6665 | 3926 | arkusz |
| 2020 | 6151 | 4017 | arkusz |
| 2021 | 6016 | 4144 | arkusz |
| 2022 | 5122 | 3736 | arkusz |
| 2023 | 4073 | 2727 (po net-billing) | arkusz, **PV od lutego** |
| 2025 | **4282** | brak (faktura kwartalna) | **z PGE** |

**Spadek po PV (2022→2023): -20% poboru, -27% kosztu.** Dla case study mocna karta marketingowa.

Schemat tabeli:

```sql
CREATE TABLE historical_yearly_consumption (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  consumption_from_grid_kwh NUMERIC(10,2),
  total_cost_brutto_pln NUMERIC(10,2),
  notes TEXT,
  PRIMARY KEY (inverter_id, year)
);
```

---

## 8. Status walidacji i TODO

- [x] Analiza arkusza Excel brata (29.04.2026)
- [x] **Walidacja realną fakturą PGE marzec 2026** ✅
- [x] Identyfikacja sprzedawcy (PGE Obrót S.A.)
- [x] Identyfikacja taryfy (G11)
- [x] Status net-billing potwierdzony
- [x] **Realne ceny brutto 2026** wstawione
- [x] RCEm 2023 (12 mies.) + 2025-07 do 2026-02 (8 mies.) = 20 miesięcy w `rcem_history`
- [x] Numer klienta PGE, PPE, numer licznika zapisane
- [ ] RCEm 2024-01 do 2025-06 (18 miesięcy) — dociągnąć z PSE
- [ ] Workflow "Update RCEm" zaimplementowany w n8n
- [ ] SQL insert wykonany w Supabase po onboardingu

---

*Ostatnia aktualizacja: 30 kwietnia 2026, status: VERIFIED na bazie faktury PGE 03/2603/10663516/00000001.*
