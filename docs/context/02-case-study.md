# Domowy strażnik energii — Case Study

**Projekt:** Solax Monitor  
**Format:** prezentacja produktu / dowód konceptu  
**Autor:** Michał Jałbrzykowski (mpjalbrzyk)  
**Data:** kwiecień 2026

---

## Hook — fotowoltaika w Polsce

Polska ma ponad milion mikroinstalacji fotowoltaicznych. Większość właścicieli zna to uczucie: przed instalacją wszystko jest zajebiste, telefony co godzinę, doradcy super pomocni, montaż w trzy dni. Po instalacji telefony przestają odbierać. Coś nie działa? Napisz mailem, oddzwonimy w przyszłym tygodniu. Error na falowniku? Oto link do PDF po angielsku. Reklamacja gwarancyjna? Komponenty są chińskie, czekaj sześć miesięcy.

Ten case study pokazuje jak zbudowałem narzędzie które adresuje obie strony tej luki: codzienną wygodę monitorowania własnej instalacji oraz dziurę po stronie wsparcia technicznego. Zrobiłem to dla siebie, swojej rodziny, i z myślą że każdy z fotowoltaiką w Polsce mógłby tego potrzebować.

---

## Persona — komu to ma służyć

**Michał (ja, 28 lat):** prosumer, freelancer, tech-savvy. Chcę widzieć dane w dobrym dashboardzie, dostawać raporty automatycznie, móc zadać pytanie chatbotowi i dostać odpowiedź. Bez konieczności logowania się na panel producenta co dwa dni.

**Tata (60+):** użytkownik pasywny. Nie wejdzie na panel Solaxa, ale otworzy email który mu przyjdzie raz w tygodniu. Może zadać proste pytanie chatbotowi przez przeglądarkę jeśli interfejs jest dosłownie jak SMS-y.

**Brat (30+):** pomiędzy pasywnym a aktywnym. Otworzy dashboard raz w miesiącu żeby zobaczyć ile się oszczędziło. Ale dziennego zaangażowania nie da.

**Klient firmowy (drugi etap):** firma z większą instalacją (kilkadziesiąt do kilkuset paneli), biuro z dachem PV, gospodarstwo rolne. Potrzebuje raportów do księgowości, alertów SLA, integracji z istniejącym ERP albo BaseLinker. Płaci 49-199 PLN miesięcznie za to żeby nie dłubać w panelach producenta.

---

## Problem — trzy warstwy bolączek

Bolączki tego rynku rozkładają się na trzy poziomy.

Pierwszy to **codzienne zarządzanie**. Panele producentów (Solax, Huawei, SolarEdge, Fronius) są zaprojektowane dla instalatorów, nie dla domu. Dane są w kilowatogodzinach, nie w złotówkach. Brak proaktywnych powiadomień. Brak porównań rok do roku w jednym kliknięciu. Brak prostego trybu współdzielonego dla rodziny.

Drugi to **finansowy ślepy zaułek**. Inwestycja zwraca się w X lat, ale ile dokładnie zostało? Ile zaoszczędziłem w marcu vs marcu zeszłego roku? Ile kosztuje mnie to, że ładuję auto wieczorem zamiast po południu? Te pytania wymagają Excela i godziny pracy.

Trzeci, najboleśniejszy, to **brak supportu**. Firmy montażowe pojawiają się i znikają. Komponenty są chińskie. Dokumentacja techniczna leży w pięciu różnych PDF-ach po angielsku. Gdy wyskakuje error code, użytkownik jest sam. Forum, grupa Facebookowa, telefony do call center w Częstochowie. To rzeczywistość. Polska potrzebuje narzędzia które wypełnia tę lukę.

---

## Rozwiązanie — trzy filary

Nazwijmy to roboczo "domowy strażnik energii" (working title, finalny brand do ustalenia). Trzy filary funkcjonalne.

### Filar 1: Web dashboard

