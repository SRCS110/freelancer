-- ============================================================
--  FreelanceHub — Desktop redesign schema migration
--  Run this once in Supabase → SQL Editor (as the project owner).
--  Adds: invoice issued/paid dates + public share tokens,
--        an invoice_activity log (reminders / views / paid),
--        timer pause support on time_entries.
-- ============================================================

-- ── invoices: issued/paid dates + public share token ─────────
alter table invoices
  add column if not exists issued_at    date default current_date,
  add column if not exists paid_at      timestamptz,
  add column if not exists public_token uuid default gen_random_uuid();

-- Backfill issued_at for existing rows from created_at
update invoices set issued_at = created_at::date where issued_at is null;

-- Backfill paid_at for invoices already marked Paid (best-effort — uses
-- created_at since we have no better signal for historical rows)
update invoices set paid_at = created_at where status = 'Paid' and paid_at is null;

create unique index if not exists invoices_public_token_idx on invoices (public_token);

-- ── invoice_activity: reminders sent, client views, status changes ───
create table if not exists invoice_activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  type       text not null check (type in ('created','sent','reminder','viewed','paid','void')),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists invoice_activity_invoice_idx on invoice_activity (invoice_id, created_at desc);

alter table invoice_activity enable row level security;

-- Owner can read/write their own activity rows
drop policy if exists "invoice_activity_owner_all" on invoice_activity;
create policy "invoice_activity_owner_all" on invoice_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Public, token-gated status page support ───────────────────
-- The anon key can never read invoices/invoice_activity directly (RLS
-- blocks it). Instead, the public status page calls this SECURITY
-- DEFINER function with the invoice's public_token; it returns just the
-- fields needed for the status page and logs a 'viewed' activity row.
create or replace function public_invoice_status(token uuid)
returns table (
  invoice_number text,
  amount         numeric,
  status         text,
  due_date       date,
  issued_at      date,
  business_name  text,
  client_name    text
) security definer set search_path = public as $$
declare
  inv record;
begin
  select i.id, i.user_id, i.invoice_number, i.amount, i.status, i.due_date,
         i.issued_at, i.client_name
    into inv
    from invoices i
   where i.public_token = token;

  if not found then
    return;
  end if;

  insert into invoice_activity (user_id, invoice_id, type, note)
  values (inv.user_id, inv.id, 'viewed', 'Status page opened by client');

  return query
    select inv.invoice_number, inv.amount, inv.status, inv.due_date, inv.issued_at,
           coalesce((select s.business_name from user_settings s where s.user_id = inv.user_id), 'Invoice'),
           inv.client_name;
end;
$$ language plpgsql;

grant execute on function public_invoice_status(uuid) to anon;

-- ── time_entries: real pause/resume support ───────────────────
alter table time_entries
  add column if not exists paused_at        timestamptz,
  add column if not exists paused_total_sec integer not null default 0;

-- ── projects: optional hour budget (drives the desktop progress bars) ──
alter table projects
  add column if not exists budget_hours numeric;

-- ============================================================
--  Done. After running this, reload FreelanceHub — the desktop
--  build reads these columns directly (no further setup needed).
-- ============================================================
