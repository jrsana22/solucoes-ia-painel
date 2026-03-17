import type { Message } from '@/types'
import StatusIcon from './StatusIcon'

interface MessageBubbleProps {
  message: Message
}

const SENDER_LABELS: Record<string, string> = {
  agent: 'Agente IA',
  human: 'Você',
  system: 'Sistema',
}

const SENDER_COLORS: Record<string, string> = {
  agent: 'bg-emerald-50 border border-emerald-100 text-gray-800',
  human: 'bg-blue-600 text-white',
  system: 'bg-gray-100 border border-gray-200 text-gray-600',
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!isOutbound) {
    // Mensagem do contato — alinhada à esquerda
    return (
      <div className="flex justify-start mb-2 px-4">
        <div className="max-w-[70%]">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm">
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.body}
            </p>
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-gray-400">{time}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mensagem de saída (agent, human, system) — alinhada à direita
  const bubbleColor = SENDER_COLORS[message.sent_by] ?? SENDER_COLORS.system
  const label = SENDER_LABELS[message.sent_by] ?? message.sent_by

  return (
    <div className="flex justify-end mb-2 px-4">
      <div className="max-w-[70%]">
        {/* Badge identificador do remetente */}
        <div className="flex justify-end mb-0.5">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            message.sent_by === 'agent'
              ? 'bg-emerald-100 text-emerald-700'
              : message.sent_by === 'human'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {label}
          </span>
        </div>

        <div className={`rounded-2xl rounded-tr-sm px-4 py-2 shadow-sm ${bubbleColor}`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.body}
          </p>
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className={`text-[11px] ${message.sent_by === 'human' ? 'text-blue-200' : 'text-gray-400'}`}>
              {time}
            </span>
            {message.sent_by === 'human' && (
              <StatusIcon status={message.status} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
