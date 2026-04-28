/**
 * Formata número de telefone brasileiro para exibição.
 * Aceita qualquer string — se não for um número reconhecível, retorna como está.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  // +55 (XX) XXXXX-XXXX  — celular com DDI
  if (digits.length === 13 && digits.startsWith('55'))
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`

  // +55 (XX) XXXX-XXXX  — fixo com DDI
  if (digits.length === 12 && digits.startsWith('55'))
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`

  // (XX) XXXXX-XXXX  — celular sem DDI
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`

  // (XX) XXXX-XXXX  — fixo sem DDI
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`

  return raw
}

/**
 * Retorna o label de exibição de um contato.
 * Se não tiver nome, formata o telefone.
 */
export function contactLabel(name?: string | null, phone?: string | null): string {
  if (name?.trim()) return name.trim()
  if (phone?.trim()) return formatPhone(phone.trim())
  return 'Contato'
}

/**
 * Retorna o caractere para o avatar (sempre um dígito ou letra, nunca '+').
 */
export function avatarChar(name?: string | null, phone?: string | null): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase()
  if (phone?.trim()) {
    const digits = phone.replace(/\D/g, '')
    // Usa o dígito do DDD (posição 2 para +55XX..., ou posição 0 sem DDI)
    const ch = digits.startsWith('55') && digits.length >= 4
      ? digits.charAt(2)
      : digits.charAt(0)
    return ch || '?'
  }
  return '?'
}
