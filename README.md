# OneCore Virtual

E-commerce com vitrine, catálogo, carrinho, checkout (Pix e cartão via Mercado Pago), área do cliente e painel administrativo.

**Stack:** React 18 · Vite · TypeScript · Tailwind v4 · React Router · Lucide · Supabase (Postgres, Auth, Storage, Edge Functions) · Mercado Pago.

---

## 1. Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5190
npm test           # testes (lógica + banco em Postgres/PGlite)
npm run build      # typecheck + build + sitemap.xml
```

Sem `.env`, a loja roda em **modo demonstração**: catálogo fictício identificado, faixa de aviso no topo, e conta/checkout/admin pedem para conectar o Supabase.

## 2. Conectar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Instale a CLI e vincule: `npx supabase login` e `npx supabase link --project-ref SEU_REF`
3. Aplique o banco: `npx supabase db push` (migrations em `supabase/migrations`), depois rode `supabase/seed.sql` no SQL Editor (categorias iniciais).
4. Copie `.env.example` → `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → API). **Nunca** coloque a `service_role` no `.env` do frontend.
5. Em Authentication → URL Configuration, cadastre o domínio da loja e `/conta/nova-senha` como redirect.

### Criar o primeiro administrador

Crie uma conta pela loja (`/conta/cadastro`) e rode no SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'seu@email.com');
```

Depois acesse `/admin`. Antes de vender, configure **frete** e **dados da empresa** em `/admin/configuracoes` — sem frete configurado o checkout fica bloqueado de propósito.

## 3. Pagamentos (Mercado Pago)

1. Em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) crie uma aplicação e pegue as **credenciais de teste**.
2. Frontend (`.env`): `VITE_MP_PUBLIC_KEY=TEST-...`
3. Secrets das funções:
   ```bash
   npx supabase secrets set MP_ACCESS_TOKEN=TEST-... SITE_URL=https://sua-loja.com.br
   npx supabase functions deploy checkout
   npx supabase functions deploy mp-webhook --no-verify-jwt
   ```
4. No painel do Mercado Pago → Webhooks: URL `https://SEU_REF.supabase.co/functions/v1/mp-webhook`, evento **Pagamentos**. Copie a assinatura secreta e rode `npx supabase secrets set MP_WEBHOOK_SECRET=...`.
5. Teste com os [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards). Para produção, troque pelas credenciais de produção.

**Como o fluxo é protegido**
- O navegador envia só produto, variação e quantidade; preço, frete e total são recalculados no servidor (`supabase/functions/_shared/pricing.ts`, a mesma regra usada na interface).
- Dados de cartão são digitados no Brick do Mercado Pago; a loja recebe apenas um token.
- O pedido vira "pago" somente quando o servidor consulta o pagamento na API do Mercado Pago (resposta do checkout ou webhook com assinatura `x-signature` validada) e confere o valor.
- O banco recusa marcar pedido como pago sem pagamento aprovado, ou como enviado sem envio registrado.

## 4. Publicar o frontend

Qualquer hospedagem estática serve (Vercel, Netlify, Cloudflare Pages):

- Build: `npm run build` · Saída: `dist`
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MP_PUBLIC_KEY`, `VITE_SITE_URL` (domínio final, usado em canonical e sitemap)
- Rotas SPA já configuradas (`vercel.json` e `public/_redirects`).

Depois de publicar: envie `https://sua-loja.com.br/sitemap.xml` ao Google Search Console. O sitemap é regenerado a cada build com os produtos ativos — refaça o deploy após cadastrar produtos.

## 5. Estrutura

```
src/
  components/   layout · navigation · products · catalog · cart · checkout · auth · ui
  pages/        Home · Category · Collection · Product · Search · Cart · Checkout
                Auth · Account · Admin · NotFound (inclui páginas institucionais)
  services/     catalog.ts (fonte única do catálogo) · store.ts (configurações)
  lib/          supabase · seo · orders · format
  data/         demo-catalog.ts (somente modo demonstração)
supabase/
  migrations/   schema, constraints, triggers, RLS, storage
  functions/    checkout · mp-webhook · _shared (pricing, mercadopago, http) · tests
  seed.sql
tests/          pricing/catálogo (vitest) · db.test.ts (RLS e regras no Postgres)
scripts/        sitemap.ts
```

## 6. Segurança e regras do banco

- **RLS em todas as tabelas.** Cliente lê só os próprios perfil, endereços, pedidos, pagamentos e envios. Catálogo público só com itens ativos.
- **Pedidos** só são criados pelo backend (`service_role` na Edge Function).
- **Dados internos** (compras no fornecedor, custos, observações, eventos brutos de pagamento, auditoria) são visíveis apenas para administradores.
- **Papel de admin** só pode ser alterado por outro admin (trigger).
- **Avaliações:** apenas compradores com pedido entregue; marcadas como compra verificada pelo sistema; entram em moderação; admin publica/rejeita mas não altera texto nem nota, e não pode criar avaliação em nome de cliente. Nota média é recalculada por trigger só com avaliações publicadas.
- **Auditoria:** alterações em pedidos, produtos, fornecedores, envios e moderação ficam em `admin_audit_log`.

Testes que comprovam essas regras: `tests/db.test.ts` (roda o SQL real em Postgres via PGlite) e `supabase/functions/tests` (assinatura do webhook — `npx deno test --allow-env supabase/functions/tests`).

## 7. Antes de abrir a loja

- [ ] Cadastrar produtos reais com fotos próprias em `/admin/produtos` (o catálogo de demonstração some ao conectar o Supabase).
- [ ] Configurar frete, prazo, contato e dados empresariais em `/admin/configuracoes`.
- [ ] Revisar com assessoria jurídica os textos de `/ajuda/*` (base alinhada ao CDC e à LGPD em `src/pages/NotFound/InfoPage.tsx`).
- [ ] Trocar credenciais de teste do Mercado Pago pelas de produção.
- [ ] Configurar SMTP próprio no Supabase Auth (o envio padrão tem limite baixo).

## Limitações conhecidas

- Frete é taxa fixa configurável (com frete grátis opcional). Cálculo por CEP com transportadora (Correios/Melhor Envio) não está integrado.
- Movimentações de rastreio são registradas manualmente pelo admin; não há integração automática com transportadoras.
- Não há envio de e-mails transacionais da loja (confirmação de pedido/envio) além dos e-mails de autenticação do Supabase.
- Emissão de nota fiscal não está integrada.
