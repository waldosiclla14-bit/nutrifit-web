'use client';

import { useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '@/data/seed';
import { generateRecommendation, quickChips } from '@/lib/ai/recommender';
import { getSettings } from '@/lib/store';
import { cx } from '@/lib/utils';
import { Bot, Send, X, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

function renderMessage(text: string, key: number) {
  const parts = text.split(/(\/productos\/[a-z0-9-]+)/gi);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        const m = part.match(/^(\/productos\/[a-z0-9-]+)$/i);
        if (m) {
          return (
            <a
              key={i}
              href={m[1]}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink transition-transform active:scale-95"
            >
              <Bot className="h-3 w-3" /> Ver producto →
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '¡Hola! 👋 Soy el asistente de NutriFit. Te ayudo a elegir el suplemento ideal y resuelvo dudas de envío y pago. ¿En qué te ayudo hoy?',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setMessages((m) => [...m, { role: 'user', text: value }]);
    setInput('');
    setLoading(true);

    window.setTimeout(() => {
      const reply = generateRecommendation(
        value,
        PRODUCTS,
        { freeShippingFrom: getSettings().freeShippingFrom },
      );
      setMessages((m) => [...m, { role: 'bot', text: reply }]);
      setLoading(false);
    }, 450);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className={cx(
          'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-2xl transition-transform hover:scale-105',
          'bottom-20 right-5 lg:bottom-5 lg:right-[5.5rem]',
        )}
        aria-label="Abrir asistente IA"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-ink/30" aria-hidden="true" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden bg-paper shadow-2xl sm:bottom-20 sm:right-5 sm:h-[600px] sm:w-[400px] sm:max-h-[calc(100vh-6rem)] sm:rounded-2xl sm:border sm:border-line sm:pb-2 lg:bottom-24">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-ink">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Asistente IA</p>
                <p className="text-xs text-muted">NutriFit · te ayudo a elegir</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-soft"
              aria-label="Cerrar asistente"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-soft/50 p-4">
            {messages.map((msg, i) => (
              <div key={i} className={cx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cx(
                    'max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-ink text-paper'
                      : 'border border-line bg-paper text-ink shadow-card',
                  )}
                >
                  {renderMessage(msg.text, i)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-line bg-paper px-4 py-2 text-sm text-muted shadow-card">
                  Escribiendo...
                </div>
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div className="flex gap-2 overflow-x-auto border-t border-line bg-paper px-3 py-2">
            {quickChips().map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="shrink-0 rounded-full border border-line bg-soft px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-accent"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-line bg-paper p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Escribe tu consulta..."
              className="h-11 flex-1 rounded-full border border-line bg-soft px-4 text-sm text-ink outline-none focus:border-accentDeep"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-accent hover:text-ink disabled:opacity-40"
              aria-label="Enviar mensaje"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
