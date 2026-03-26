#!/bin/bash
JOURNAL_DATE=$(date +%Y-%m-%d)
JOURNAL_FILE="memory/journal/${JOURNAL_DATE}.md"

if [ ! -f "$JOURNAL_FILE" ]; then
  cat > "$JOURNAL_FILE" << INNER
# Journal — ${JOURNAL_DATE}

## Trabalho Realizado
-

## Decisões Tomadas
-

## Bugs Encontrados / Resolvidos
-

## TODO Para Próxima Sessão
- [ ]
INNER
  echo "Journal criado: $JOURNAL_FILE"
fi