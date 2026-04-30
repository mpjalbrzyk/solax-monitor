# Solax Monitor — API Specification

**Cel pliku:** kompletna specyfikacja integracji z Solax Developer Portal API. Punkt referencji do implementacji Edge Function oraz Edge Functions w Supabase. Plik jest self-contained — agent który czyta ten plik (Claude Code, inny developer) nie potrzebuje dodatkowego kontekstu z innych źródeł poza pozostałymi plikami w `/mnt/project/`.

**Status:** integracja przetestowana end-to-end na żywej instalacji 29 kwietnia 2026. Wszystkie kluczowe endpointy zwracają poprawne dane. Schemat zaprojektowany 1:1 pod realne payloady.

---

## 1. Wybór API i podstawowe info

Solax udostępnia dwie ścieżki API:

**Classic Token API** (panel solaxcloud.com → Service → API): prosty Token ID + SN, query string auth, 10 req/min, 10k req/day, token wymaga ręcznego odnawiania co 3 miesiące. Dostępny w niektórych regionach, ale nie w panelu naszego konta.

**Developer Portal API** (developer.solaxcloud.com): OAuth 2.0 client_credentials, 100 req/min, 1M req/day, token TTL 30 dni, więcej endpointów. Oficjalnie rekomendowany przez Solax.

**Używamy Developer Portal.** Decyzja udokumentowana w `03-decisions.md` (D-005, D-006).

**Base URL (Global EU):** `https://openapi-eu.solaxcloud.com`

**Authentication:** OAuth 2.0, grant_type=`client_credentials` (machine-to-machine)

**Token TTL:** 30 dni (2 591 999 sekund)

**Rate limits:** 100 hits/min, 1 000 000 hits/day, 1 mld hits total cap

---

## 2. Konto i aplikacja

**Developer Portal account:** krzysztof.jalbrzykowski@gmail.com (właściciel instalacji)

**Aplikacja:** "Solax Monitor"
- App Code: `b64c796a-d03d-4595-b54c-067908c615dc`
- Description: Custom monitoring dashboard for X3-Hybrid-G4 inverter, personal use, Poland
- Created: 2026-04-30
- Callback Address: brak (nie wymagany dla client_credentials flow)
- OAuth2 Redirect URL: brak

**Service API scope (włączone, wszystkie):**
- import/export_control ✓ używamy
- Information Access Service ✓ używamy
- Data Monitoring Service ✓ używamy
- Inverter Overall Control Service (do wyłączenia w produkcji)
- Inverter Workmode Control Service (do wyłączenia)
- A1-HYB-G2 Workmode Control Service (do wyłączenia, inny model)
- Inverter Remote Control Mode Service (do wyłączenia)
- EV Charger Control Service (do wyłączenia, brak EV chargera)

Realny scope zwracany przez Solax po authenticate: `API_Telemetry_V2 API_Info_V2 API_Overall_V2 API_Workmode_V2 API_A1hyb_V2 API_Remote_V2 API_EVC_V2 RATE_CTRL`.

**Credentials:** trzymane w password managerze, w produkcji w Edge Function credentials i Supabase Vault. **NIE COMMITOWAĆ** do repo. Lokalnie do testów w `.env.local` (gitignored). Patrz `.env.example` jako template.

---

## 3. Identyfikatory naszej instalacji

Dla Twojej referencji i hardcoded values w MVP (przed multi-tenant onboarding flow):

| Field | Wartość |
|-------|---------|
| plantId | `1613529907775754244` |
| plantName | `Legionow17 Site 1` |
| inverter SN | `H34B10H7319017` |
| dongle SN (registerNo) | `SXTGG4YRYR` |
| deviceModel | `14` (X3-Hybrid-G4) |
| deviceType inverter | `1` |
| deviceType battery | `2` |
| businessType | `1` (Residential) |
| pvCapacity | 8.00 kWp |
| installDate | 2023-02-23 |
| timezone | `Europe/Warsaw` |
| latitude / longitude | 52.2912 / 21.1198 |

---

## 4. Endpointy które używamy w MVP

Z całej dokumentacji Solax Developer Portal (kilkadziesiąt endpointów) używamy ośmiu.

### 4.1 Authentication
**`POST /openapi/auth/oauth/token`** — uzyskanie access_token z Client ID i Client Secret. Token na 30 dni. Nie odnawia się automatycznie przy użyciu, trzeba ponownie wywołać ten endpoint co 25-30 dni.

Body: `application/x-www-form-urlencoded` z polami `client_id`, `client_secret`, `grant_type=client_credentials`.

Odpowiedź: `{"code":0,"result":{"access_token":"...","token_type":"Bearer","expires_in":2591999,"scope":"API_Telemetry_V2 ...","grant_type":"client_credentials"}}`.

**Specjalny przypadek:** ten jeden endpoint zwraca `code: 0` dla success. Wszystkie inne endpointy zwracają `code: 10000`. **Nie pomylcie tego w error handlingu w Edge Function.**

### 4.2 Information Management

**`GET /openapi/v2/plant/page_plant_info?businessType=1`** — lista plantów na koncie. Zwraca plantId, plantName, batteryCapacity, pvCapacity, plantTimeZone, plantAddress, longitude, latitude, electricityPriceUnit. Pierwszy call po authenticate, zapisujemy plantId do tabeli `user_inverters`.

**`GET /openapi/v2/device/page_device_info?plantId=X&deviceType=1&businessType=1`** — lista urządzeń. deviceType=1 (inverter), 2 (battery), 3 (meter), 4 (EV charger). **UWAGA: dla naszej instalacji `deviceType=2` zwraca `total: 0` — bateria nie jest zarejestrowana jako device. Patrz sekcja 7 "Quirks".**

