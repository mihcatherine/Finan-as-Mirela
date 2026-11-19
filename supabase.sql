-- Execute este SQL no Supabase apenas uma vez.
-- Ele adiciona as tabelas usadas pelos recursos completos da Makaria.

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, created_at timestamptz default now());
create table if not exists public.accounts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, balance numeric(14,2) default 0, created_at timestamptz default now());
create table if not exists public.transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type text not null check(type in ('income','expense','investment','transfer')), amount numeric(14,2) not null, category text not null, description text, tx_date date not null default current_date, account_id uuid references public.accounts(id) on delete set null, created_at timestamptz default now());
create table if not exists public.goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, target numeric(14,2) not null, saved numeric(14,2) default 0, due_date date, created_at timestamptz default now());
create table if not exists public.settings (user_id uuid primary key references auth.users(id) on delete cascade, salary numeric(14,2) default 0, advance_pct numeric(5,2) default 0, inss_pct numeric(5,2) default 0, assist_pct numeric(5,2) default 0, life numeric(14,2) default 0, negocial numeric(14,2) default 0, card_limit numeric(14,2) default 0, updated_at timestamptz default now());
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, icon text default '✨', name text not null, monthly_limit numeric(14,2) default 0, created_at timestamptz default now());
create table if not exists public.recurring_bills (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, amount numeric(14,2) not null, due_day integer not null default 1 check(due_day between 1 and 31), category text not null, active boolean default true, created_at timestamptz default now());
create table if not exists public.card_installments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, description text not null, total_amount numeric(14,2) not null, total_installments integer not null, current_installment integer not null default 1, installment_value numeric(14,2) not null, remaining_amount numeric(14,2) not null, next_due date, created_at timestamptz default now());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  insert into public.settings(user_id,salary,advance_pct,inss_pct,assist_pct,life,negocial,card_limit) values(new.id,0,0,0,0,0,0,0) on conflict(user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.card_installments enable row level security;

drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists "accounts own" on public.accounts;
create policy "accounts own" on public.accounts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "transactions own" on public.transactions;
create policy "transactions own" on public.transactions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "goals own" on public.goals;
create policy "goals own" on public.goals for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "settings own" on public.settings;
create policy "settings own" on public.settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "categories own" on public.categories;
create policy "categories own" on public.categories for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "recurring own" on public.recurring_bills;
create policy "recurring own" on public.recurring_bills for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "installments own" on public.card_installments;
create policy "installments own" on public.card_installments for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
