-- ============================================================================
-- CRAQUES DA SUPERAÇÃO — CONFIGURAÇÕES EDITÁVEIS DO SITE
-- ============================================================================
-- Rode este script no SQL Editor do Supabase DEPOIS do schema.sql principal.
-- Cria uma tabela de "configurações" (textos e números da página inicial)
-- que podem ser editados pelo painel administrativo, sem tocar no código.
--
-- Por pedido, apenas o administrador com o email abaixo pode EDITAR essas
-- configurações. Qualquer visitante do site pode apenas VISUALIZAR (afinal,
-- é o que aparece na página inicial pública).
-- ============================================================================

create table if not exists public.site_config (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_config_updated_at on public.site_config;
create trigger trg_site_config_updated_at
  before update on public.site_config
  for each row execute function set_updated_at();

alter table public.site_config enable row level security;

-- Qualquer pessoa (inclusive visitantes não logados) pode LER as configurações,
-- pois elas aparecem na página inicial pública.
drop policy if exists "publico_pode_ler_config" on public.site_config;
create policy "publico_pode_ler_config"
  on public.site_config
  for select
  to anon, authenticated
  using (true);

-- Apenas o administrador com este email específico pode INSERIR ou ATUALIZAR.
drop policy if exists "somente_valdemir_pode_editar_config" on public.site_config;
create policy "somente_valdemir_pode_editar_config"
  on public.site_config
  for insert
  to authenticated
  with check (auth.email() = 'valdemirdcalves86@gmail.com');

drop policy if exists "somente_valdemir_pode_atualizar_config" on public.site_config;
create policy "somente_valdemir_pode_atualizar_config"
  on public.site_config
  for update
  to authenticated
  using (auth.email() = 'valdemirdcalves86@gmail.com')
  with check (auth.email() = 'valdemirdcalves86@gmail.com');

-- ----------------------------------------------------------------------------
-- Valores iniciais (os mesmos textos que já estão no site hoje)
-- ----------------------------------------------------------------------------
insert into public.site_config (key, value) values
  ('hero_title', 'O futuro das nossas crianças começa agora.'),
  ('hero_subtitle', 'Através do futebol, a ONG Esportiva Infanto Juvenil Centro de Formação transforma a vida de crianças, adolescentes e jovens — gerando saúde, disciplina, aprendizado e esperança, um treino de cada vez.'),
  ('banner_text', 'INSCRIÇÕES ABERTAS — Temporada 2026'),
  ('stat1_num', '+300'),
  ('stat1_label', 'Crianças e jovens atendidos'),
  ('stat2_num', '100%'),
  ('stat2_label', 'Gratuito para as famílias'),
  ('stat3_num', '7'),
  ('stat3_label', 'Dias de atividades por semana'),
  ('about_title', 'Mais do que futebol, formamos cidadãos'),
  ('about_text', 'Apaixonada pelo esporte, nossa ONG usa o futebol como ferramenta de transformação social, oferecendo às crianças e jovens de Itambé/PE um espaço seguro para aprender, crescer e sonhar.'),
  ('cta_title', 'Pronto para fazer parte do time?'),
  ('cta_subtitle', 'As vagas são limitadas. Inscreva sua criança agora mesmo.'),
  ('contact_phone1', '(11) 98589-9912'),
  ('contact_phone2', '(81) 99307-0462'),
  ('contact_email', 'contato@craquesdasuperacao.com.br'),
  ('address', 'Rua Senador Paulo Guerra, 472\nCentro de Itambé / PE\nCEP: 55920-000')
on conflict (key) do nothing;

-- ============================================================================
-- FIM — depois de rodar, o painel admin já pode editar esses textos.
-- ============================================================================
