alter table public.reminders
  add column if not exists recurring boolean default false,
  add column if not exists event_type text;

create index if not exists idx_reminders_recurring
  on public.reminders(user_id, recurring, event_type)
  where recurring = true;
