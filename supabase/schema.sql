-- Výkup Express — база заявок
-- Supabase → SQL Editor → New query → встав увесь файл → Run

-- 1. Таблиця заявок
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 120),
  phone        text not null check (char_length(phone) between 6 and 40),
  category     text not null default 'ostatni' check (category in ('zlato','auta','elektronika','luxus','ostatni','nemovitosti')),
  city         text default '' check (char_length(city) <= 80),
  description  text default '' check (char_length(description) <= 2000),
  contact_pref text default 'call' check (contact_pref in ('call','whatsapp','telegram')),
  lang         text default 'cs' check (lang in ('cs','de','ru')),
  source_page  text default '',
  photos       text[] not null default '{}' check (cardinality(photos) <= 5),
  status       text not null default 'new' check (status in ('new','contacted','offer','bought','rejected')),
  offer_price  numeric,
  note         text default '',
  details      jsonb not null default '{}'::jsonb   -- údaje z dotazníku k nemovitosti
);
-- pro už vytvořenou tabulku (bezpečné spustit znovu)
alter table public.requests add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.requests drop constraint if exists requests_category_check;
alter table public.requests add constraint requests_category_check check (category in ('zlato','auta','elektronika','luxus','ostatni','nemovitosti'));
create index if not exists requests_created_idx on public.requests (created_at desc);

-- Права для Data API (у нових проєктах Supabase їх треба видати явно)
grant usage on schema public to anon, authenticated;
grant insert on public.requests to anon;
grant select, insert, update, delete on public.requests to authenticated;
grant select, insert, update, delete on public.requests to service_role;  -- funkce pro upozornění čte poptávku

-- 2. Доступи (RLS): відвідувач сайту може тільки ДОДАТИ заявку, читати й міняти — тільки залогінена команда
alter table public.requests enable row level security;

drop policy if exists "site can insert" on public.requests;
create policy "site can insert" on public.requests
  for insert to anon
  with check (status = 'new' and offer_price is null and coalesce(note, '') = '');

drop policy if exists "team can read" on public.requests;
create policy "team can read" on public.requests for select to authenticated using (true);
drop policy if exists "team can update" on public.requests;
create policy "team can update" on public.requests for update to authenticated using (true) with check (true);
drop policy if exists "team can delete" on public.requests;
create policy "team can delete" on public.requests for delete to authenticated using (true);

-- 3. Сховище фото (приватне)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "site can upload photos" on storage.objects;
create policy "site can upload photos" on storage.objects
  for insert to anon with check (bucket_id = 'photos');

drop policy if exists "team can read photos" on storage.objects;
create policy "team can read photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos');

drop policy if exists "team can delete photos" on storage.objects;
create policy "team can delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');
