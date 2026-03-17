-- ============================================================
-- MIGRATION 001 — Schema inicial multi-tenant
-- Execute no Supabase: Dashboard > SQL Editor > New Query
-- ============================================================

-- ------------------------------------------------------------
-- TENANTS
-- Cada cliente da plataforma é um tenant.
-- meta_phone_number_id e meta_access_token são por tenant.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  meta_phone_number_id  TEXT NOT NULL,
  meta_access_token     TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CONTACTS
-- Contatos finais (clientes dos tenants).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- ------------------------------------------------------------
-- CONVERSATIONS
-- Uma conversa agrupa todas as mensagens de um contato.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed', 'pending')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- MESSAGES
-- Cada mensagem individual dentro de uma conversa.
-- direction: inbound (contato → sistema) | outbound (sistema → contato)
-- sent_by:   agent (IA/n8n) | human (painel) | system (automação)
-- status:    sent | delivered | read | failed
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  direction         TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by           TEXT NOT NULL CHECK (sent_by IN ('agent', 'human', 'system')),
  meta_message_id   TEXT,                          -- ID retornado pela Meta API
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ÍNDICES — performance em queries frequentes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id
  ON contacts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id
  ON conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations(tenant_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id
  ON messages(tenant_id);

CREATE INDEX IF NOT EXISTS idx_messages_meta_message_id
  ON messages(meta_message_id) WHERE meta_message_id IS NOT NULL;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Service Role Key bypassa o RLS (usado nas API routes do Next.js).
-- Quando o login for implementado, as policies abaixo passarão a
-- filtrar pelo tenant_id presente no JWT do usuário autenticado.
-- ------------------------------------------------------------
ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Policies temporárias: bloqueiam acesso anônimo direto.
-- Substituir por: USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
-- após implementar autenticação com claims customizados.

CREATE POLICY "block_anon_tenants" ON tenants
  FOR ALL TO anon USING (false);

CREATE POLICY "block_anon_contacts" ON contacts
  FOR ALL TO anon USING (false);

CREATE POLICY "block_anon_conversations" ON conversations
  FOR ALL TO anon USING (false);

CREATE POLICY "block_anon_messages" ON messages
  FOR ALL TO anon USING (false);

-- Authenticated users podem ver apenas dados do próprio tenant.
-- (Ativa após implementar Supabase Auth + custom claims)
-- CREATE POLICY "tenant_contacts" ON contacts
--   FOR ALL TO authenticated
--   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- CREATE POLICY "tenant_conversations" ON conversations
--   FOR ALL TO authenticated
--   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- CREATE POLICY "tenant_messages" ON messages
--   FOR ALL TO authenticated
--   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ------------------------------------------------------------
-- REALTIME — habilita subscriptions nas tabelas necessárias
-- Execute separadamente no Supabase Dashboard > Database > Replication
-- ou via SQL abaixo:
-- ------------------------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ------------------------------------------------------------
-- TENANT DE EXEMPLO — preencha com seus dados reais
-- Após executar, copie o id gerado e coloque em NEXT_PUBLIC_DEFAULT_TENANT_ID no .env.local
-- ------------------------------------------------------------
-- INSERT INTO tenants (name, meta_phone_number_id, meta_access_token)
-- VALUES (
--   'Nome da Sua Empresa',
--   'SEU_PHONE_NUMBER_ID',        -- Meta Developer Console > WhatsApp > Phone Numbers
--   'SEU_ACCESS_TOKEN_PERMANENTE' -- Meta Developer Console > System User > Token
-- )
-- RETURNING id;
