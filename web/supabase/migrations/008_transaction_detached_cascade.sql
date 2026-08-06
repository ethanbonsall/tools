-- Detached occurrence overrides + delete rule cascades to its transactions

alter table public.transactions
  add column if not exists detached boolean not null default false;

comment on column public.transactions.detached is
  'True when user edited this occurrence; ignore future recurring rule field changes';

alter table public.transactions
  drop constraint if exists transactions_recurring_rule_id_fkey;

alter table public.transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id)
  references public.recurring_rules(id)
  on delete cascade;
