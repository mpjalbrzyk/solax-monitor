# Solax Monitor — Dokument strategiczny

**Wersja:** 1.0  
**Data:** kwiecień 2026  
**Autor:** Michał Jałbrzykowski (mpjalbrzyk)  
**Status:** Plan wdrożenia, pre-development

---

## 1. Po co ten dokument

Ten plik jest fundamentem decyzyjnym dla projektu monitoringu instalacji fotowoltaicznej, który ma zastąpić panel Solax Cloud własnym narzędziem. Powstał z konkretnej frustracji: panel producenta jest niewygodny, zaprojektowany dla instalatorów, nie dla domu. Po drugie — co istotniejsze — w polskiej fotowoltaice istnieje druga, większa luka: brak realnego wsparcia po sprzedaży. Firmy montażowe znikają, komponenty są chińskie, dokumentacja rozproszona, serwis odbija od ściany do ściany. To dokument który ma zaadresować oba problemy jednym narzędziem.

Cel końcowy: prosta strona internetowa z dashboardem, mailowymi raportami i chatbotem AI, która zna stan mojej instalacji w czasie rzeczywistym oraz całą jej dokumentację techniczną. Tak zaprojektowana, żeby tata albo brat mogli z tego korzystać bez instrukcji obsługi. Skalowalna w przyszłości na klientów firmowych z większymi instalacjami.

---

## 2. Kontekst — co mam na dziś

Falownik Solax X3-Hybrid, instalacja 8 kWp, bateria magazynująca, gwarancja aktywna do 2033. Komunikacja przez WiFi dongle, dane synchronizowane z chmurą Solax co pięć minut. Lifetime production na dziś 17,7 MWh, autokonsumpcja w okolicach 99% (czyli nadwyżki praktycznie zerowe, bardzo dobry stosunek zużycia do produkcji). Dostęp do danych przez Solax Cloud na global.solaxcloud.com plus oficjalne API z tokenem.

Limity API które mamy do dyspozycji: dziesięć zapytań na minutę, dziesięć tysięcy zapytań na dobę. Polling co pięć minut to maksymalnie 288 wywołań dziennie, czyli mamy ogromny zapas. Dane historyczne dostępne od daty pierwszej rejestracji urządzenia (luty 2023), co daje nam ponad trzy lata do backfillu na start.

---

## 3. Mapa problemów do rozwiązania

Identyfikuję dziesięć konkretnych bolączek pogrupowanych w trzy warstwy: operacyjna (codzienne życie z fotowoltaiką), finansowa (rozumienie ekonomii instalacji) i wsparcia technicznego (co robić gdy coś się psuje).

### Warstwa operacyjna

**Problem 1: brak proaktywności.** Panel Solax wymaga, żebym sam pamiętał wejść i sprawdzić. Jeśli dziś produkcja była o 30% niższa niż średnia z ostatnich siedmiu dni przy podobnej pogodzie, nikt mi tego nie powie. Anomalia, awaria, spadek wydajności panelu, cokolwiek — wszystko muszę zauważyć sam.

**Problem 2: dane są w silosie.** Jak chcę pokazać tacie albo bratu jak idzie produkcja, muszę im logować się na swoje konto. Nie ma trybu współdzielonego, nie ma uprawnień, nie ma prostego widoku rodzinnego. To ich blokuje przed jakimkolwiek zaangażowaniem.

**Problem 3: brak długoterminowych porównań.** Panel pokazuje krzywe dnia, miesiąca, roku — ale porównanie kwiecień 2026 do kwietnia 2025 wymaga eksportu do Excela i ręcznej obróbki. Nie ma natywnego porównania rok do roku, które jest najbardziej naturalnym pytaniem które chce się zadać.

**Problem 4: niska intuicyjność dla osoby starszej.** Interfejs jest gęsty, pełen wykresów, parametrów, statusów. Tata ma 60 plus, brat jest pochłonięty swoją robotą. Żaden z nich nie zacznie tego używać codziennie. Potrzebują czegoś co działa pasywnie (mail) albo konwersacyjnie (chat).

### Warstwa finansowa

**Problem 5: dane są w kWh, decyzje w PLN.** Panel pokazuje kilowatogodziny, ale moje życie odbywa się w złotówkach. Nie wiem ile dziś zaoszczędziłem, ile zapłaciłem za pobór z sieci, ile zarobiłem na nadwyżkach. Każde z tych pytań wymaga ręcznego liczenia.