### 4.3 Monitoring (główne źródła danych)

**`GET /openapi/v2/plant/realtime_data?plantId=X&businessType=1`** — agregowane dane plantu. Zwraca dailyYield, totalYield, dailyCharged/Discharged (battery), dailyImported/Exported (grid), dailyEarnings, totalEarnings. **To źródło dla głównego widoku dashboardu i emaili.** Polling co 5 minut.

**`GET /openapi/v2/device/realtime_data?snList=H34B10H7319017&deviceType=1&businessType=1`** — szczegółowe dane falownika. AC voltage/current/power per fazy (3 fazy dla X3), MPPT data, PV strings, gridFrequency, totalPowerFactor, inverterTemperature, gridPower, today/total Import/Export Energy. **Źródło dla wykresów technicznych i diagnostyki.** Polling co 5 minut.

**`GET /openapi/v2/device/realtime_data?snList=H34B10H7319017&deviceType=2&requestSnType=1&businessType=1`** — szczegółowe dane baterii. batterySOC, batterySOH, chargeDischargePower, batteryVoltage/Current/Temperature, batteryCycleTimes, totalDeviceCharge/Discharge. **Polling co 5 minut.** UWAGA: `deviceSn` w odpowiedzi jest pusty (`""`), bo bateria nie jest zarejestrowana jako device. Identyfikujemy zapis przez kombinację `inverter_id` + `device_type=2`.

**`POST /openapi/v2/plant/energy/get_stat_data`** — statystyki roczne lub miesięczne. dateType=1 + date jako rok ("2025") zwraca 12 podsumowań miesięcznych. dateType=2 + date jako miesiąc ("2025-09") zwraca dni miesiąca. Pola: pvGeneration, inverterACOutputEnergy, exportEnergy, importEnergy, loadConsumption, batteryCharged, batteryDischarged, earnings. **Backfill 3 lat = 3 zapytania.** Plus dzienne agregaty bieżącego miesiąca raz dziennie.

**`GET /openapi/v2/device/history_data?snList=X&deviceType=1&startTime=X&endTime=X&timeInterval=5&businessType=1`** — historyczne odczyty granularne. Limit 12 godzin per zapytanie, interwały 5/10/15/30/60 min, czas w UTC unix timestamp millisekundy. **Używamy tylko do backfillu pierwszych 30-60 dni granularnie i do ad-hoc zapytań chatbota typu "co się działo wczoraj o 14".**

### 4.4 Alarmy
**`GET /openapi/v2/alarm/page_alarm_info?plantId=X&businessType=1&alarmState=1`** — alarmy z falownika. alarmState=0 (closed), 1 (ongoing). Zwraca errorCode, alarmName, alarmType, alarmLevel (1-5), alarmStartTime/EndTime, deviceSn. **Polling co 15 minut, alerty natychmiastowe na nowe alarmy poziomu 2+.**

---

## 5. Endpointy których NIE używamy w MVP

Solax udostępnia endpointy do zdalnej kontroli falownika: zmiana trybu pracy (Self Use, Feed-in Priority, Back Up, Manual), ustawienia limitów export/import, kontrola VPP (Virtual Power Plant) z różnymi trybami, kontrola EV charger, ustawienia A1-Hybrid-G2.

**NIE używamy ich w MVP**, bo nasza aplikacja jest read-only. Zdalna kontrola wymaga dodatkowych zabezpieczeń (audit log, walidacja parametrów, rate limiting per command, two-factor confirmation dla destrukcyjnych operacji). To kolejny etap.

W produkcji SaaS może być killer feature, ale dopiero po pełnej walidacji bezpieczeństwa.

---

## 6. Konwencje znaków (UWAGA NA BUGI)

Solax używa różnych konwencji znaków dla różnych urządzeń. To częste źródło bugów.

| Pole | Źródło | Dodatnia wartość | Ujemna wartość |
|------|--------|------------------|----------------|
| `totalActivePower` | inverter | discharge (oddawanie) | charge (pobieranie) |
| `chargeDischargePower` | battery | charging (ładowanie) | discharging (rozładowanie) |
| `gridPower` | inverter (z meterem) | export do sieci | import z sieci |
| `totalActivePower` | meter | export do sieci | import z sieci |

**Strategia w naszym schemacie:** normalizujemy wszystko do jednolitej konwencji w Edge Function przed zapisem do Supabase. **Konwencja domowa: każde pole `*_power_w` ujemna = pobór, dodatnia = oddawanie**, niezależnie od źródła. Pole `bat_soc` zawsze 0-100%. W kodzie Edge Function explicit komentarz dla każdego pola w transformacji.

---

## 7. Quirks i odkrycia z naszej instalacji

Sekcja kluczowa dla każdego kto będzie pisał kod. Te quirki wyłapaliśmy podczas testów end-to-end 29 kwietnia 2026.

### 7.1 Bateria nie jest zarejestrowana jako device w API

`page_device_info?deviceType=2` zwraca pustą listę (`total: 0`). Mimo że bateria fizycznie istnieje, działa, i jest widoczna w panelu Solax Cloud w energy flow.

**Powód:** podczas instalacji w lutym 2023 monter podłączył baterię do falownika (BMS się skomunikował), ale nie przeszedł procedury rejestracji baterii jako osobne urządzenie w panelu Solax Cloud. Dla zwykłego usera nie ma znaczenia, ale dla integracji API to znaczy że bateria istnieje w wymiarze "telemetria od falownika", nie istnieje w wymiarze "device list".

