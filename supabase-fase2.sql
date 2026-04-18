-- Fase 2: colunas de análise de IA
alter table public.entradas
  add column if not exists humor_score  integer,
  add column if not exists emocao       text,
  add column if not exists temas        text[],
  add column if not exists processado   boolean not null default false;

-- Permite o usuário atualizar as próprias entradas (para a IA gravar a análise)
create policy "usuario atualiza próprias entradas"
  on public.entradas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