**Problem 6: brak rozumienia ROI w czasie.** Inwestycja w fotowoltaikę miała się zwrócić w jakimś horyzoncie. Czy jest na trajektorii? Ile lat realnie zostało do zerowego punktu? Tego mi nikt nie liczy.

**Problem 7: brak optymalizacji decyzyjnej.** Powinienem włączyć pralkę teraz, czy za godzinę? Czy tańsze będzie naładowanie auta dziś popołudniu czy nocą z taryfy? Te pytania wymagają cross-referencji bieżącej produkcji z taryfą energetyczną. Tego panel Solax nie robi w ogóle.

### Warstwa wsparcia technicznego

**Problem 8: brak supportu po sprzedaży.** To jest największa luka rynkowa w polskiej fotowoltaice. Firmy instalacyjne często znikają albo działają na chińskich pośrednikach. Gdy pojawia się problem techniczny, klient zostaje sam z dokumentacją po angielsku albo chińsku, kodami błędów których nikt mu nie wytłumaczy, i call center które oddzwoni za tydzień.

**Problem 9: dokumentacja rozproszona.** Instrukcja obsługi falownika, datasheet, lista kodów błędów, instrukcja monitorowania, gwarancja, certyfikaty CE, schematy elektryczne — to wszystko leży w pięciu różnych PDF-ach na dysku albo w mailach. Gdy coś się dzieje, szukasz po omacku.

**Problem 10: brak personalizacji.** Forum Solax i grupy Facebook dają porady ogólne. Nikt nie wie czy w mojej konkretnej instalacji ten error oznacza problem z baterią, czy z falownikiem, czy z dongle WiFi. Potrzebuję doradcy który widzi mój current state i moją dokumentację jednocześnie.

---

## 4. Logika rozwiązania — jak adresujemy każdy problem

Architektura systemu odpowiada na każdą z bolączek konkretnym komponentem.

Problem proaktywności rozwiązuje warstwa alertów: silnik reguł w n8n, który raz dziennie liczy odchylenia od średniej kroczącej z siedmiu dni i wysyła powiadomienie mailowe gdy próg przekroczony. Plus alerty natychmiastowe na error code z falownika, krytycznie niski stan baterii, brak danych z chmury przez 30 minut.

Problem silosu rozwiązuje magic link auth w Supabase. Tata podaje email, dostaje link, klika, jest zalogowany na uproszczonym widoku. Bez haseł, bez instalacji, bez nauki nowego narzędzia.

Problem porównań rozwiązuje schemat bazy danych z natychmiastowym dostępem do dowolnego okresu i widok rok-do-roku jako jeden z domyślnych ekranów dashboardu.

Problem intuicyjności rozwiązują dwa kanały dostępu zaprojektowane pod różne typy użytkowników. Email digest dla pasywnych odbiorców (tata, brat). Chat AI dla aktywnych pytań ("ile dziś"). Dashboard webowy dla mnie i każdego kto chce kopać głębiej.

Problem PLN zamiast kWh rozwiązuje warstwa kalkulacji finansowej w bazie. Każdy odczyt z falownika jest natychmiast wzbogacany o cenę z taryfy obowiązującej w danej godzinie i strefie. Wynik trzymany jako oddzielne pole. Dashboard pokazuje obie metryki, ale finansowa jest domyślna.

Problem ROI rozwiązuje moduł długoterminowej analizy: zsumowana wartość zaoszczędzona od początku instalacji, projekcja oparta na trendzie, oszacowanie pozostałego czasu do zerowego punktu z założoną ceną instalacji jako parametr.

Problem optymalizacji decyzyjnej rozwiązuje chatbot — pyta się go "czy włączyć pralkę teraz", on patrzy na bieżącą produkcję, stan baterii, prognozę słońca i odpowiada konkretnie.

Problem supportu rozwiązuje drugi tryb chatbota: techniczny. RAG (retrieval augmented generation) na całej dokumentacji falownika, znajomość kodów błędów, dostęp do current state instalacji. Pytasz "mam error E101", on odpowiada "ten kod oznacza X w Twoim modelu falownika G4, sprawdź Y, a jeśli nie pomoże, oto kroki Z". Dokumentacja jest jego wiedzą, baza jest jego oczami.