**Konsekwencje:**
- `device/realtime_data?deviceType=2&requestSnType=1` zwraca dane baterii (przez SN inwertera), ale `deviceSn` w odpowiedzi jest pusty (`""`)
- `plant/realtime_data` zwraca `totalCharged: 0` i `totalDischarged: 0` zawsze (Solax agreguje plant z device list, brak baterii w device list = brak agregacji)
- Schemat Supabase: identyfikujemy zapis baterii przez `inverter_id` + `device_type=2`, NIE przez `deviceSn`
- Total charge/discharge baterii liczymy SAMI w workflow agregującym z polling co 5 min (rolling sum z chargeDischargePower)

### 7.2 Solax NIE liczy dla nas earnings

`plant/realtime_data` zwraca `dailyEarnings: 0.00` i `totalEarnings: 0.00`. `electricityPriceUnit: null`.

**Powód:** brak skonfigurowanej taryfy w panelu Solax Cloud. Nie konfigurujemy jej, bo Solax nie zna polskiej rzeczywistości (G11/G12w, godziny szczytu, RCEm, opłaty stałe).

**Konsekwencje:** całą warstwę finansową robimy 100% w naszej aplikacji. Tabela `tariffs` w Supabase, kalkulacja w Edge Function daily, agregaty w `daily_aggregates`. Solax dostarcza tylko surowych kWh, my robimy resztę.

### 7.3 Cztery różne wartości "lifetime production"

Dla Twojej instalacji 29.04.2026 wieczorem widzieliśmy:
- Panel UI Total: 17,72 MWh
- API `plant.totalYield`: 17 716,96 kWh (= 17,72 MWh)
- API `device.totalYield`: 18 144,60 kWh (= 18,14 MWh)
- API `device.totalACOutput`: 18 320,60 kWh (= 18,32 MWh)

**Interpretacja:**
- `plant.totalYield` = PV generation netto (po stratach DC)
- `device.totalYield` = PV generation surowe z trackerów MPPT
- `device.totalACOutput` = energia oddana na port AC (włącznie z rozładowaniem baterii do AC)

**Strategia dla dashboardu:** główna metryka "Produkcja" pokazuje `plant.totalYield` (najbliższe temu co user rozumie pod "produkcją"). Pole `device.totalACOutput` zapisujemy do `device_realtime_readings`, używamy w chatbocie technicznym dla edukacji ("dlaczego są różne liczby").

### 7.4 pvMap pusty gdy falownik w stanie Waiting

Gdy `deviceStatus: 100` (Waiting, np. nocą), `pvMap` zwraca pusty obiekt `{}` zamiast zer. **Edge Function musi obsłużyć tę sytuację**, nie crashować na próbie odczytu pól. Strategia: jeśli `pvMap` empty, zapisujemy null albo nie zapisujemy w ogóle pól pv*.

`mpptMap` w stanie Waiting zwraca obiekt z zerami (`MPPT1Power: 0.0`), nie pusty. Asymetria, ale fakt.

### 7.5 gridPower idle ~6W w nocy

Wieczorem (deviceStatus Waiting) zaobserwowaliśmy `gridPower: -6.0` (W). Falownik zjada ~6W z sieci na własną elektronikę. Idle consumption falownika hybrydowego jest typowy w przedziale 5-15W. **Świetna karta dla chatbota technicznego** ("ile mnie kosztuje sam falownik gdy nic nie produkuje") — ~50-100 kWh rocznie tylko na utrzymanie urządzenia.

### 7.6 Pola nieudokumentowane ale przychodzące

W payload z `device/realtime_data` dla inverter pojawiły się pola których nie ma w oficjalnej dokumentacji:
- `acFrequency1`, `acFrequency2`, `acFrequency3` — częstotliwość AC per faza (Hz)

W naszym schemacie zapisujemy też te pola do `device_realtime_readings`. Dodatkowo trzymamy całe `raw_response` jako jsonb dla future-proofing.

### 7.7 Token type "Bearer" z dużej

Solax zwraca `token_type: "Bearer"` (dużą literą), ale w request header `Authorization: bearer ...` (małą) działa tak samo. HTTP jest case-insensitive. Bezpieczny default w Edge Function: `Bearer` z dużej.

### 7.8 deviceModel = 14 dla X3-Hybrid-G4

Z dokumentacji Solax (Appendix 4) potwierdzone: `deviceModel: 14` dla X3-Hybrid-G4 w businessType=1 (Residential). Inne w mapie:
- 14: X3-Hybrid-G4 (nasz)
- 32: X3-HYB-G4 PRO
- 24: X3-IES (najnowsza linia)
- 5: X3-Hybrid-G1/G2 (starsza generacja)
- 15: X1-Hybrid-G4

---

## 8. Realne payloady z naszej instalacji (29.04.2026, 23:13 lokalny, falownik Waiting)

Te przykłady są authoritative dla projektowania schematu Supabase. Każde pole w schemacie powinno mieć odpowiednik w którymś z tych payloadów (albo w dokumentacji Solaxa).

### 8.1 Auth response

```json
{
  "code": 0,
  "result": {
    "access_token": "[REDACTED]",
    "token_type": "Bearer",
    "expires_in": 2591999,
    "scope": "API_Telemetry_V2 API_Info_V2 API_Overall_V2 API_Workmode_V2 API_A1hyb_V2 API_Remote_V2 API_EVC_V2 RATE_CTRL",
    "grant_type": "client_credentials"
  }
}
```

### 8.2 plant/page_plant_info

```json
{
  "code": 10000,
  "result": {
    "total": 1,
    "pages": 1,
    "current": 1,
    "records": [{
      "plantId": "1613529907775754244",
      "plantName": "Legionow17 Site 1",
      "loginName": "Legionow17",
      "batteryCapacity": null,
      "pvCapacity": 8.00,
      "createTime": "2023-01-12T20:36:43Z",
      "plantTimeZone": "(UTC+01:00)Sarajevo,Skopje,Warsaw,Zagreb",
      "plantState": 3,
      "plantAddress": "",
      "longitude": 21.1198,
      "latitude": 52.2912,
      "electricityPriceUnit": null
    }],
    "size": 10
  },
  "traceId": "8cc2495c-097b-4638-9aeb-4ef8518436ad.1777497430279"
}
```

