-- One-time migration: expenses + subscriptions → accounts / recurring_rules / transactions.
-- Idempotent: skips entirely if any new finance rows already exist.
-- Historical recurring occurrences are NOT expanded — last_materialized_date is set to
-- current_date so balances from _balance stay correct; only future charges materialize.

do $$
declare
  magic text[] := array[
    '_balance',
    'Weekly Budget',
    '_weekly_budget',
    '_weekly_purchase',
    '_weekly_charge',
    '_recurrence_exception',
    '_overage',
    '_hidden'
  ];
begin
  if exists (select 1 from public.accounts limit 1)
     or exists (select 1 from public.recurring_rules limit 1)
     or exists (select 1 from public.transactions limit 1)
     or exists (select 1 from public.finance_profiles limit 1) then
    raise notice 'Finance tables already have data — skipping legacy migration';
    return;
  end if;

  -- 1) _balance → Checking bank account (starting balance snapshot)
  insert into public.accounts (user_id, name, account_type, starting_balance)
  select
    e.user_id,
    'Checking',
    'bank',
    coalesce(e.amount, 0)
  from public.expenses e
  where e.category = '_balance'
    and e.user_id is not null;

  -- 2) subscriptions → monthly recurring rules
  -- Old `end` column was the next billing date.
  insert into public.recurring_rules (
    user_id,
    name,
    amount,
    is_income,
    category,
    interval_every,
    interval_unit,
    start_date,
    end_date,
    counterparty,
    last_materialized_date
  )
  select
    s.user_id,
    coalesce(nullif(trim(s.name), ''), 'Subscription'),
    abs(coalesce(s.amount, 0)),
    false,
    'subscription',
    1,
    'months',
    coalesce(s."end", current_date),
    null,
    coalesce(nullif(trim(s.name), ''), 'Subscription'),
    current_date
  from public.subscriptions s
  where s.user_id is not null;

  -- 3) Recurring expenses (have recurrence fields + end_date) → recurring_rules
  insert into public.recurring_rules (
    user_id,
    name,
    amount,
    is_income,
    category,
    interval_every,
    interval_unit,
    start_date,
    end_date,
    counterparty,
    last_materialized_date
  )
  select
    e.user_id,
    coalesce(nullif(trim(e.name), ''), 'Recurring'),
    abs(coalesce(e.amount, 0)),
    coalesce(e.income, false),
    e.category,
    greatest(coalesce(e.recurring_time, 1)::int, 1),
    case
      when lower(coalesce(
        nullif(split_part(e.recuring_length, '_', 2), ''),
        e.recuring_length
      )) in ('day', 'days') then 'days'
      when lower(coalesce(
        nullif(split_part(e.recuring_length, '_', 2), ''),
        e.recuring_length
      )) in ('week', 'weeks') then 'weeks'
      when lower(coalesce(
        nullif(split_part(e.recuring_length, '_', 2), ''),
        e.recuring_length
      )) in ('year', 'years') then 'years'
      else 'months'
    end,
    coalesce(e.date, current_date),
    e.end_date,
    coalesce(nullif(trim(e.name), ''), e.category, 'Recurring'),
    current_date
  from public.expenses e
  where e.user_id is not null
    and e.end_date is not null
    and e.recuring_length is not null
    and e.recurring_time is not null
    and (
      e.category is null
      or e.category <> all (magic)
    )
    and coalesce(e.name, '') not like 'exception:%'
    and coalesce(e.name, '') not like 'overage:%';

  -- 4) One-off dated expenses → transactions
  insert into public.transactions (
    user_id,
    name,
    amount,
    date,
    account_id,
    counterparty,
    is_income,
    category
  )
  select
    e.user_id,
    coalesce(nullif(trim(e.name), ''), 'Expense'),
    abs(coalesce(e.amount, 0)),
    e.date,
    a.id,
    coalesce(nullif(trim(e.name), ''), e.category),
    coalesce(e.income, false),
    e.category
  from public.expenses e
  left join lateral (
    select acc.id
    from public.accounts acc
    where acc.user_id = e.user_id
      and acc.account_type = 'bank'
    order by acc.id
    limit 1
  ) a on true
  where e.user_id is not null
    and e.date is not null
    and not (
      e.end_date is not null
      and e.recuring_length is not null
      and e.recurring_time is not null
    )
    and (
      e.category is null
      or e.category <> all (magic)
    )
    and coalesce(e.name, '') not like 'exception:%'
    and coalesce(e.name, '') not like 'overage:%';

  -- 5) Mark users with migrated data as onboarded (skip wizard)
  insert into public.finance_profiles (user_id, onboarded_at, last_expense_prompt_date)
  select uid, now(), null
  from (
    select user_id as uid from public.accounts
    union
    select user_id from public.recurring_rules
    union
    select user_id from public.transactions
  ) u
  on conflict (user_id) do nothing;

  raise notice 'Legacy finance migration complete';
end $$;