Problem rozproszonej dokumentacji rozwiązuje vector store w Supabase pgvector. Wszystkie PDF-y wgrywane raz, indeksowane, dostępne dla chatbota i dla mnie przez prostą wyszukiwarkę.

Problem personalizacji rozwiązuje sama architektura: chatbot zawsze ma kontekst Twojego konkretnego falownika, baterii, daty instalacji, typu taryfy. Odpowiedzi nie są generyczne, są skrojone.

---

## 5. Architektura informacji

System składa się z czterech warstw, każda ma jedno jasne zadanie.

**Warstwa źródła danych** to Solax Cloud API plus dokumentacja PDF jako drugie źródło. API daje strumień bieżących i historycznych odczytów, dokumentacja daje wiedzę techniczną.

**Warstwa danych** to Supabase z bazą Postgres, autoryzacją magic link i pgvector dla embeddingów dokumentacji. Schemat trzyma odczyty energetyczne, stany baterii, alerty falownika, profile użytkowników, taryfy. Wszystko w jednej bazie, wszystko z RLS (row level security) który gwarantuje że user A nie zobaczy danych usera B — to fundament multi-tenant od dnia pierwszego.

**Warstwa logiki operacyjnej** to n8n. Robi cykliczne joby (polling Solax co pięć minut, dzienny digest finansowy, tygodniowy digest mailowy, miesięczny raport, alert engine). Wszystko jako workflow w n8n, edytowalne wizualnie, łatwe do skopiowania na innego klienta.

**Warstwa produktu** to aplikacja Next.js na Vercel. Renderuje dashboard z wykresami, obsługuje magic link login, hostuje chatbota AI w trybach operacyjnym i technicznym. Komunikuje się z Supabase przez REST API i z Anthropic API dla chatbota.

Przepływ informacji wygląda tak: Solax Cloud → n8n cron → normalizacja → Supabase → Next.js dashboard / Next.js chatbot / n8n email digest / n8n alerty.

Multi-tenant osiągnięty przez to, że token Solax i SN modułu komunikacyjnego są przechowywane szyfrowane w tabeli `user_inverters`, każdy odczyt jest zapisywany z `user_id`, RLS blokuje cross-account access. Dla mojej rodziny używamy jednego konta z wieloma użytkownikami uprawnionymi do odczytu (tata, brat). Dla klientów firmowych — osobne konta, każdy ze swoim tokenem.

---

## 6. Stack techniczny i narzędziowy

Decyzja stacku jest pragmatyczna: używamy tego co już znamy, co działa razem dobrze i co da się utrzymać przy minimalnym budżecie.

**Backend i orkiestracja:**

n8n self-hosted na Hetzner Cloud (CX22, 5 EUR miesięcznie) odpowiada za cron, polling Solax, normalizację danych, alerty i emaile. Wybór self-hosted zamiast n8n.cloud (24 EUR miesięcznie) jest oczywisty przy tej skali — nie ma sensu płacić pięciokrotnie więcej za to samo.

Supabase free tier wystarczy na pierwsze lata (500 MB bazy, 50 tysięcy aktywnych userów miesięcznie, pgvector wbudowany). Free tier daje nam też auth z magic linkami za zero złotych.

Frontend: Next.js 15 z App Router, hostowany na Vercel free tier. Tailwind CSS dla stylowania, shadcn/ui dla komponentów, Tremor albo Recharts dla wykresów. TypeScript dla bezpieczeństwa typów.

AI: Anthropic Claude API. Sonnet 4.6 albo 4.7 dla chatbota głównego, Haiku 4.5 dla prostszych operacji. Tool calling do queryowania Supabase, RAG na dokumentacji przez pgvector. Embeddings przez Voyage AI albo openAI ada (kilka groszy za całą dokumentację).

Email: Resend free tier (3000 maili miesięcznie, w domowym setupie nie wykorzystamy nawet promila).

**Narzędzia developerskie:**

Cursor albo Claude Code dla kodowania (zdecydowanie Claude Code z mojego stacku, lepiej radzi sobie z Next.js i Supabase). n8n editor dla workflow. Supabase Studio dla schematu bazy. Vercel CLI dla deploymentów. GitHub do wersjonowania kodu.

**Domena i hosting:**

Subdomena `solar.mpjalbrzyk.pl` na start (zero kosztów, używam istniejącej domeny). W przypadku komercjalizacji rejestrujemy osobną typu `okoenergii.pl` albo `domowaenergia.pl` (~100 PLN rocznie).

