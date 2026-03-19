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

function MediaContent({ message }: { message: Message }) {
  if (!message.media_type || !message.media_id) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
    )
  }

  const mediaUrl = `/api/media?media_id=${message.media_id}&tenant_id=${message.tenant_id}`

  if (message.media_type === 'image') {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Imagem"
          className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
          onClick={() => window.open(mediaUrl, '_blank')}
        />
        {message.body !== '[Imagem]' && (
          <p className="text-sm mt-1 leading-relaxed">{message.body}</p>
        )}
      </div>
    )
  }

  if (message.media_type === 'audio' || message.media_type === 'ptt') {
    return (
      <audio controls className="max-w-full" style={{ minWidth: 220 }}>
        <source src={mediaUrl} />
        Seu navegador não suporta áudio.
      </audio>
    )
  }

  if (message.media_type === 'document') {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm underline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {message.body}
      </a>
    )
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!isOutbound) {
    return (
      <div className="flex justify-start mb-2 px-4">
        <div className="max-w-[70%]">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm">
            <MediaContent message={message} />
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-gray-400">{time}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const bubbleColor = SENDER_COLORS[message.sent_by] ?? SENDER_COLORS.system
  const label = SENDER_LABELS[message.sent_by] ?? message.sent_by

  return (
    <div className="flex justify-end mb-2 px-4">
      <div className="max-w-[70%]">
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
          <MediaContent message={message} />
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
