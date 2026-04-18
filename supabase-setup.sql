-- Tabela de entradas do diário
create table if not exists public.entradas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conteudo text not null,
  created_at timestamptz not null default now()
);

-- Cada usuário só acessa as próprias entradas
alter table public.entradas enable row level security;

create policy "usuario lê próprias entradas"
  on public.entradas for select
  using (auth.uid() = user_id);

create policy "usuario insere próprias entradas"
  on public.entradas for insert
  with check (auth.uid() = user_id);

create policy "usuario deleta próprias entradas"
  on public.entradas for delete
  using (auth.uid() = user_id);