### 8.3 plant/realtime_data

```json
{
  "code": 10000,
  "result": {
    "plantLocalTime": "2026-04-29 23:20:18",
    "plantId": "1613529907775754244",
    "dailyYield": 17.40,
    "totalYield": 17716.96,
    "dailyCharged": 0.00,
    "totalCharged": 0.00,
    "dailyDischarged": 0.00,
    "totalDischarged": 0.00,
    "dailyImported": 0.00,
    "totalImported": 128.55,
    "dailyExported": 0.00,
    "totalExported": 26.20,
    "dailyEarnings": 0.00,
    "totalEarnings": 0.00
  }
}
```

### 8.4 device/realtime_data?deviceType=1 (inverter)

```json
{
  "code": 10000,
  "result": [{
    "deviceStatus": 100,
    "gridPower": -6.00,
    "todayImportEnergy": 0.00,
    "totalImportEnergy": 134.50,
    "todayExportEnergy": 0.00,
    "totalExportEnergy": 25.90,
    "gridPowerM2": 0.00,
    "todayImportEnergyM2": 0.00,
    "totalImportEnergyM2": 0.00,
    "todayExportEnergyM2": 0.00,
    "totalExportEnergyM2": 0.00,
    "dataTime": "2026-04-29T21:13:45.000+00:00",
    "plantLocalTime": "2026-04-29 23:13:45",
    "deviceSn": "H34B10H7319017",
    "registerNo": "SXTGG4YRYR",
    "acCurrent1": 0.0, "acVoltage1": 0.0, "acCurrent2": 0.0, "acCurrent3": 0.0,
    "acVoltage2": 0.0, "acVoltage3": 0.0,
    "acPower1": 0, "acPower2": 0, "acPower3": 0,
    "gridFrequency": null,
    "totalPowerFactor": 1.00,
    "inverterTemperature": 0.0,
    "dailyACOutput": 17.40,
    "totalACOutput": 18320.60,
    "dailyYield": 17.90,
    "totalYield": 18144.60,
    "mpptMap": {
      "MPPT2Voltage": 0.0, "MPPT1Current": 0.0, "MPPT2Current": 0.0,
      "MPPT1Voltage": 0.0, "MPPT1Power": 0.0, "MPPT2Power": 0.0
    },
    "pvMap": {},
    "EPSL1Voltage": 0.0, "EPSL1Current": 0.0, "EPSL1ActivePower": 0,
    "EPSL2Voltage": 0.0, "EPSL2Current": 0.0, "EPSL2ActivePower": 0,
    "EPSL3Voltage": 0.0, "EPSL3Current": 0.0, "EPSL3ActivePower": 0,
    "EPSL1ApparentPower": 0, "EPSL2ApparentPower": 0, "EPSL3ApparentPower": 0,
    "l2l3Voltage": null, "l1l2Voltage": null, "l1l3Voltage": null,
    "totalReactivePower": 0,
    "totalActivePower": 0,
    "MPPTTotalInputPower": null,
    "acFrequency1": 0.0, "acFrequency2": 0.0, "acFrequency3": 0.0
  }]
}
```

### 8.5 device/realtime_data?deviceType=2&requestSnType=1 (battery)

```json
{
  "code": 10000,
  "result": [{
    "dataTime": "2026-04-29T21:13:45.000+00:00",
    "plantLocalTime": "2026-04-29 23:13:45",
    "deviceSn": "",
    "registerNo": "SXTGG4YRYR",
    "deviceStatus": 0,
    "batterySOC": 0,
    "batterySOH": 0,
    "chargeDischargePower": 0,
    "batteryVoltage": 0.0,
    "batteryCurrent": 0.0,
    "batteryTemperature": 0.0,
    "batteryCycleTimes": 0,
    "totalDeviceDischarge": 0.00,
    "totalDeviceCharge": 0.00,
    "batteryRemainings": 0.00
  }]
}
```

**TODO przed Fazą 1:** retest tych samych endpointów rano około 10:00 gdy falownik aktywny i bateria pracuje. Wynik dopisać tu jako sekcja 8.6 "Active state payloads". Z tego będzie widać jak wyglądają realne wartości MPPT, PV, AC power, battery SOC/SOH/cycle times.

---

## 9. Strategia obsługi baterii (workaround dla niezarejestrowanej baterii)

Bateria fizycznie istnieje, jest podłączona do falownika przez BMS, działa. Ale w panelu Solax Cloud nie jest zarejestrowana jako osobny device (sekcja 7.1).

**Strategia kodowa:**

1. **Polling baterii zawsze przez SN inwertera, nie SN baterii.** Endpoint `/openapi/v2/device/realtime_data?snList={INVERTER_SN}&deviceType=2&requestSnType=1&businessType=1`. Parametr `requestSnType=1` mówi Solaxowi: "daj mi baterię, ale szukaj jej przez SN inwertera, bo SN baterii nie znam".

2. **Identyfikator zapisu w Supabase** to kombinacja `(user_inverter_id, device_type=2, recorded_at)`, NIE `deviceSn`. W tabeli `device_realtime_readings` `device_sn` jest nullable.

3. **Total charge/discharge liczymy sami** w workflow agregującym `daily_aggregates`. Algorytm: każde polling co 5 min daje `chargeDischargePower` (W) — całkujemy po czasie (W × 5min/60 = Wh) i sumujemy do daily/monthly. Dodatnia wartość chargeDischargePower idzie do `battery_charged_kwh`, ujemna do `battery_discharged_kwh`.

