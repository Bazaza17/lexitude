-- Lexitude schema
-- Run this in the Supabase SQL Editor once. No auth, permissive RLS for the hackathon.
-- Safe to re-run: drops and recreates the audit_runs table.

create extension if not exists "pgcrypto";

drop table if exists public.audit_runs cascade;

create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  company_name  text not null,
  framework     text not null check (framework in ('SOC2', 'GDPR', 'HIPAA', 'ISO27001', 'PCIDSS')),

  repo_url      text,
  repo_branch   text,
  file_count    int,
  doc_count     int,

  code_result   jsonb,
  policy_result jsonb,
  risk_result   jsonb,
  review_result jsonb,

  overall_score int,
  risk_level    text check (risk_level in ('low','medium','high','critical')),

  -- Archive flag: null = active, timestamp = archived at. We use a timestamp
  -- (not a bool) so "when was this archived" is queryable and a future
  -- retention job can expire old archives by date.
  archived_at   timestamptz default null
);

create index if not exists audit_runs_created_at_idx
  on public.audit_runs (created_at desc);

create index if not exists audit_runs_archived_at_idx
  on public.audit_runs (archived_at);

alter table public.audit_runs enable row level security;

drop policy if exists "audit_runs_public_read"   on public.audit_runs;
drop policy if exists "audit_runs_public_write"  on public.audit_runs;
drop policy if exists "audit_runs_public_update" on public.audit_runs;
drop policy if exists "audit_runs_public_delete" on public.audit_runs;

create policy "audit_runs_public_read"
  on public.audit_runs for select
  using (true);

create policy "audit_runs_public_write"
  on public.audit_runs for insert
  with check (true);

create policy "audit_runs_public_update"
  on public.audit_runs for update
  using (true) with check (true);

create policy "audit_runs_public_delete"
  on public.audit_runs for delete
  using (true);