**Monitoring i obserwowalność:**

Healthchecks.io free tier dla cron monitoringu (czy n8n robi swoje). Sentry free tier dla error tracking w Next.js. Logi Supabase dostępne natywnie.

---

## 7. Backfill historyczny — TAK, można i trzeba

To jest jedna z najlepszych rzeczy w tym projekcie. Solax API V2 udostępnia endpointy historyczne sięgające daty pierwszej rejestracji urządzenia, co w Twoim przypadku oznacza luty 2023. Trzy lata danych do natychmiastowego importu.

Backfill robimy jednorazowym skryptem (osobny workflow w n8n albo skrypt Python uruchomiony lokalnie). Pobiera dane miesiąc po miesiącu (żeby nie przekroczyć limitu API per minute), wsadza do Supabase. Czas wykonania: kilka godzin. Wynik: od dnia uruchomienia aplikacja ma kompletne porównania rok do roku, długoterminowe trendy, ROI wyliczony od początku.

Dane historyczne nie wymagają dokładności minutowej (Solax i tak agreguje stare dane do interwałów godzinnych albo dziennych). Te trzy lata są dla nas wartościowe jako kontekst i porównanie, nie jako precyzyjny zapis. Bieżące dane (od momentu uruchomienia n8n) lecą co pięć minut z pełną granularnością.

---

## 8. Plan wdrożenia w fazach

Cały projekt jest podzielony na osiem faz. Łączny czas pracy szacuję na 6-7 dni roboczych przy tempie z Claude Code, plus dwa dni na content case study. Można rozłożyć na cztery weekendy albo zrobić sprintem w dwa tygodnie.

**Faza 0: Discovery i setup** (pół dnia)

Zbieram dokumenty (token Solax, SN dongle, model falownika, dane taryfy, PDF-y dokumentacji). Rejestruję konta (Supabase, Vercel, Hetzner, Resend, Anthropic API). Stawiam VPS, instaluję n8n. Konfiguruję domenę i SSL.

**Faza 1: Pipeline danych** (1 dzień)

Schemat bazy w Supabase (tabele `users`, `user_inverters`, `energy_readings`, `battery_readings`, `inverter_alerts`, `tariffs`, `daily_aggregates`). Workflow w n8n: cron co pięć minut, fetch Solax API, transformacja, upsert do Supabase. Test na żywych danych przez 24 godziny.

**Faza 2: Backfill historyczny** (pół dnia)

Skrypt importujący trzy lata danych. Walidacja, sprawdzenie integralności. Pierwsze ad-hoc query w Supabase Studio żeby zobaczyć że wszystko siedzi.

**Faza 3: Dashboard webowy** (2-3 dni)

Setup Next.js 15, Supabase client, magic link auth. Strona główna z live view (bieżąca produkcja, zużycie, bateria). Strona dziennego widoku z wykresem produkcja vs zużycie. Strony tygodnia, miesiąca, roku do roku. Strona finansowa z ROI i podsumowaniem oszczędności. Responsywny design, dark mode, polski język.

**Faza 4: Chatbot AI operacyjny** (1 dzień)

Komponent czatu w Next.js (proste UI, lista wiadomości, input). Backend route który woła Claude API z tool definitions. Tools: `getCurrentStatus`, `getDailyProduction`, `getMonthlyComparison`, `getFinancialSummary`, `getBatteryState`, `getYearOverYear`. Każdy tool to query do Supabase. Test pytań typu "ile dziś", "porównaj kwiecień do marca", "powinienem włączyć pralkę".

**Faza 5: Chatbot AI techniczny z RAG** (1 dzień)

Wgrywanie PDF-ów dokumentacji do Supabase Storage. Pipeline embeddings (chunking, embedding przez Voyage AI, zapis wektorów do pgvector). Drugi tryb chatbota który dodaje retrieval do tool calling. Tools rozszerzone o `searchDocumentation`, `getInverterErrorCodes`, `lookupTechnicalSpec`. Test pytań typu "co znaczy E101", "jak zresetować falownik", "kiedy wymienić baterię".

**Faza 6: Email digest i alerty** (pół dnia)

Workflow w n8n: tygodniowy digest w poniedziałek 7:00, miesięczny pierwszego dnia miesiąca 8:00. HTML template generowany dynamicznie z danymi. Wysyłka przez Resend. Alert engine: cron co godzinę liczy odchylenia, threshold violations idą natychmiast mailem.