4. **Battery capacity** trzymamy ręcznie wpisaną w `user_inverters.battery_capacity_kwh`. Wartość do potwierdzenia (sprawdzić na fizycznej baterii albo w dokumentach instalacyjnych). Domyślnie zostawiamy null.

5. **Battery model** trzymamy ręcznie wpisany w `user_inverters.battery_model` (text, nullable). Do uzupełnienia po sprawdzeniu naklejki na baterii.

6. **Dla chatbota technicznego:** dodajemy fakt do system promptu że bateria nie jest w API jako osobny device. Chatbot może to wytłumaczyć userowi i podpowiedzieć jak ewentualnie zarejestrować baterię w panelu Solax (Devices > Add Device).

**Dla future SaaS klientów:** podczas onboardingu pytamy czy mają baterię. Jeśli tak, robimy retry call do `page_device_info?deviceType=2`. Jeśli zwróci pusto, pokazujemy informację: "Twoja bateria komunikuje się z falownikiem ale nie jest zarejestrowana w Solax Cloud jako osobne urządzenie. Aplikacja będzie ciągnąć dane spod falownika przez parametr requestSnType=1. Możesz też ręcznie zarejestrować baterię w panelu Solax dla pełnej zgodności."

---

## 10. Strategia refresh tokenu w Edge Function

Wymaganie: access_token zawsze świeży (max 30 dni starości), wszystkie polling jobs używają tego samego tokenu.

**Workflow "Token Refresh"** uruchamiany cron co 25 dni o 3:00 nad ranem UTC. Wywołuje `POST /openapi/auth/oauth/token`. Zapisuje nowy access_token do Supabase do tabeli `api_credentials` z `expires_at = NOW() + INTERVAL '30 days'`. Wysyła healthcheck ping do healthchecks.io.

**Wszystkie inne workflow** (polling realtime, polling alarmy, statystyki dzienne) odczytują token z Supabase przy każdym uruchomieniu, NIE cache'ują w pamięci Edge Function. Jeśli endpoint zwrócił code 10402 (access_token wygasł niespodziewanie), Edge Function trigger force-refresh tokenu i retry.

**Bezpieczeństwo:** Client ID i Client Secret w Edge Function credentials (nie w plain text w workflow JSON). Access_token w Supabase szyfrowany at-rest (default w PostgreSQL z TDE Supabase, albo encrypted column z pgcrypto). Healthcheck alert email do mnie jeśli refresh nie powiódł się 2 razy z rzędu.

---

## 11. Kody odpowiedzi (mapa)

Z Appendix 1 dokumentacji Solax:

| Code | Znaczenie | Reakcja w Edge Function |
|------|-----------|---------------|
| 0 | Auth endpoint success | Procesujemy odpowiedź (TYLKO dla `/openapi/auth/oauth/token`) |
| 10000 | Operation successful | Procesujemy odpowiedź |
| 10001 | Operation failed | Log error, alert do admina |
| 10200 | Operation abnormality (zobacz message) | Log full response, alert |
| 10400 | Request not authenticated | Force refresh token, retry |
| 10401 | Username/password incorrect | Critical alert (credentials problem) |
| 10402 | access_token authentication failed | Force refresh token, retry |
| 10403 | No access rights | Critical alert (scope problem) |
| 10405 | API calls limit reached | Wait, retry with backoff |
| 10406 | Rate limit reached | Wait 60s, retry |
| 10500 | No device permission | Critical alert |
| 11500 | System busy | Retry with exponential backoff |

---

## 12. Schemat Supabase (finalny, na podstawie realnych payloadów)

### 12.1 Tabela `user_inverters`

```sql
CREATE TABLE user_inverters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Solax identifiers
  solax_plant_id TEXT NOT NULL UNIQUE,
  solax_inverter_sn TEXT NOT NULL,
  solax_dongle_sn TEXT NOT NULL,
  device_model INTEGER NOT NULL DEFAULT 14,
  
  -- Plant metadata
  plant_name TEXT,
  pv_capacity_kwp NUMERIC(8,2),
  battery_capacity_kwh NUMERIC(8,2),
  battery_model TEXT,
  installation_date DATE,
  plant_timezone TEXT DEFAULT 'Europe/Warsaw',
  plant_address TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_polled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_inverters_user_id ON user_inverters(user_id);
CREATE INDEX idx_user_inverters_solax_plant_id ON user_inverters(solax_plant_id);

-- RLS
ALTER TABLE user_inverters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own inverters" ON user_inverters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own inverters" ON user_inverters
  FOR ALL USING (auth.uid() = user_id);
```

### 12.2 Tabela `plant_realtime_readings`

```sql
CREATE TABLE plant_realtime_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  
  recorded_at TIMESTAMPTZ NOT NULL,  -- z plantLocalTime, ale w UTC
  plant_local_time TIMESTAMP,  -- bez TZ, jak Solax raportuje
  
  -- Yields (kWh)
  daily_yield_kwh NUMERIC(10,2),
  total_yield_kwh NUMERIC(12,2),
  
  -- Battery (kWh, aggregated by Solax = ZAWSZE 0 dla nas, patrz sekcja 9)
  daily_charged_kwh NUMERIC(10,2),
  total_charged_kwh NUMERIC(12,2),
  daily_discharged_kwh NUMERIC(10,2),
  total_discharged_kwh NUMERIC(12,2),
  
  -- Grid (kWh)
  daily_imported_kwh NUMERIC(10,2),
  total_imported_kwh NUMERIC(12,2),
  daily_exported_kwh NUMERIC(10,2),
  total_exported_kwh NUMERIC(12,2),
  
  -- Earnings (z Solaxa = ZAWSZE 0 dla nas)
  daily_earnings NUMERIC(10,2),
  total_earnings NUMERIC(12,2),
  
  raw_response JSONB,  -- full response dla audit trail i future fields
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plant_realtime_user_recorded ON plant_realtime_readings(user_id, recorded_at DESC);
CREATE INDEX idx_plant_realtime_inverter_recorded ON plant_realtime_readings(inverter_id, recorded_at DESC);

ALTER TABLE plant_realtime_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own readings" ON plant_realtime_readings
  FOR SELECT USING (auth.uid() = user_id);
```

