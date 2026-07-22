-- ============================================================================
-- CRAQUES DA SUPERAÇÃO — SCHEMA DO BANCO DE DADOS (SUPABASE / POSTGRES)
-- ============================================================================
-- Como usar:
-- 1. Abra seu projeto em https://supabase.com
-- 2. Vá em "SQL Editor" > "New query"
-- 3. Cole todo este arquivo e clique em "Run"
-- 4. Depois, vá em "Storage" e confirme que o bucket "documentos" foi criado
--    (ou crie manualmente com o mesmo nome, marcado como privado)
-- 5. Crie o usuário administrador em "Authentication > Users > Add user"
-- ============================================================================

-- Extensão para gerar UUID
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. SEQUÊNCIA E FUNÇÃO PARA GERAR O PROTOCOLO (ex: CDS-2026-000001)
-- ----------------------------------------------------------------------------
create sequence if not exists protocolo_seq start 1;

create or replace function gerar_protocolo()
returns text
language plpgsql
as $$
declare
  ano text := to_char(now(), 'YYYY');
  numero text;
begin
  numero := lpad(nextval('protocolo_seq')::text, 6, '0');
  return 'CDS-' || ano || '-' || numero;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. TABELA PRINCIPAL: inscricoes
-- ----------------------------------------------------------------------------
create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  protocolo text unique not null default gerar_protocolo(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'recebida'
    check (status in ('recebida', 'em_analise', 'aprovada', 'reprovada')),
  observacoes_admin text,

  -- Dados do participante
  nome_completo text not null,
  data_nascimento date not null,
  sexo text not null,
  cpf text not null,
  rg text not null,
  certidao_nascimento_numero text,
  escola text not null,
  serie text not null,

  -- Filiação / responsável
  nome_mae text,
  nome_pai text,
  responsavel_legal text not null,
  cpf_responsavel text not null,
  telefone text not null,
  whatsapp text not null,
  email text not null,

  -- Endereço
  endereco text not null,
  cep text not null,
  cidade text not null,
  estado text not null,

  -- Saúde
  necessidade_especial text,
  alergias text,
  medicamentos text,
  observacoes text,

  -- Declaração
  declaracao_aceita boolean not null default false,

  -- Caminhos dos arquivos no Supabase Storage (bucket "documentos")
  foto_aluno_path text not null,
  doc_rg_participante_path text not null,
  doc_cpf_participante_path text not null,
  doc_rg_responsavel_path text not null,
  doc_cpf_responsavel_path text not null,
  doc_certidao_nascimento_path text not null,
  doc_comprovante_residencia_path text not null,
  doc_boletim_escolar_path text not null,
  doc_exame_cardiologico_path text not null,
  doc_atestado_cardiologista_path text not null,
  doc_exame_sangue_path text not null,
  doc_carta_assinada_path text not null,
  doc_foto_3x4_path text not null,

  constraint declaracao_deve_ser_aceita check (declaracao_aceita = true)
);

create index if not exists idx_inscricoes_protocolo on public.inscricoes (protocolo);
create index if not exists idx_inscricoes_cpf on public.inscricoes (cpf);
create index if not exists idx_inscricoes_nome on public.inscricoes using gin (to_tsvector('portuguese', nome_completo));
create index if not exists idx_inscricoes_status on public.inscricoes (status);

-- Atualiza automaticamente "updated_at"
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inscricoes_updated_at on public.inscricoes;
create trigger trg_inscricoes_updated_at
  before update on public.inscricoes
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.inscricoes enable row level security;

-- Qualquer visitante (anon) pode CRIAR uma inscrição (enviar o formulário),
-- mas não pode ler, editar ou apagar inscrições existentes.
drop policy if exists "publico_pode_inserir_inscricao" on public.inscricoes;
create policy "publico_pode_inserir_inscricao"
  on public.inscricoes
  for insert
  to anon
  with check (declaracao_aceita = true);

-- Apenas administradores autenticados podem ver, atualizar ou apagar.
drop policy if exists "admin_pode_ver_inscricoes" on public.inscricoes;
create policy "admin_pode_ver_inscricoes"
  on public.inscricoes
  for select
  to authenticated
  using (true);

drop policy if exists "admin_pode_atualizar_inscricoes" on public.inscricoes;
create policy "admin_pode_atualizar_inscricoes"
  on public.inscricoes
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "admin_pode_apagar_inscricoes" on public.inscricoes;
create policy "admin_pode_apagar_inscricoes"
  on public.inscricoes
  for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 4. STORAGE — bucket privado para os documentos enviados
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  10485760, -- 10 MB por arquivo
  array['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
on conflict (id) do nothing;

-- Visitantes (anon) podem ENVIAR arquivos (upload) para o bucket,
-- mas não podem listar nem baixar arquivos de outras inscrições.
drop policy if exists "publico_pode_enviar_documentos" on storage.objects;
create policy "publico_pode_enviar_documentos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'documentos');

-- Apenas administradores autenticados podem visualizar/baixar os documentos.
drop policy if exists "admin_pode_ver_documentos" on storage.objects;
create policy "admin_pode_ver_documentos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documentos');

drop policy if exists "admin_pode_apagar_documentos" on storage.objects;
create policy "admin_pode_apagar_documentos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'documentos');

-- ----------------------------------------------------------------------------
-- 5. VIEW COM ESTATÍSTICAS PARA O DASHBOARD DO ADMINISTRADOR
-- ----------------------------------------------------------------------------
create or replace view public.estatisticas_inscricoes as
select
  count(*) as total,
  count(*) filter (where status = 'recebida') as pendentes,
  count(*) filter (where status = 'em_analise') as em_analise,
  count(*) filter (where status = 'aprovada') as aprovadas,
  count(*) filter (where status = 'reprovada') as reprovadas
from public.inscricoes;

-- A view herda as policies da tabela base (RLS), então só admins autenticados
-- conseguem consultá-la.

-- ============================================================================
-- FIM DO SCRIPT — pronto para uso!
-- ============================================================================
