'use client';

import { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  AlertTriangle,
  TrendingUp,
  Package,
  ShoppingCart,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';

interface Message {
  id: string;
  sender: 'IA' | 'USER';
  text: string;
  timestamp: string;
  suggestions?: string[];
  action?: {
    label: string;
    type: 'VIEW_STOCK' | 'VIEW_PURCHASES' | 'VIEW_MARGINS';
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm-1',
    sender: 'IA',
    text: '¡Hola! Soy el Copiloto de NutriFit Business OS. Puedo auditar tu stock crítico, analizar márgenes por producto, detectar aumentos de costos en compras y recomendar acciones operativas.',
    timestamp: new Date().toISOString(),
    suggestions: [
      '¿Qué productos tienen stock crítico hoy?',
      '¿Cuáles productos tienen margen bajo el objetivo?',
      '¿Qué compras de reposición se recomiendan?',
      '¿Qué clientes llevan más de 45 días sin comprar?',
    ],
  },
];

export function IaCopilot({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text: q,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch<{ reply: string }>('/ai/chat', {
        method: 'POST',
        token,
        body: {
          message: q,
          history: nextMessages.slice(-10).map((m) => ({
            role: m.sender === 'USER' ? 'user' : 'model',
            text: m.text,
          })),
        },
      });
      const iaMsg: Message = {
        id: `ia-${Date.now()}`,
        sender: 'IA',
        text: res?.reply || 'Sin respuesta, intenta de nuevo.',
        timestamp: new Date().toISOString(),
        suggestions: [
          '¿Qué productos tienen stock crítico hoy?',
          '¿Cuáles productos tienen margen bajo el objetivo?',
        ],
      };
      setMessages((prev) => [...prev, iaMsg]);
    } catch (err: any) {
      toast.error(err?.message || 'La IA no respondió.');
      const iaMsg: Message = {
        id: `ia-${Date.now()}`,
        sender: 'IA',
        text: 'No pude responder ahora. Revisa que la IA esté configurada e intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, iaMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <Bot size={16} />
            </span>
            <h2 className="font-display text-xl tracking-wide uppercase">Copiloto IA NutriFit</h2>
          </div>
          <p className="text-xs text-muted">Asistente de control operativo, compras inteligentes, alertas de costos y rentabilidad.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-paper p-4 shadow-sm flex flex-col h-[600px]">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((m) => {
            const isIA = m.sender === 'IA';
            return (
              <div key={m.id} className={`flex flex-col ${isIA ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1 px-1">
                  <span className="font-bold">{isIA ? 'Copiloto NutriFit' : 'Tú'}</span>
                  <span>·</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`rounded-3xl p-4 text-xs leading-relaxed max-w-[90%] sm:max-w-[75%] ${
                    isIA
                      ? 'bg-surface border border-line text-ink rounded-tl-none whitespace-pre-wrap'
                      : 'bg-sport-green text-black font-semibold rounded-tr-none'
                  }`}
                >
                  {m.text}
                </div>

                {/* Quick Suggestion Chips */}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-1">
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-bold text-muted hover:border-sport-green hover:text-ink transition"
                      >
                        <Sparkles size={11} className="text-sport-green" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sport-green border-t-transparent" />
              <span>Analizando datos de la operación...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-line pt-3 mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Pregunta sobre stock crítico, sugerencias de compras, márgenes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-ink placeholder:text-muted focus:border-sport-green focus:outline-none"
          />
          <Button onClick={() => handleSend()} size="sm" className="bg-sport-green text-black font-extrabold px-5">
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