### 12.3 Tabela `device_realtime_readings`

```sql
CREATE TABLE device_realtime_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  
  device_type SMALLINT NOT NULL,  -- 1=inverter, 2=battery
  device_sn TEXT,  -- nullable, bo dla baterii puste
  recorded_at TIMESTAMPTZ NOT NULL,
  plant_local_time TIMESTAMP,
  device_status INTEGER,  -- np. 100=Waiting, 102=Normal
  
  -- INVERTER-only fields
  ac_voltage_l1 NUMERIC(8,2),
  ac_voltage_l2 NUMERIC(8,2),
  ac_voltage_l3 NUMERIC(8,2),
  ac_current_l1 NUMERIC(8,2),
  ac_current_l2 NUMERIC(8,2),
  ac_current_l3 NUMERIC(8,2),
  ac_power_l1_w NUMERIC(10,2),
  ac_power_l2_w NUMERIC(10,2),
  ac_power_l3_w NUMERIC(10,2),
  ac_frequency_l1 NUMERIC(6,2),  -- nieudokumentowane ale przychodzi
  ac_frequency_l2 NUMERIC(6,2),
  ac_frequency_l3 NUMERIC(6,2),
  grid_frequency NUMERIC(6,2),
  total_active_power_w NUMERIC(10,2),  -- ZNORMALIZOWANE: ujemna=pobór, dodatnia=oddawanie
  total_reactive_power_var NUMERIC(10,2),
  total_power_factor NUMERIC(4,2),
  inverter_temperature_c NUMERIC(5,1),
  daily_yield_kwh NUMERIC(10,2),
  total_yield_kwh NUMERIC(12,2),
  daily_ac_output_kwh NUMERIC(10,2),
  total_ac_output_kwh NUMERIC(12,2),
  mppt_total_input_power_w NUMERIC(10,2),
  
  -- Grid power i meter (z urządzenia inverter)
  grid_power_w NUMERIC(10,2),  -- ZNORMALIZOWANE
  today_import_energy_kwh NUMERIC(10,2),
  total_import_energy_kwh NUMERIC(12,2),
  today_export_energy_kwh NUMERIC(10,2),
  total_export_energy_kwh NUMERIC(12,2),
  grid_power_m2_w NUMERIC(10,2),  -- meter 2 jeśli jest
  today_import_energy_m2_kwh NUMERIC(10,2),
  total_import_energy_m2_kwh NUMERIC(12,2),
  today_export_energy_m2_kwh NUMERIC(10,2),
  total_export_energy_m2_kwh NUMERIC(12,2),
  
  -- MPPT i PV (jsonb bo dynamiczna liczba stringów)
  mppt_data JSONB,  -- z mpptMap
  pv_data JSONB,  -- z pvMap (może być pusty {} w stanie Waiting)
  
  -- EPS (Emergency Power Supply)
  eps_l1_voltage NUMERIC(8,2),
  eps_l1_current NUMERIC(8,2),
  eps_l1_active_power_w NUMERIC(10,2),
  eps_l2_voltage NUMERIC(8,2),
  eps_l2_current NUMERIC(8,2),
  eps_l2_active_power_w NUMERIC(10,2),
  eps_l3_voltage NUMERIC(8,2),
  eps_l3_current NUMERIC(8,2),
  eps_l3_active_power_w NUMERIC(10,2),
  eps_l1_apparent_power_va NUMERIC(10,2),
  eps_l2_apparent_power_va NUMERIC(10,2),
  eps_l3_apparent_power_va NUMERIC(10,2),
  
  -- Line-to-line voltages (3-phase only)
  l1l2_voltage NUMERIC(8,2),
  l2l3_voltage NUMERIC(8,2),
  l1l3_voltage NUMERIC(8,2),
  
  -- BATTERY-only fields
  battery_soc_pct NUMERIC(5,2),
  battery_remainings_kwh NUMERIC(8,2),
  battery_soh_pct NUMERIC(5,2),
  charge_discharge_power_w NUMERIC(10,2),  -- ZNORMALIZOWANE
  battery_voltage_v NUMERIC(8,2),
  battery_current_a NUMERIC(8,2),
  battery_temperature_c NUMERIC(5,1),
  battery_cycle_times INTEGER,
  total_charge_kwh NUMERIC(12,2),
  total_discharge_kwh NUMERIC(12,2),
  
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_realtime_user_recorded ON device_realtime_readings(user_id, recorded_at DESC);
CREATE INDEX idx_device_realtime_inverter_type_recorded ON device_realtime_readings(inverter_id, device_type, recorded_at DESC);

ALTER TABLE device_realtime_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own device readings" ON device_realtime_readings
  FOR SELECT USING (auth.uid() = user_id);
```

### 12.4 Tabela `monthly_aggregates`

Z `plant/energy/get_stat_data` dla porównań YoY.

