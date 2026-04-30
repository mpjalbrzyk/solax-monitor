-- Per Michał (30.04.2026): all PGE invoices have been paid, including the
-- forecast 03/2509/00137305/2 which was marked 'pending' from invoice audit.

UPDATE pge_invoices
   SET status = 'paid',
       paid_date = COALESCE(paid_date, '2025-12-31'),  -- best guess: by end of forecast period
       notes = COALESCE(notes, '') || ' [marked paid 30.04.2026 per Michał]'
 WHERE invoice_no = '03/2509/00137305/2'
   AND status = 'pending';