**Faza 7: Multi-tenant i polish** (1 dzień)

Dodanie taty i brata jako oddzielnych userów z ograniczonymi uprawnieniami. Test cross-account. Drobne poprawki UI/UX. Onboarding flow dla nowego usera (dodawanie tokenu Solax, konfiguracja taryfy). Dokumentacja README dla projektu.

**Faza 8: Case study content** (równolegle, 2 dni)

Artykuł na blog mpjalbrzyk.pl z architekturą, screenami i fragmentami kodu. Krótki film YouTube (10-15 minut) demo plus opowieść. Post na LinkedIn jako teaser. Drugi post po dwóch tygodniach z liczbami "ile zaoszczędziłem". Opcjonalnie: open source repo z boilerplate'em.

---

## 9. Rozpiska kosztów

### Koszty jednorazowe

Praktycznie zero. Wykorzystujemy istniejące zasoby (domena, znajomość stacku, Claude Code już kupiony jako część subskrypcji). Jedyny koszt jednorazowy to czas: 6-7 dni roboczych plus 2 dni content. Wycena tego czasu zależy od Twojej stawki — przy stawce freelance powiedzmy 800 PLN/dzień to równowartość 6400-7200 PLN, ale to nie jest cash out, to alokacja Twojego czasu.

Ewentualne dodatki: nowa domena (~100 PLN rok jeśli idziemy w komercjalizację), płatne ikony albo template'y (zero, używamy darmowych).

### Koszty miesięczne running

Hetzner Cloud CX22 dla n8n: 5 EUR (~22 PLN)  
Supabase free tier: 0 PLN  
Vercel Hobby: 0 PLN  
Resend free tier: 0 PLN  
Anthropic Claude API: 10-30 PLN (zależnie od użycia chatbota, dla rodziny ~100-200 zapytań miesięcznie)  
Voyage AI embeddings: 0 PLN (jednorazowy embedding dokumentacji, mieści się w free tier)  
Healthchecks.io free: 0 PLN  
Sentry free: 0 PLN  
Domena: ~10 PLN/m (jeśli nowa)

**Suma miesięczna: 32-62 PLN** w zależności od użycia chatbota i czy używamy nowej domeny.

To jest dosłownie cena dwóch kaw miesięcznie. Dla porównania — jeden klient z fotowoltaiką który zapłaci 200 PLN za audyt swojej instalacji pokrywa pół roku running cost.

### Koszty rozwoju (jeśli idziemy w produkt)

Jeśli za rok chcesz zrobić z tego SaaS dla 100 klientów (każdy ze swoją instalacją), koszty rosną liniowo:

Supabase Pro: 25 USD/m (powyżej free tier limitu)  
Anthropic API przy 100 klientach: 200-500 PLN/m  
n8n workers (skalowanie): może +10 EUR/m  
Domena premium: bez zmian

**Run rate przy 100 klientach: ~600-900 PLN/m.** Przy 49 PLN abonamencie = 4900 PLN przychodu, 4000+ PLN marży. Skalowanie ma sens.

---

## 10. Skalowanie z domowego do firmowego

Architektura jest multi-tenant od dnia pierwszego, więc skalowanie to głównie warstwa biznesowa, nie techniczna.

Domowy use case (3-5 osób w rodzinie, jedna instalacja): zerowy koszt, wszystko na free tier, jedno konto z wieloma userami.

Firmowy use case (firma z farmą fotowoltaiczną, biuro z dachem PV, gospodarstwo rolne z dużą instalacją): wielokrotnie więcej paneli, kilku użytkowników z różnymi rolami (admin, księgowa, kierownik), potrzeba raportów do księgowości w PDF, integracja z BaseLinker albo systemem ERP klienta. To wszystko jest zaadresowalne w naszym stacku — n8n robi PDF, integruje się z czymkolwiek, Supabase obsługuje role i uprawnienia.

Dodatkowy moduł firmowy: comiesięczne PDF generowane automatycznie z podsumowaniem produkcji, kosztów, korzyści podatkowych. Wysyłane mailem do księgowej klienta. To jest dosłownie kolejny n8n workflow.