```sql
CREATE TABLE monthly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  
  month DATE NOT NULL,  -- pierwszy dzień miesiąca, np. 2025-09-01
  
  pv_generation_kwh NUMERIC(12,2),
  inverter_ac_output_kwh NUMERIC(12,2),
  export_energy_kwh NUMERIC(10,2),
  import_energy_kwh NUMERIC(10,2),
  load_consumption_kwh NUMERIC(12,2),
  battery_charged_kwh NUMERIC(10,2),
  battery_discharged_kwh NUMERIC(10,2),
  earnings NUMERIC(10,2),  -- z Solaxa = 0 dla nas, my liczymy własne
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (inverter_id, month)
);

CREATE INDEX idx_monthly_user_month ON monthly_aggregates(user_id, month DESC);

ALTER TABLE monthly_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own monthly" ON monthly_aggregates
  FOR SELECT USING (auth.uid() = user_id);
```

### 12.5 Tabela `daily_aggregates`

Codzienne agregaty wyliczane przez Edge Function `daily-aggregates` z `plant_realtime_readings` + nasze własne kalkulacje finansowe.

```sql
CREATE TABLE daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  yield_kwh NUMERIC(10,2),  -- produkcja PV
  consumption_kwh NUMERIC(10,2),  -- zużycie domu
  import_kwh NUMERIC(10,2),
  export_kwh NUMERIC(10,2),
  battery_charged_kwh NUMERIC(10,2),  -- liczone przez nas, patrz sekcja 9
  battery_discharged_kwh NUMERIC(10,2),
  self_use_kwh NUMERIC(10,2),  -- yield - export
  self_use_rate_pct NUMERIC(5,2),
  
  -- Finansowe (liczone przez nas z tabeli tariffs)
  savings_pln NUMERIC(10,2),  -- ile zaoszczędziliśmy dzięki autokonsumpcji
  cost_pln NUMERIC(10,2),  -- koszt importu z sieci
  earnings_pln NUMERIC(10,2),  -- przychód z eksportu (RCEm)
  net_balance_pln NUMERIC(10,2),  -- savings + earnings - cost
  
  -- Peak (z device_realtime_readings)
  peak_production_w NUMERIC(10,2),
  peak_consumption_w NUMERIC(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (inverter_id, date)
);

CREATE INDEX idx_daily_user_date ON daily_aggregates(user_id, date DESC);

ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own daily" ON daily_aggregates
  FOR SELECT USING (auth.uid() = user_id);
```

### 12.6 Tabela `inverter_alarms`

```sql
CREATE TABLE inverter_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  device_sn TEXT NOT NULL,
  
  error_code TEXT NOT NULL,
  alarm_name TEXT,
  alarm_type TEXT,
  alarm_level SMALLINT,  -- 1-5, 2+ wymaga alertu
  alarm_state SMALLINT NOT NULL,  -- 0=closed, 1=ongoing
  alarm_start_time TIMESTAMPTZ NOT NULL,
  alarm_end_time TIMESTAMPTZ,
  
  -- Nasze pola
  notified_at TIMESTAMPTZ,  -- kiedy wysłaliśmy alert mailowy
  notification_sent_to TEXT[],  -- lista emaili
  resolved_notes TEXT,  -- notatki użytkownika
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (inverter_id, error_code, alarm_start_time)  -- dedup
);

CREATE INDEX idx_alarms_user_state ON inverter_alarms(user_id, alarm_state);
CREATE INDEX idx_alarms_inverter_start ON inverter_alarms(inverter_id, alarm_start_time DESC);

ALTER TABLE inverter_alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own alarms" ON inverter_alarms
  FOR SELECT USING (auth.uid() = user_id);
```

### 12.7 Tabela `tariffs`

Konfiguracja taryfy energetycznej per user.

```sql
CREATE TABLE tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  
  effective_from DATE NOT NULL,
  effective_to DATE,  -- null = current
  
  -- Identyfikacja taryfy
  seller TEXT NOT NULL,  -- np. 'Tauron', 'PGE', 'Energa', 'Enea'
  tariff_code TEXT NOT NULL,  -- 'G11', 'G12', 'G12w', 'G13'
  is_net_billing BOOLEAN DEFAULT true,
  
  -- Ceny per strefa (PLN/kWh, brutto za każdą jednostkę inkluzywnie z opłatami zmiennymi)
  -- Używamy jsonb dla elastyczności (G11 ma 1 strefę, G12 ma 2, G12w ma 3)
  zones JSONB NOT NULL,  -- [{"name":"szczyt","price_pln_kwh":1.05,"hours":[7,8,9,...]},...]
  
  -- Opłaty stałe miesięczne
  fixed_handling_pln_month NUMERIC(8,2),
  fixed_distribution_pln_month NUMERIC(8,2),
  fixed_capacity_pln_month NUMERIC(8,2),
  fixed_oze_pln_month NUMERIC(8,2),
  fixed_other_pln_month NUMERIC(8,2),
  
  -- RCEm dla net-billing (PLN/MWh, aktualizowane miesięcznie)
  rcem_history JSONB,  -- [{"month":"2025-09","price_pln_mwh":287.50},...]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tariffs_user_inverter ON tariffs(user_id, inverter_id, effective_from DESC);

ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own tariffs" ON tariffs
  FOR ALL USING (auth.uid() = user_id);
```

### 12.8 Tabela `api_credentials`

```sql
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL,  -- 'solax_developer'
  app_code TEXT,  -- App Code z developer portal
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,  -- pgcrypto albo Supabase Vault
  
  access_token_encrypted TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  
  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, provider)
);

CREATE INDEX idx_api_creds_user_provider ON api_credentials(user_id, provider);

ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access own credentials" ON api_credentials
  FOR ALL USING (auth.uid() = user_id);
```

### 12.9 Tabela `documentation_chunks` (dla RAG chatbota technicznego)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documentation_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source_document TEXT NOT NULL,  -- 'X3-Hybrid-G4-User-Manual.pdf'
  source_page INTEGER,
  chunk_index INTEGER NOT NULL,
  
  content TEXT NOT NULL,
  content_metadata JSONB,  -- np. {"section":"Error Codes","model":"X3-Hybrid-G4"}
  
  embedding vector(1024),  -- Voyage AI voyage-3 default dimension
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_chunks_embedding ON documentation_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 13. Strategia backfillu

