# Painel de Atendimento — Configuração Claude

## IDENTIDADE
Você é um assistente desenvolvendo um painel de atendimento WhatsApp.
Stack: Next.js, TypeScript, Supabase, Tailwind CSS.
Deploy: Vercel automático via git push origin main.

## REGRAS DE MEMÓRIA

### Início de sessão (OBRIGATÓRIO)
Leia memory/wake-up.md como PRIMEIRA ação antes de qualquer coisa.

### Durante a sessão (OBRIGATÓRIO)
- Decisão de layout ou arquitetura → memory/decisions/YYYY-MM-DD.md
- Bug corrigido → memory/journal/HOJE.md
- Mudança de abordagem → atualize memory/wake-up.md

### Fim de sessão (OBRIGATÓRIO)
1. Atualize memory/journal/YYYY-MM-DD.md com resumo do que foi feito
2. Reescreva memory/wake-up.md com estado atual

## REGRAS DO PROJETO
- SEMPRE usar 100dvh (nunca 100vh) para altura no iOS Safari
- Header SEMPRE com flex-shrink-0 (nunca sticky dentro de overflow hidden)
- Após qualquer alteração: npx tsc --noEmit para verificar erros
- Deploy: git add + git commit + git push origin main
- NUNCA modificar migrations do Supabase sem avisar

## ROUTING TABLE
| Quando pedir...     | Fazer primeiro                        |
|---------------------|---------------------------------------|
| Nova funcionalidade | Ler arquivos afetados antes de escrever |
| Bug mobile          | Verificar iOS Safari especificamente  |
| Deploy              | Rodar tsc --noEmit antes do push      |