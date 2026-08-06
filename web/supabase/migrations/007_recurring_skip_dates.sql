-- Allow skipping individual recurring occurrences without deleting the rule
alter table public.recurring_rules
  add column if not exists skip_dates date[] not null default '{}';

comment on column public.recurring_rules.skip_dates is
  'Occurrence dates skipped for this rule (deleted specific events)';
