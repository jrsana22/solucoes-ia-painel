# Guia de Configuração — Soluções de IA

## Passo 1 — Supabase

1. Acesse https://supabase.com e crie um projeto
2. Vá em **Settings > API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
3. Cole no arquivo `.env.local`

---

## Passo 2 — Executar a migration SQL

1. No Supabase Dashboard, vá em **SQL Editor > New Query**
2. Abra o arquivo `supabase/migrations/001_initial.sql`
3. Cole o conteúdo e execute (Run)
4. Também execute no SQL Editor:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
   ```

---

## Passo 3 — Criar o primeiro Tenant

Execute no SQL Editor do Supabase:

```sql
INSERT INTO tenants (name, meta_phone_number_id, meta_access_token)
VALUES (
  'Nome da Sua Empresa',
  'SEU_PHONE_NUMBER_ID',         -- Meta Developer Console > WhatsApp > Phone Numbers > ID
  'SEU_ACCESS_TOKEN_PERMANENTE'  -- Meta Developer Console > System User > Generate Token
)
RETURNING id;
```

Copie o `id` retornado e cole em `.env.local`:
```
NEXT_PUBLIC_DEFAULT_TENANT_ID=uuid-retornado-aqui
```

> Para adicionar mais clientes: INSERT de novos tenants. O painel detecta o tenant pelo `NEXT_PUBLIC_DEFAULT_TENANT_ID` (substituído pelo JWT de autenticação na próxima fase).

---

## Passo 4 — Configurar Webhook na Meta

1. Abra o arquivo `.env.local` e defina:
   ```
   META_VERIFY_TOKEN=qualquer_string_secreta_que_voce_escolher
   ```

2. No Meta Developer Console:
   - Vá em **WhatsApp > Configuration > Webhook**
   - URL do Callback: `https://seu-dominio.com/api/webhooks/meta`
   - Verify Token: o mesmo valor que você definiu em `META_VERIFY_TOKEN`
   - Assine os campos: `messages`, `message_status_updates`

3. Durante desenvolvimento local, use **ngrok** para expor o localhost:
   ```bash
   ngrok http 3000
   # Use a URL https gerada como URL do webhook na Meta
   ```

---

## Passo 5 — Rodar o projeto

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

Acesse: http://localhost:3000

---

## Variáveis de ambiente — resumo

| Variável | Onde encontrar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API | Sim |
| `META_VERIFY_TOKEN` | Você define | Sim |
| `META_API_VERSION` | Fixo: `v17.0` | Sim |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | UUID gerado no Passo 3 | Sim |

---

## Estrutura dos tenants

Cada cliente da plataforma tem seu próprio registro na tabela `tenants` com:
- `meta_phone_number_id` — ID do número no Meta
- `meta_access_token` — token de acesso à API da Meta

Isso garante que cada cliente usa suas próprias credenciais e que as mensagens nunca se misturam (RLS + filtro por `tenant_id` em todas as queries).

---

## Próximos passos (fase 2)

- [ ] Implementar Supabase Auth (login por email/senha)
- [ ] Adicionar `tenant_id` como custom claim no JWT
- [ ] Ativar policies RLS comentadas na migration
- [ ] Remover `NEXT_PUBLIC_DEFAULT_TENANT_ID` e ler do JWT
- [ ] Adicionar tela de login com redirecionamento automático
