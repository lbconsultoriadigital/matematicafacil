"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";

export function AccessGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextUrl = useMemo(() => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("next") || "/";
  }, []);

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setError(data.message || "Senha incorreta.");
        return;
      }

      window.location.href = nextUrl;
    } catch {
      setError("Não consegui validar agora. Tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ff] px-5 py-8 text-[#17183f]">
      <section className="w-full max-w-[430px] rounded-[32px] border border-pink-100 bg-white p-6 shadow-2xl shadow-pink-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-lg shadow-pink-500/20">
              <Sparkles className="h-7 w-7" />
            </span>
            <h1 className="text-[30px] font-black leading-[0.92] tracking-tight">
              Lorena
              <br />
              <span className="text-pink-500">Fácil</span>
            </h1>
          </div>
          <div className="relative h-[58px] w-[58px] overflow-hidden rounded-full border-[4px] border-pink-400 bg-pink-50">
            <Image src="/stickers/lorena-avatar.png" alt="Lorena" fill priority sizes="58px" className="object-cover object-top" />
          </div>
        </div>

        <div className="mt-8 rounded-[28px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 p-5 text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <LockKeyhole className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-3xl font-black leading-tight">Área da Lorena</h2>
          <p className="mt-2 text-base leading-snug text-pink-50">
            Digite a senha numérica para abrir o app.
          </p>
        </div>

        <form onSubmit={submitPin} className="mt-6">
          <label htmlFor="pin" className="text-sm font-black uppercase tracking-[0.16em] text-pink-500">
            Senha
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            className="mt-2 h-16 w-full rounded-2xl border border-pink-100 bg-pink-50 px-5 text-center text-3xl font-black tracking-[0.35em] text-[#17183f] outline-none transition focus:border-pink-400 focus:bg-white"
          />

          {error ? <p className="mt-3 text-sm font-bold text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-pink-500 text-base font-black text-white shadow-xl shadow-pink-500/20 transition active:scale-[0.98] disabled:opacity-45"
          >
            {isSubmitting ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