Strona internetowa pod własnym adresem. Otwierasz, widzisz: ile teraz produkujesz, ile zużywasz, ile masz w baterii. Wykres dzienny, tygodniowy, miesięczny, rok do roku. Sekcja finansowa: ile zaoszczędziłeś w tym miesiącu, ile zapłaciłeś za pobór z sieci, jaki masz ROI od początku instalacji.

Logowanie magic linkiem (wpisujesz email, dostajesz link, klikasz, jesteś w środku — bez haseł). Tata wchodzi na uproszczonym widoku, ja na pełnym, klient firmowy na widoku z księgowymi raportami.

### Filar 2: Email digest i alerty

Pasywne dostarczanie wiedzy. Tygodniowy raport w poniedziałek rano: ile w zeszłym tygodniu, najlepszy dzień, porównanie do średniej. Miesięczny raport pierwszego dnia miesiąca: bilans całego miesiąca plus rok-do-roku. Alerty natychmiastowe gdy coś się dzieje: błąd falownika, krytycznie niski stan baterii, brak danych z chmury.

Nie musisz wchodzić na dashboard żeby wiedzieć co się dzieje. Mail przychodzi sam. Tata otwiera, widzi liczby, wie że wszystko gra.

### Filar 3: Chatbot AI w dwóch trybach

**Tryb operacyjny:** rozmawiasz o swojej instalacji.

> *"Ile dziś wyprodukowaliśmy?"*  
> *"Do tej pory 23,4 kWh, słońce zachodzi za 2 godziny, prawdopodobnie zatrzymamy się na 28 kWh. Średnia z ostatnich 7 dni to 31 kWh."*

> *"Powinienem włączyć pralkę teraz?"*  
> *"Tak, produkcja wynosi 4,1 kW, wystarczy z zapasem. Bateria pełna w 87%."*

> *"Porównaj kwiecień do marca."*  
> *"W marcu wyprodukowałeś 412 kWh, w kwietniu do dziś 378 kWh przy 22 dniach. Trajektoria miesięczna to 515 kWh, czyli +25%. Wiosna robi swoje."*

**Tryb techniczny:** rozmawiasz o swoim sprzęcie.

> *"Falownik pokazuje E101, co to znaczy?"*  
> *"E101 w Twoim modelu X3-Hybrid-G4 to alarm Grid Voltage Out of Range, czyli napięcie sieciowe poza tolerancją. Możliwe przyczyny: niestabilna sieć w Twojej okolicy, problem z bezpiecznikiem, luźne połączenie. Pierwsze co bym sprawdził to czy alarm pojawia się o stałej porze (sugeruje sieć) czy losowo (sugeruje sprzęt). Jeśli powtarza się codziennie po 18, prawdopodobnie sieć — zgłaszasz operatorowi. Jeśli losowo, robimy reset miękki: trzymasz przycisk power przez 10 sekund, czekasz 5 minut, włączasz."*

> *"Kiedy powinienem wymienić baterię?"*  
> *"Twoja bateria była zainstalowana w lutym 2023, czyli ma 3 lata 2 miesiące. Liczba cykli dla Twojego modelu wynosi około 6000 do 80% kapacitetu, a Ty wykonałeś jak dotąd ~1100 cykli. Realny czas do degradacji do 80%: 12-15 lat przy obecnym tempie."*

Chatbot zna mój falownik, moje dane, moją dokumentację. Odpowiedzi nie są generyczne, są skrojone pod moją konkretną instalację. To jest różnica między poradą z forum a poradą od kogoś kto siedzi obok mnie.

---

## Pod maską — jak to działa

Architektura w trzech warstwach.

Solax Cloud co pięć minut wysyła dane o produkcji, zużyciu, stanie baterii. n8n self-hosted (na małym VPS-ie za 22 PLN miesięcznie) ściąga te dane, normalizuje, zapisuje do bazy Supabase. Ta sama instancja n8n robi cykliczne raporty mailowe i alerty.

