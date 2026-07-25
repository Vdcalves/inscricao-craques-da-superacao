-- ============================================================================
-- MIGRAÇÃO: Uniformes + Atestado de aptidão física + Remoção da certidão
-- ============================================================================
-- Rode este script no SQL Editor do Supabase. Ele NÃO apaga nenhum dado
-- já existente — apenas ajusta a estrutura da tabela para os novos campos.
-- ============================================================================

-- 1. A certidão de nascimento deixa de ser obrigatória como upload
--    (o campo continua existindo, para não perder o que já foi enviado,
--    mas novas inscrições não precisam mais enviar esse arquivo).
alter table public.inscricoes alter column doc_certidao_nascimento_path drop not null;

-- 2. Novo documento obrigatório: atestado médico de aptidão física
alter table public.inscricoes add column if not exists doc_atestado_aptidao_path text;

-- 3. Novos campos de uniforme
alter table public.inscricoes add column if not exists uniforme_camisa text;
alter table public.inscricoes add column if not exists uniforme_calcao text;
alter table public.inscricoes add column if not exists uniforme_calcado text;

-- ============================================================================
-- FIM — depois de rodar, publique os arquivos atualizados do site.
-- ============================================================================