**Phase A: szybki backfill miesięczny (3 lata, ~1 minuta).** 3 zapytania do `plant/energy/get_stat_data` dla lat 2023, 2024, 2025. Zwraca 36 rekordów miesięcznych do tabeli `monthly_aggregates`. Z tego natychmiast działają porównania YoY na dashboardzie.

**Phase B: dzienny backfill bieżącego roku (~5 minut).** 4-12 zapytań do `plant/energy/get_stat_data` dla każdego miesiąca 2026 (do bieżącego). Zwraca dni miesięcy do tabeli `daily_aggregates`.

**Phase C: granularny backfill ostatnich 30 dni (~30 minut, opcjonalne).** Zapytania do `device/history_data` z 12-godzinnymi oknami × 60 okien = 60 zapytań per inverter, plus tyle samo per battery. Zapisujemy granularne 5-minutowe odczyty. Nie krytyczne dla MVP.

**Total dla MVP:** Phase A + B = ~10-15 zapytań, kilka minut. Robimy raz przy onboardingu nowego usera.

---

## 14. Procedura testowych curli (smoke test API)

Sekwencja do odpalenia w terminalu zanim zaczniesz kodować workflow w Edge Function. Potwierdza że credentials działają i że Twoja instalacja zwraca poprawne dane.

```bash
# Setup (zmienne tylko w sesji terminala, nie zapisujemy do plików)
export SOLAX_BASE_URL="https://openapi-eu.solaxcloud.com"
export SOLAX_CLIENT_ID="[z password managera]"
export SOLAX_CLIENT_SECRET="[z password managera]"

# Step 1: get access_token
curl -X POST "${SOLAX_BASE_URL}/openapi/auth/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${SOLAX_CLIENT_ID}" \
  -d "client_secret=${SOLAX_CLIENT_SECRET}" \
  -d "grant_type=client_credentials"
# Expected: { "code": 0, "result": { "access_token": "...", ... } }

export SOLAX_ACCESS_TOKEN="[z odpowiedzi powyżej]"

# Step 2: list plants
curl -X GET "${SOLAX_BASE_URL}/openapi/v2/plant/page_plant_info?businessType=1" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}"
# Expected: code 10000, plantId in records[0]

export SOLAX_PLANT_ID="[plantId z kroku 2]"

# Step 3: plant realtime
curl -X GET "${SOLAX_BASE_URL}/openapi/v2/plant/realtime_data?plantId=${SOLAX_PLANT_ID}&businessType=1" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}"
# Expected: code 10000, daily/total yield/imported/exported

# Step 4: device realtime (inverter)
curl -X GET "${SOLAX_BASE_URL}/openapi/v2/device/realtime_data?snList=H34B10H7319017&deviceType=1&businessType=1" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}"
# Expected: code 10000, AC/MPPT/PV/grid data

# Step 5: device realtime (battery)
curl -X GET "${SOLAX_BASE_URL}/openapi/v2/device/realtime_data?snList=H34B10H7319017&deviceType=2&requestSnType=1&businessType=1" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}"
# Expected: code 10000, batterySOC/SOH/power. UWAGA deviceSn będzie pusty.

# Step 6: alarmy ongoing
curl -X GET "${SOLAX_BASE_URL}/openapi/v2/alarm/page_alarm_info?plantId=${SOLAX_PLANT_ID}&businessType=1&alarmState=1" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}"
# Expected: code 10000, lista alarmów (puste records jeśli wszystko OK)

# Step 7: backfill miesięczny 2025 (proof of concept)
curl -X POST "${SOLAX_BASE_URL}/openapi/v2/plant/energy/get_stat_data" \
  -H "Authorization: Bearer ${SOLAX_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"plantId":"'${SOLAX_PLANT_ID}'","dateType":1,"date":"2025","businessType":1}'
# Expected: code 10000, 12 miesięcznych rekordów
```

---

## 15. TODO przed Fazą 1 (kodowanie aplikacji)

- [x] Wygenerować Client ID + Client Secret
- [x] Sprawdzić dokumentację endpointów w developer portal
- [x] Zrobić smoke test endpointów (auth, plant_info, plant_realtime, device_realtime inverter+battery, page_device_info battery)
- [x] Zweryfikować że odpowiedzi z Twojej instalacji są zgodne z dokumentacją (są, plus odkryliśmy quirki)
- [x] Zaprojektować schemat Supabase pod realne payloady (sekcja 12)
- [ ] Retest endpointów rano (~10:00) gdy falownik aktywny — zapisać payloady jako sekcja 8.6 "Active state payloads"
- [ ] Zrotować Client Secret (po finalnym retest, niewymagane na etapie testów)
- [ ] Założyć konta serwisów (Supabase, Vercel, Hetzner Cloud, Resend, Voyage AI)
- [ ] Zarejestrować taryfę energetyczną w pliku — patrz `06-tariff.md` (do utworzenia po dostarczeniu danych przez Michała)
- [ ] Pobrać PDF-y dokumentacji X3-Hybrid-G4 do RAG (User Manual, Error Code List, datasheet)
- [x] ~~Postawić VPS Hetzner CX22, zainstalować n8n self-hosted, skonfigurować SSL~~ — **WYCIĘTE w D-011, używamy Supabase Edge Functions**
- [ ] Stworzyć GitHub repo prywatne `solax-monitor`
- [ ] Zainstalować Claude Code w terminalu

---

*Ostatnia aktualizacja: 30 kwietnia 2026, status: API integration tested end-to-end, schema designed against real payloads, ready for Phase 1 coding.*
