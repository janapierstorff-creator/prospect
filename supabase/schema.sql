-- ProspectFuel Warteliste
-- In Supabase ausführen: SQL Editor → New query → einfügen → Run

create table if not exists public.waitlist (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  email         text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role          text not null check (role in ('eltern', 'coach', 'spieler')),
  child_age     smallint check (child_age between 6 and 25),
  name          text check (length(name) <= 120),
  club          text check (length(club) <= 160),
  sport         text check (length(sport) <= 60),
  consent       boolean not null check (consent),
  source_page   text check (length(source_page) <= 200),
  referrer      text check (length(referrer) <= 300),
  utm_source    text check (length(utm_source) <= 100),
  utm_medium    text check (length(utm_medium) <= 100),
  utm_campaign  text check (length(utm_campaign) <= 100)
);

-- Falls die Tabelle schon aus einer älteren Version existiert
alter table public.waitlist add column if not exists sport text check (length(sport) <= 60);

-- Eine E-Mail pro Rolle (doppelte Anmeldungen werden abgewiesen, die Seite zeigt trotzdem "Danke")
create unique index if not exists waitlist_email_role_key on public.waitlist (lower(email), role);

-- Row Level Security: Besucher dürfen nur eintragen, niemals lesen, ändern oder löschen
alter table public.waitlist enable row level security;

drop policy if exists "Website darf eintragen" on public.waitlist;
create policy "Website darf eintragen"
  on public.waitlist for insert
  to anon
  with check (true);

revoke all on public.waitlist from anon;
grant insert on public.waitlist to anon;

-- Praktische Auswertung: Anmeldungen pro Rolle und Seite
create or replace view public.waitlist_stats
  with (security_invoker = true) as
  select role, source_page, count(*) as anmeldungen, min(created_at) as erste, max(created_at) as letzte
  from public.waitlist
  group by role, source_page
  order by anmeldungen desc;

revoke all on public.waitlist_stats from anon, authenticated;
