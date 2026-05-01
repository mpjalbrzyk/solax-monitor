-- UX audit A.1: daily_aggregates dla 2025-05-06 ma yield_kwh = 678 kWh
-- co jest fizycznie niemożliwe dla instalacji 7,7 kWp (max teoretyczny ~50 kWh).
-- Drugi rekord dnia maja 2025: 39.4 kWh (2025-05-13). Estymata realna: ~39 kWh.
-- Bug pochodzi prawdopodobnie z scripts/backfill-history.mjs gdzie Solax stat
-- API mogło zwrócić sumaryczne wartości okresu zamiast pojedynczego dnia.
--
-- Naprawiamy 1 wartość. Dla pewności że to nie jest błąd dziedzinowy
-- używamy NULL zamiast guess'a — UI pokaże "brak danych" co jest uczciwsze
-- niż wymyślona liczba. Jeśli kiedyś dotrzemy do realnej wartości (np. z
-- innego źródła), zaktualizujemy.

UPDATE daily_aggregates
   SET yield_kwh = NULL,
       savings_pln = NULL,
       earnings_pln = NULL,
       cost_pln = NULL,
       net_balance_pln = NULL,
       peak_production_w = NULL,
       updated_at = NOW()
 WHERE date = '2025-05-06'
   AND yield_kwh > 100;  -- safety: only touch the bad row

-- Plus add a CHECK constraint to prevent future inserts of impossible
-- values. Daily yield > 100 kWh on 7.7 kWp is physically impossible
-- (max ~55 kWh in perfect June day with 12h sun + zero clouds).

ALTER TABLE daily_aggregates
  ADD CONSTRAINT daily_yield_sanity_check
  CHECK (yield_kwh IS NULL OR yield_kwh BETWEEN 0 AND 100);
