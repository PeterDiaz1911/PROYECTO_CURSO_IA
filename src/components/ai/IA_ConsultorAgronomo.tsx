"use client";

import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const suggestions = ["LMR USA para arándanos", "Carencia del Proclaim Opti", "Compatibilidad Azoxistrobina"];

export function IAConsultorAgronomo() {
  const [messages, setMessages] = useState(["Soy tu consultor de campo. Pregunta por carencias, dosis o compatibilidad de químicos."]);
  const [draft, setDraft] = useState("");
  function ask(text: string) { const clean = text.trim(); if (!clean) return; setMessages((current) => [...current, `Tú: ${clean}`, "Consultor: revisa siempre la etiqueta aprobada y la normativa SENASA del cultivo antes de aplicar. Te recomiendo validar el periodo de carencia del producto específico."]); setDraft(""); }
  return <Card className="border-gray-100 bg-[#1B4332] text-white shadow-lg"><CardHeader><div className="flex h-10 w-10 items-center justify-center bg-[#B7D96B] text-[#1B4332]"><Bot size={20} /></div><CardTitle className="mt-4 text-white">IA Consultora de Campo</CardTitle><p className="text-xs text-green-100/60">Asistencia preventiva para el Fundo.</p></CardHeader><CardContent><div className="h-72 space-y-3 overflow-y-auto pr-1">{messages.map((message, index) => <div key={`${message}-${index}`} className={`rounded-lg p-3 text-xs leading-5 ${index % 2 === 0 ? "bg-[#2D6A4F]/50 text-green-50" : "ml-5 bg-[#B7D96B] text-[#1B4332]"}`}>{message}</div>)}</div><div className="mt-4 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="border border-green-700 px-2 py-1 text-[10px] text-green-100 transition hover:bg-green-700">{suggestion}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); ask(draft); }} className="mt-4 flex gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Consulta normativa..." className="border-green-700 bg-transparent text-white placeholder-green-300" /><Button type="submit" aria-label="Enviar consulta" className="bg-[#B7D96B] text-[#1B4332] hover:bg-white"><Send size={15} /></Button></form><p className="mt-3 flex items-center gap-1 text-[10px] text-green-200/50"><Sparkles size={12} /> Respuestas técnicas y concisas</p></CardContent></Card>;
}