Strona z dashboardem to Next.js na Vercel — czyta z Supabase, renderuje wykresy, obsługuje login magic linkiem. Chatbot to ta sama strona, tylko inny endpoint — pyta Claude API, który ma zdefiniowane narzędzia (tools) do queryowania bazy. Model nie zgaduje danych, tylko pyta bazę przez funkcje typu `getDailyProduction`, `getCurrentStatus`. Każda odpowiedź jest oparta na realnych danych, halucynacje wyeliminowane.

Tryb techniczny chatbota dodaje RAG — vector store z dokumentacją PDF falownika. Pytanie typu "co znaczy E101" odpala wyszukiwanie semantyczne w dokumentacji, wyciąga relewantne fragmenty, podaje modelowi jako kontekst. Plus current state z bazy. Plus persona "jesteś technikiem fotowoltaiki, znasz X3-Hybrid jak własną kieszeń". Output: odpowiedź skrojona pod moje urządzenie.

Stack całkowicie standardowy, niczego się nie wymyśla. Zaleta: każdy junior developer to ogarnie, każdy klient może to dostać do utrzymania, koszt serwerów = cena dwóch kaw miesięcznie.

---

## Skalowanie — od domu do firmy

Architektura jest multi-tenant od dnia pierwszego, więc skalowanie to głównie warstwa biznesowa.

Wersja domowa: jedno konto, jedna instalacja, kilku użytkowników (rodzina). Koszt run rate to dosłownie 30-60 PLN miesięcznie. Idealne dla każdego prosumera w Polsce.

Wersja firmowa: każdy klient ma swój token, swoją instalację, swoich użytkowników z rolami. Dodatkowo: comiesięczne PDF raportów dla księgowości, alerty SLA na SMS-y dyżurnego, integracja z BaseLinker albo zewnętrznym ERP. To wszystko jest dostępne w naszym stacku, bo n8n potrafi zintegrować się z czymkolwiek.

Wersja produktowa (SaaS, jeśli idziemy w komercjalizację): 49 PLN miesięcznie dla domu, 199 PLN dla firmy. Run rate przy 100 klientach to ~700 PLN/m, przychód przy 100 klientach domowych to 4900 PLN. Marża zdrowa.

---

## Dlaczego to w ogóle ma sens biznesowo

Pierwsza myśl każdego: "ale przecież to robią inni". I tak, są zagraniczne narzędzia (Sense, Solar Analytics, Enphase Enlighten dla Enphase). Po polsku z chatbotem AI po polsku który zna polską specyfikę (ceny RCEm, taryfy G11/G12, net-billing) — nie ma nic. A klientów tak jak wspomniałem, ponad milion w Polsce.

Druga myśl: "ale klienci nie zapłacą". Otóż statystyczna miesięczna oszczędność z auto-konsumpcji w mojej instalacji to ~150-300 PLN. Narzędzie które pomaga wyciągnąć z tego dodatkowe 5-10% (przez optymalizację typu "włącz pralkę teraz, nie wieczorem") zwraca się w pierwszym miesiącu. Nie mówiąc o tym że alert na awarię który zaoszczędzi tydzień przestoju oszczędza 50-100 PLN dziennie.

Trzecia myśl: "ale serwis Solaxa już to robi". Nie robi. Solax Cloud wysyła emaile tylko o krytycznych awariach. Nie robi analiz finansowych, nie ma chatbota, nie zna polskich taryf. To jest dosłownie surowy panel dla instalatora.

---

## Plan content i dystrybucja

Projekt sam w sobie wartość ma, ale prawdziwa siła leży w opowiedzeniu jak powstał. Plan content output:

**Artykuł na blog mpjalbrzyk.pl:** "Jak zbudowałem własny system monitoringu fotowoltaiki w 7 dni z n8n, Supabase i Claude API". Architektura, decyzje, fragmenty kodu, screeny dashboardu. ~3000 słów. SEO pod hasła "monitoring fotowoltaiki", "n8n fotowoltaika", "alternatywa Solax Cloud".

**Film YouTube (10-15 minut):** demo na żywo dashboardu, demo chatbota (oba tryby), opowieść jak powstało, jakie błędy popełniłem, ile czasu zajęło. Style: w moim klimacie, casual, no-bullshit.

