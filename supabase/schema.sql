-- ============================================================
-- Keuanganku - Skema database Supabase (prefix: finance_)
-- Jalankan seluruh isi file ini di Supabase Dashboard > SQL Editor.
-- Nama tabel diberi awalan finance_ agar tidak bentrok dengan tabel lain.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabel: finance_categories
-- ------------------------------------------------------------
create table if not exists public.finance_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('income', 'expense')),
  color       text not null default '#5E9FE8',
  icon        text,
  created_at  timestamptz not null default now()
);
create index if not exists finance_categories_user_idx on public.finance_categories (user_id);

-- ------------------------------------------------------------
-- Tabel: finance_transactions
-- ------------------------------------------------------------
create table if not exists public.finance_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.finance_categories (id) on delete set null,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(14, 2) not null check (amount >= 0),
  note        text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists finance_transactions_user_idx on public.finance_transactions (user_id);
create index if not exists finance_transactions_date_idx on public.finance_transactions (user_id, date desc);

-- ------------------------------------------------------------
-- Tabel: finance_monthly_balances (saldo awal editable per bulan, 'YYYY-MM')
-- ------------------------------------------------------------
create table if not exists public.finance_monthly_balances (
  user_id         uuid not null references auth.users (id) on delete cascade,
  month           text not null,
  opening_balance numeric(14, 2) not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (user_id, month)
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_monthly_balances enable row level security;

drop policy if exists "finance_categories_owner" on public.finance_categories;
create policy "finance_categories_owner" on public.finance_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finance_transactions_owner" on public.finance_transactions;
create policy "finance_transactions_owner" on public.finance_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finance_monthly_balances_owner" on public.finance_monthly_balances;
create policy "finance_monthly_balances_owner" on public.finance_monthly_balances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- (Opsional) Kategori default otomatis untuk setiap user baru
-- ------------------------------------------------------------
create or replace function public.finance_seed_default_categories()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.finance_categories (user_id, name, type, color) values
    (new.id, 'Gaji',      'income',  '#46A171'),
    (new.id, 'Bonus',     'income',  '#4FB9C9'),
    (new.id, 'Investasi', 'income',  '#5E9FE8'),
    (new.id, 'Makan',     'expense', '#DE9255'),
    (new.id, 'Transport', 'expense', '#EAC26B'),
    (new.id, 'Belanja',   'expense', '#BF8EDA'),
    (new.id, 'Tagihan',   'expense', '#E56458'),
    (new.id, 'Hiburan',   'expense', '#DF84A8');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_finance_categories on auth.users;
create trigger on_auth_user_created_seed_finance_categories
  after insert on auth.users
  for each row execute function public.finance_seed_default_categories();