Inny moduł firmowy: alerty SLA. Jeśli firma ma fotowoltaikę produktywną, awaria kosztuje godzinami przestoju. Alert na SMS plus email plus telefon do dyżurnego — to wszystko n8n potrafi.

---

## 11. Ryzyka i pytania otwarte

**Ryzyko 1: zmiana API Solax.** Producent może zmienić strukturę odpowiedzi albo politykę dostępu. Mitigation: trzymamy raw response w Supabase obok znormalizowanego, w razie zmian mamy z czego odbudować.

**Ryzyko 2: rate limiting.** 10000 zapytań/dzień brzmi dużo, ale przy 100 klientach z polling co pięć minut to 28800 zapytań — przekroczenie. Mitigation: każdy klient ma swój token, limit jest per token. Skala działa.

**Ryzyko 3: dokumentacja Solax po angielsku.** Chatbot techniczny będzie odpowiadał po polsku, ale źródło to dokumenty po angielsku. Mitigation: Claude radzi sobie z tłumaczeniem na żywo, ale dla pewności robimy jednorazowo polską wersję key documents (instrukcja obsługi, lista kodów błędów). To nie jest blokujące.

**Ryzyko 4: kwestie prawne przy komercjalizacji.** Sprzedaż dostępu do dashboardu który czyta cudze API może rodzić pytania. Mitigation: każdy klient sam podaje swój token, my tylko zarządzamy aplikacją. Klasyczny SaaS pattern.

### Pytania do rozstrzygnięcia przed startem

Czy idziemy multi-tenant od dnia pierwszego (rekomenduję tak) czy zaczynamy single-user i refaktorujemy później?

Czy chatbot ma być dostępny w trybie publicznym (każdy może wejść i pytać o dokumentację Solax X3-Hybrid bez logowania) czy tylko dla zalogowanych użytkowników? Pierwszy wariant to potencjalny lead magnet, drugi to większa kontrola.

Czy email weekly digest wysyłamy też w wersji "dla taty" (uproszczonej, bez technicznych liczb) czy jednym formatem dla wszystkich?

Hosting n8n: Hetzner DE (taniej, EU-friendly, RODO ok) czy polski VPS (bliżej, ale droższy o 30-50%)?

Domena: subdomena mpjalbrzyk.pl czy osobna marka od początku?

---

## 12. Definicja sukcesu

Projekt uznajemy za zakończony i udany kiedy:

Dane z mojej instalacji są w Supabase, aktualne co pięć minut, plus trzyletni backfill kompletny.

Mam dashboard pod adresem URL, otwiera się szybko, pokazuje wszystkie kluczowe widoki bez bugów.

Tata albo brat wszedł na dashboard przez magic link, użył go, i nie zadał mi pytania jak to działa.

Chatbot operacyjny odpowiada poprawnie na minimum dziesięć typowych pytań ("ile dziś", "porównaj miesiąc", "stan baterii").

Chatbot techniczny odpowiada poprawnie na minimum pięć typowych pytań technicznych ("co znaczy ten kod", "jak zresetować", "kiedy serwis").

Email tygodniowy przyszedł poprawnie przez cztery tygodnie z rzędu.

Powstał artykuł case study na blog plus film YouTube (nawet krótki), które generują pierwsze leady freelance.

To są kryteria mierzalne, sprawdzalne, niezależne. Każde z nich albo jest, albo go nie ma.

---

## 13. Co dalej

Po zatwierdzeniu tego dokumentu, kolejne kroki w tej kolejności:

Wrzucenie wszystkich dokumentów Solax (PDF instrukcji, datasheet, dokumentacja API) do mnie do dalszej analizy.

Wygenerowanie tokenu API w Solax Cloud i przekazanie SN dongle.

Spisanie szczegółów taryfy energetycznej (sprzedawca, taryfa godzinowa, ceny w strefach, opłaty stałe, czy net-billing czy net-metering).

Decyzja na dwa pytania otwarte (multi-tenant od początku, hosting Hetzner czy lokalny).

Po tym przechodzimy do Fazy 0 i Fazy 1, czyli setupu i pierwszego pipeline'u danych. Realnie pierwszy działający odczyt na Supabase możemy mieć w 4-6 godzin pracy.

---

*Koniec dokumentu strategicznego. Dokument towarzyszący "Solax Monitor — Case Study" pokazuje jak ten projekt opowiedzieć światu zewnętrznemu (klientom freelance, czytelnikom bloga, oglądającym YouTube).*