**Post LinkedIn:** teaser z dwoma screenami, link do filmu i artykułu. Hook: "Polski rynek fotowoltaiki ma milion klientów i zero narzędzi po polsku z AI. Postanowiłem to zmienić, na początek dla siebie."

**Post follow-up za dwa tygodnie:** twarde liczby. "Po 14 dniach z moim systemem: zauważyłem anomalię w produkcji 3 dni wcześniej niż normalnie zauważyłbym sam. Zaoszczędziłem X PLN dzięki przekierowaniu zużycia na godziny szczytowej produkcji."

**Open source repo:** boilerplate na GitHub. Schemat Supabase, workflow n8n jako JSON, kod Next.js. README po polsku. To trafia do każdego dewelopera w Polsce który ma fotowoltaikę i kompetencje techniczne. Część z nich to potencjalni klienci na full-service wdrożenie u kogoś w rodzinie.

---

## Definicja sukcesu — prywatna i publiczna

**Prywatna (mierzona za miesiąc):**

Mam dashboard pod własnym URL, działa codziennie. Tata albo brat użył chociaż raz bez pytania jak to działa. Tygodniowy mail przychodzi punktualnie. Chatbot odpowiada poprawnie na 80% moich pytań.

**Publiczna (mierzona za trzy miesiące):**

Artykuł na blogu ma minimum 500 unikalnych odwiedzin. Film YouTube ma minimum 1000 wyświetleń. Posty LinkedIn generują minimum 50 leadów (komentarze, DM-y typu "interesuje mnie to dla mojej instalacji"). Z tych leadów konwertuje się minimum 2 na płacących klientów freelance albo 5 na zapisy do listy oczekujących na produkt.

**Strategiczna (mierzona za rok):**

Albo z tego wychodzi produkt SaaS z minimum 50 płacącymi klientami (~2500 PLN MRR), albo to zostaje killer case study w portfolio mpjalbrzyk i przyciąga większe projekty freelance (jeden klient AI/automation rocznie wyceniany na 30-50k PLN). Każdy z tych scenariuszy jest sukcesem.

---

## Co potem

Jeśli MVP się sprawdzi i ludzie zaczną dawać sygnały że chcą tego dla siebie, kolejne rozszerzenia w kolejce:

Wsparcie dla innych marek falowników: Huawei FusionSolar API, SolarEdge API, Fronius API. Każdy to kolejne kilka dni roboty żeby dorzucić.

Mobilna aplikacja: PWA na start (Next.js już to obsługuje), w drugim etapie natywna iOS/Android jeśli będzie popyt.

Smart home integration: Home Assistant, Apple HomeKit, Google Home. Otrzymujesz powiadomienia w swoim ulubionym ekosystemie.

Marketplace integracji: ktoś chce, żebyśmy raport miesięczny wpychali do jego systemu księgowego, ktoś chce alert do Slacka, ktoś chce SMS-y. Każda integracja to workflow w n8n, otwiera market.

Asystent zakupowy: "stary, mam 8 kWp, dobudować mi 4 kWp czy raczej drugą baterię?". Chatbot patrzy na profil zużycia, liczy ROI obu opcji, podpowiada. To staje się narzędzie nie tylko monitoringu, ale też doradztwa.

---

## Zakończenie

Ten projekt to przede wszystkim odpowiedź na własną frustrację. Mam fotowoltaikę, mam panel producenta który mi się nie podoba, mam stack techniczny żeby zbudować coś lepszego, i mam realny problem rynkowy do rozwiązania. To jest dokładnie konfiguracja w której najlepiej się buduje rzeczy: prywatne wkurzenie plus publiczna luka plus narzędzia w ręku.

Plan jest klarowny, koszty znikome, czas wykonania w zasięgu jednego sprintu, ścieżka do komercjalizacji otwarta. Pozostaje tylko wykonać.

---

*Towarzyszący dokument "Solax Monitor — Strategia" zawiera szczegółową architekturę techniczną, plan wdrożenia w fazach, rozpiskę kosztów i lista pytań do rozstrzygnięcia przed startem.*
