import { useState } from "react";
import { Button, Input, Spinner } from "@titoapps/ui";
import { PageHeader } from "@titoapps/ui";
import { useCoachMessages, useSendCoach } from "./useCoach";

const SUGGESTIONS = ["¿Qué debería cenar?", "¿Puedo comer pizza hoy?", "¿Qué me falta consumir hoy?"];

export function CoachPage() {
  const { data: messages = [] } = useCoachMessages();
  const send = useSendCoach();
  const [text, setText] = useState("");

  const submit = (msg: string) => {
    const value = msg.trim();
    if (!value) return;
    setText("");
    send.mutate(value);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Coach" subtitle="Tu nutricionista con IA" />
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Preguntame lo que quieras sobre tu día:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="block w-full rounded-xl bg-white p-3 text-left text-sm ring-1 ring-slate-100 active:scale-[.98]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-green-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {send.isPending && (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner /> <span className="text-sm">Pensando…</span>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex gap-2 border-t border-slate-100 bg-white p-3"
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí tu pregunta…" className="flex-1" />
        <Button type="submit" disabled={send.isPending}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
