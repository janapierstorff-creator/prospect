-- ProspectFuel Warteliste: Double-Opt-in
-- Einmal in Supabase ausführen: SQL Editor → New query → einfügen → Run
-- Ergänzt die Tabelle aus schema.sql, bestehende Einträge bleiben erhalten.

-- Sprache der Anmeldung (für die passende Mail) und Bestätigung per Link
alter table public.waitlist add column if not exists lang text not null default 'de' check (lang in ('de', 'en'));
alter table public.waitlist add column if not exists confirm_token uuid not null default gen_random_uuid();
alter table public.waitlist add column if not exists confirm_sent_at timestamptz;
alter table public.waitlist add column if not exists confirmed_at timestamptz;
create unique index if not exists waitlist_confirm_token_key on public.waitlist (confirm_token);

-- Die Edge Functions (supabase/functions) arbeiten mit der service_role
grant select, insert, update, delete on public.waitlist to service_role;

-- Auswertung: nur bestätigte Anmeldungen zählen, unbestätigte separat
drop view if exists public.waitlist_stats;
create view public.waitlist_stats
  with (security_invoker = true) as
  select role, source_page,
         count(*) filter (where confirmed_at is not null) as bestaetigt,
         count(*) filter (where confirmed_at is null)     as unbestaetigt,
         min(created_at) as erste, max(created_at) as letzte
  from public.waitlist
  group by role, source_page
  order by bestaetigt desc;

revoke all on public.waitlist_stats from anon, authenticated;
