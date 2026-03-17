-- ============================================================
-- MIGRATION 002 — Autenticação e perfis de usuário
-- Execute no Supabase: SQL Editor > New Query
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- Estende o auth.users do Supabase com role e tenant.
-- role = 'admin'  → acessa todos os tenants
-- role = 'agent'  → acessa apenas o tenant_id atribuído
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL para admin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- ------------------------------------------------------------
-- RLS em profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admin vê todos os perfis; agente vê apenas o próprio
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Somente admin pode inserir/atualizar perfis
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ------------------------------------------------------------
-- Atualiza RLS de conversations, messages e contacts
-- para filtrar por tenant do usuário autenticado
-- ------------------------------------------------------------

-- Remove policies anônimas temporárias
DROP POLICY IF EXISTS "allow_anon_read_conversations" ON conversations;
DROP POLICY IF EXISTS "allow_anon_read_contacts" ON contacts;
DROP POLICY IF EXISTS "allow_anon_read_messages" ON messages;
DROP POLICY IF EXISTS "block_anon_conversations" ON conversations;
DROP POLICY IF EXISTS "block_anon_contacts" ON contacts;
DROP POLICY IF EXISTS "block_anon_messages" ON messages;
DROP POLICY IF EXISTS "block_anon_tenants" ON tenants;

-- TENANTS: somente admin
CREATE POLICY "tenants_admin_only" ON tenants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- CONTACTS: admin vê todos; agente vê apenas do próprio tenant
CREATE POLICY "contacts_by_role" ON contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = contacts.tenant_id)
  );

-- CONVERSATIONS: admin vê todos; agente vê apenas do próprio tenant
CREATE POLICY "conversations_by_role" ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = conversations.tenant_id)
  );

-- MESSAGES: admin vê todos; agente vê apenas do próprio tenant
CREATE POLICY "messages_by_role" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = messages.tenant_id)
  );

-- Agente pode inserir mensagens apenas no próprio tenant (resposta manual)
CREATE POLICY "messages_insert_by_role" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = messages.tenant_id)
  );

-- ------------------------------------------------------------
-- Cria o primeiro admin manualmente após executar esta migration:
--
-- 1. Crie o usuário em: Supabase > Authentication > Users > Add user
--    (email: seu@email.com, senha: sua_senha)
--
-- 2. Copie o UUID do usuário criado e execute:
--
-- INSERT INTO profiles (id, name, role)
-- VALUES ('UUID_DO_USUARIO', 'Seu Nome', 'admin');
-- ------------------------------------------------------------
