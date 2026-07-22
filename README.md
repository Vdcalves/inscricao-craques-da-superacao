# Craques da Superação — Sistema de Inscrições

Sistema completo (site institucional + ficha de inscrição + painel administrativo)
para a ONG Esportiva Infanto Juvenil Centro de Formação Craques da Superação.

100% gratuito: **Netlify** (hospedagem) + **Supabase** (banco de dados, storage e
autenticação). Sem Firebase, sem cartão de crédito.

## Estrutura do projeto

```
craques-da-superacao/
├── index.html          → Página inicial (banner "Inscrições abertas")
├── inscricao.html       → Ficha de cadastro (formulário em 6 etapas)
├── admin.html            → Login + painel administrativo
├── css/
│   └── style.css         → Todo o design system (cores, componentes, responsivo)
├── js/
│   ├── supabase-config.js → Conexão com Supabase + funções auxiliares (máscaras, CEP, CPF)
│   ├── main.js            → Interações da página inicial
│   ├── inscricao.js       → Lógica do formulário multi-etapas e upload
│   └── admin.js           → Login, dashboard, busca e gestão de status
├── assets/
│   └── favicon.svg
├── supabase/
│   └── schema.sql         → Script SQL completo (tabelas, RLS, storage, protocolo)
└── netlify.toml           → Configuração de publicação no Netlify
```

## Passo a passo — configuração do Supabase (gratuito)

1. Crie uma conta em **https://supabase.com** e clique em "New project".
2. Escolha um nome (ex: `craques-da-superacao`), uma senha para o banco e a região
   mais próxima (ex: São Paulo).
3. Aguarde o projeto ser criado (leva cerca de 2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo,
   cole no editor e clique em **Run**. Isso cria:
   - a tabela `inscricoes` com todos os campos do formulário;
   - a geração automática de protocolo (`CDS-2026-000001`, `CDS-2026-000002`...);
   - as políticas de segurança (RLS) — o público só pode enviar (`insert`),
     apenas administradores logados podem ler, editar ou apagar;
   - o bucket de Storage `documentos` (privado) com suas políticas de acesso.
6. Confira em **Storage** se o bucket `documentos` foi criado. Caso não apareça,
   crie manualmente com o nome exato `documentos`, marcado como **privado**.
7. Vá em **Authentication → Users → Add user** e crie o(s) administrador(es)
   com email e senha (esses serão os logins usados em `admin.html`).
8. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**
9. Abra `js/supabase-config.js` neste projeto e cole os dois valores nas
   constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

> A "anon key" é feita para ser usada publicamente no navegador — ela não dá
> acesso irrestrito ao banco. Quem protege os dados são as políticas de RLS
> definidas no `schema.sql`, que garantem que só administradores autenticados
> conseguem ler, alterar ou baixar documentos.

## Passo a passo — publicação no Netlify (gratuito)

**Opção A — Arrastar e soltar (mais simples)**
1. Crie uma conta em **https://netlify.com**.
2. No painel, vá em **Sites** → **Add new site** → **Deploy manually**.
3. Arraste a pasta `craques-da-superacao` (já com o `supabase-config.js` preenchido)
   para a área indicada.
4. Pronto — o Netlify gera uma URL pública (ex: `craques-da-superacao.netlify.app`).

**Opção B — Conectando ao GitHub (recomendado para manutenção contínua)**
1. Suba esta pasta para um repositório no GitHub.
2. No Netlify, clique em **Add new site → Import an existing project**.
3. Conecte sua conta do GitHub e selecione o repositório.
4. Build command: deixe em branco. Publish directory: `.` (raiz).
5. Clique em **Deploy site**.

Depois de publicar, você pode configurar um domínio próprio gratuitamente em
**Site settings → Domain management** (ex: `www.craquesdasuperacao.com.br`).

## Como o sistema funciona

- **Página inicial (`index.html`)** — banner "INSCRIÇÕES ABERTAS" com botão
  "CLIQUE AQUI" que leva à ficha de cadastro.
- **Ficha de inscrição (`inscricao.html`)** — formulário em 6 etapas (dados do
  participante, filiação/responsável, endereço, saúde, documentos e declaração),
  com barra de progresso, máscaras de CPF/telefone/CEP, busca automática de
  endereço pelo CEP, upload de 13 arquivos (foto + 12 documentos) e barra de
  progresso de envio. Ao concluir, os dados vão para a tabela `inscricoes` e os
  arquivos para o Storage `documentos`; um protocolo único é gerado
  automaticamente (ex: `CDS-2026-000001`) e exibido na tela de sucesso.
- **Painel administrativo (`admin.html`)** — protegido por login (Supabase Auth).
  Mostra estatísticas (total, pendentes, aprovadas, reprovadas), permite buscar
  por nome/CPF/protocolo, visualizar todos os dados e baixar os documentos
  enviados (links temporários e seguros), alterar o status da inscrição
  (Recebida → Em análise → Aprovada/Reprovada) e adicionar observações internas.

## Segurança

- Autenticação feita pelo **Supabase Auth** (email + senha).
- Toda leitura/edição de inscrições e download de documentos exige login —
  garantido pelas políticas de **Row Level Security** do banco e do Storage,
  não apenas pela interface.
- O público só tem permissão de **inserir** uma nova inscrição e **enviar**
  arquivos — nunca de ler dados de terceiros.

## Personalização

- **Logo:** troque o emoji ⚽ em `.logo-badge` (em `index.html`, `inscricao.html`
  e `admin.html`) por uma tag `<img>` apontando para o logo real da ONG salvo em
  `assets/`.
- **Cores:** ajuste as variáveis no topo de `css/style.css` (`--blue-*`,
  `--green-*`).
- **Textos institucionais:** edite diretamente em `index.html`.

## Custos

| Serviço  | Plano gratuito                                   |
|----------|---------------------------------------------------|
| Netlify  | 100 GB de banda/mês, deploys ilimitados            |
| Supabase | 500 MB de banco, 1 GB de Storage, 50k usuários/mês |

Suficiente para o volume de inscrições de um projeto social deste porte, sem
necessidade de cartão de crédito.
