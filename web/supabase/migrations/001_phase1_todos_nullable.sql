-- Phase 1: allow undated backlog todos
alter table public.todos alter column task_date drop not null;
