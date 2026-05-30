"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  bottomNav,
  missions,
  shortcutTiles,
  stickers,
  student,
  subjects,
  type Mission,
  type SubjectId,
} from "@/lib/lorena-data";

type TabId = "tutor" | "missions" | "stickers";
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; subjectId: SubjectId };
type RewardRequest = { id: string; missionId: string; reward: string; createdAt: string };

const STORAGE_KEY = "lorena_facil_state_v1";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    subjectId: "history",
    text: "Oi, Lorena! Hoje eu posso te ajudar com História ou Inglês. Escolha uma matéria e me mande uma pergunta.",
  },
];

export function LorenaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("tutor");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("history");
  const [input, setInput] = useState("");
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(student.streak);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([
    "historia-linha-do-tempo",
  ]);
  const [unlockedStickerIds, setUnlockedStickerIds] = useState<string[]>(["bom-dia", "uau-aprovado"]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [recentReward, setRecentReward] = useState<Mission | null>(missions[0]);
  const [isSending, setIsSending] = useState(false);
  const [floatingXp, setFloatingXp] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setXp(parsed.xp ?? 120);
          setStreak(parsed.streak ?? student.streak);
          setCompletedMissionIds(parsed.completedMissionIds ?? ["historia-linha-do-tempo"]);
          setUnlockedStickerIds(parsed.unlockedStickerIds ?? ["bom-dia", "uau-aprovado"]);
          setMessages(parsed.messages ?? initialMessages);
          setRewardRequests(parsed.rewardRequests ?? []);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        xp,
        streak,
        completedMissionIds,
        unlockedStickerIds,
        messages,
        rewardRequests,
      }),
    );
  }, [completedMissionIds, hydrated, messages, rewardRequests, streak, unlockedStickerIds, xp]);

  const selectedSubjectData = subjects.find((subject) => subject.id === selectedSubject) ?? subjects[0];

  const progressBySubject = useMemo(() => {
    return subjects.map((subject) => {
      const subjectMissions = missions.filter((mission) => mission.subjectId === subject.id);
      const done = subjectMissions.filter((mission) => completedMissionIds.includes(mission.id)).length;
      return { ...subject, total: subjectMissions.length, done };
    });
  }, [completedMissionIds]);

  const nextLevelProgress = Math.min(100, Math.round((xp / 220) * 100));
  const completedCount = completedMissionIds.length;
  const totalMissions = missions.length;

  function completeMission(mission: Mission) {
    if (completedMissionIds.includes(mission.id)) return;

    setCompletedMissionIds((current) => [...current, mission.id]);
    setXp((current) => current + mission.xp);
    setStreak((current) => Math.max(current, student.streak));
    setRecentReward(mission);
    setFloatingXp(`+${mission.xp} XP`);

    if (!unlockedStickerIds.includes(mission.stickerId)) {
      setUnlockedStickerIds((current) => [...current, mission.stickerId]);
    }

    window.setTimeout(() => setFloatingXp(""), 1800);
  }

  async function requestReward(mission: Mission) {
    const subject = subjects.find((item) => item.id === mission.subjectId)?.title ?? "uma matéria";

    const response = await fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionId: mission.id,
        missionTitle: mission.title,
        subject,
        reward: mission.reward,
      }),
    });

    const data = (await response.json()) as { whatsappUrl?: string };
    const request: RewardRequest = {
      id: `${mission.id}-${Date.now()}`,
      missionId: mission.id,
      reward: mission.reward,
      createdAt: new Date().toISOString(),
    };
    setRewardRequests((current) => [request, ...current].slice(0, 6));

    if (data.whatsappUrl) {
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      subjectId: selectedSubject,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selectedSubject, message: text }),
      });
      const data = (await response.json()) as { answer?: string };
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.answer || "Vamos tentar de novo com uma pergunta menor?",
          subjectId: selectedSubject,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: "Não consegui responder agora, mas sua pergunta ficou salva para tentarmos de novo.",
          subjectId: selectedSubject,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-[#17183f] md:bg-[#f4f2fb]">
      {floatingXp ? (
        <div className="fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-full bg-[#17183f] px-5 py-3 text-sm font-extrabold text-white shadow-2xl">
          {floatingXp}
        </div>
      ) : null}

      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white px-5 pb-8 pt-3 shadow-2xl shadow-pink-950/5 md:my-6 md:rounded-[38px]">
        <PhoneStatusBar />
        <Header streak={streak} />

        {activeTab === "tutor" ? (
          <TutorHome
            completedCount={completedCount}
            input={input}
            isSending={isSending}
            messages={messages}
            nextLevelProgress={nextLevelProgress}
            onInputChange={setInput}
            onRequestReward={requestReward}
            onSendMessage={sendMessage}
            onShortcut={(id) => {
              if (id === "missions" || id === "stickers") setActiveTab(id);
            }}
            recentReward={recentReward}
            progressBySubject={progressBySubject}
            selectedSubject={selectedSubject}
            selectedSubjectData={selectedSubjectData}
            setSelectedSubject={setSelectedSubject}
            totalMissions={totalMissions}
          />
        ) : null}

        {activeTab === "missions" ? (
          <MissionsPanel
            completedMissionIds={completedMissionIds}
            onCompleteMission={completeMission}
            onRequestReward={requestReward}
          />
        ) : null}

        {activeTab === "stickers" ? (
          <StickerPanel unlockedStickerIds={unlockedStickerIds} />
        ) : null}

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </main>
  );
}

function PhoneStatusBar() {
  return (
    <div className="flex items-center justify-between px-2 py-2 text-black">
      <span className="text-lg font-bold tracking-tight">9:41</span>
      <div className="flex items-center gap-2">
        <div className="flex h-5 items-end gap-0.5">
          <span className="h-2 w-1 rounded-full bg-black" />
          <span className="h-3 w-1 rounded-full bg-black" />
          <span className="h-4 w-1 rounded-full bg-black" />
          <span className="h-5 w-1 rounded-full bg-black" />
        </div>
        <div className="relative h-4 w-5">
          <span className="absolute left-0 top-0 h-4 w-5 rounded-t-full border-[3px] border-b-0 border-black" />
          <span className="absolute left-1.5 top-2 h-2 w-2 rounded-t-full border-[3px] border-b-0 border-black" />
        </div>
        <div className="h-4 w-7 rounded border-2 border-black p-0.5">
          <span className="block h-full w-5 rounded-sm bg-black" />
        </div>
      </div>
    </div>
  );
}

function Header({ streak }: { streak: number }) {
  return (
    <header className="mt-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-lg shadow-pink-500/20">
          <span className="absolute left-4 top-3 h-8 w-1.5 rounded-full bg-white/80" />
          <span className="absolute right-4 top-3 h-8 w-1.5 rounded-full bg-white/80" />
          <span className="absolute bottom-3 h-1.5 w-8 rounded-full bg-yellow-300" />
          <Sparkles className="relative h-6 w-6" />
        </div>
        <h1 className="text-[30px] font-black leading-[0.92] tracking-tight">
          Lorena
          <br />
          <span className="text-pink-500">Fácil</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center leading-tight">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-6 w-6 fill-orange-500/20 text-orange-500" />
            <span className="text-2xl font-black">{streak}</span>
          </div>
          <span className="text-sm font-medium text-pink-500">sequência!</span>
        </div>
        <div className="relative h-[58px] w-[58px] overflow-hidden rounded-full border-[4px] border-pink-400 bg-pink-50">
          <Image
            src={student.avatar}
            alt="Lorena"
            fill
            priority
            sizes="58px"
            className="object-cover object-top"
          />
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
      </div>
    </header>
  );
}

function TutorHome({
  completedCount,
  input,
  isSending,
  messages,
  nextLevelProgress,
  onInputChange,
  onRequestReward,
  onSendMessage,
  onShortcut,
  progressBySubject,
  recentReward,
  selectedSubject,
  selectedSubjectData,
  setSelectedSubject,
  totalMissions,
}: {
  completedCount: number;
  input: string;
  isSending: boolean;
  messages: ChatMessage[];
  nextLevelProgress: number;
  onInputChange: (value: string) => void;
  onRequestReward: (mission: Mission) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onShortcut: (id: string) => void;
  progressBySubject: Array<(typeof subjects)[number] & { done: number; total: number }>;
  recentReward: Mission | null;
  selectedSubject: SubjectId;
  selectedSubjectData: (typeof subjects)[number];
  setSelectedSubject: (subjectId: SubjectId) => void;
  totalMissions: number;
}) {
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <>
      <section className="mt-7 overflow-hidden rounded-[28px] border border-pink-100 bg-white p-4 shadow-lg shadow-pink-950/5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
            <TargetIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black">Desafio de hoje</p>
            <p className="text-[17px] leading-snug text-slate-500">
              Complete as atividades e ganhe XP!
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {progressBySubject.map((subject) => {
            const Icon = subject.icon;
            const width = `${Math.max(12, Math.round((subject.done / subject.total) * 100))}%`;
            return (
              <div
                key={subject.id}
                className="grid grid-cols-[52px_1fr_58px] items-center gap-3 rounded-[22px] border border-pink-100 bg-white px-3 py-3"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: subject.soft, color: subject.accent }}>
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-black">{subject.title}</p>
                  <p className="text-sm font-bold" style={{ color: subject.accent }}>
                    {subject.done} de {subject.total} atividades
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width, background: subject.accent }} />
                  </div>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-black" style={{ borderColor: subject.accent }}>
                  {subject.done}/{subject.total}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-[24px] bg-gradient-to-br from-pink-500 to-fuchsia-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-4xl font-black">+40</span>
              <span className="ml-2 rounded-full bg-[#17183f] px-2 py-1 text-xs font-black text-yellow-300">
                XP
              </span>
              <p className="mt-1 text-lg leading-tight text-pink-50">para o próximo nível</p>
            </div>
            <div className="text-right text-sm font-bold text-pink-50">
              {completedCount}/{totalMissions}
              <br />
              missões
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/25">
            <div className="h-full rounded-full bg-yellow-300" style={{ width: `${nextLevelProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[30px] border-2 border-pink-500 bg-white shadow-xl shadow-pink-600/10">
        <div className="relative h-[330px] overflow-hidden bg-gradient-to-br from-pink-500 via-fuchsia-500 to-pink-700 px-6 pt-10 text-white">
          <span className="absolute right-8 top-8 text-5xl text-white/15">📖</span>
          <span className="absolute right-12 top-32 text-4xl text-white/15">Hi!</span>
          <span className="absolute left-7 bottom-20 h-20 w-20 rounded-full border-2 border-dashed border-white/15" />
          <div className="absolute bottom-6 -left-3 h-[218px] w-[182px] float-soft">
            <Image
              src={student.avatar}
              alt="Tutora Lorena"
              fill
              priority
              sizes="190px"
              className="object-contain object-bottom"
            />
          </div>

          <div className="relative ml-[132px]">
            <p className="flex items-center gap-2 text-sm font-medium text-pink-50">
              <span className="h-3 w-3 rounded-full bg-lime-400" />
              Seu tutor de História e Inglês
            </p>
            <h2 className="mt-6 text-[34px] font-black leading-tight tracking-tight">
              Oi, Lorena! <span aria-hidden>👋</span>
            </h2>
            <p className="mt-3 text-[22px] leading-tight text-pink-50">
              Em que posso te ajudar hoje?
            </p>
          </div>
        </div>

        <div className="relative bg-white px-5 pb-6 pt-16">
          <form
            onSubmit={onSendMessage}
            className="absolute -top-10 left-6 right-6 flex h-20 items-center gap-3 rounded-full bg-white p-3 shadow-xl shadow-pink-950/10"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Pergunte sobre História ou Inglês..."
              className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-medium text-[#17183f] outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isSending}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/25 transition active:scale-95 disabled:opacity-60"
              title="Enviar pergunta"
            >
              <Send className="h-6 w-6 fill-current" />
            </button>
          </form>

          <div className="grid grid-cols-2 gap-3">
            {subjects.map((subject) => {
              const Icon = subject.icon;
              const selected = selectedSubject === subject.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex min-h-24 items-center gap-3 rounded-[26px] border px-4 text-left shadow-sm transition active:scale-[0.98] ${
                    selected ? "border-pink-300 bg-pink-50" : "border-slate-100 bg-white"
                  }`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: subject.soft, color: subject.accent }}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl font-black">{subject.title}</span>
                    <span className="block text-sm font-bold" style={{ color: subject.accent }}>
                      Perguntar agora
                    </span>
                  </span>
                  <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />
                </button>
              );
            })}
          </div>

          {latestAssistant ? (
            <div className="mt-4 rounded-[22px] bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              <span className="font-black text-[#17183f]">{selectedSubjectData.agentName}: </span>
              {latestAssistant.text}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {shortcutTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onShortcut(tile.id)}
              className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-1.5 rounded-[20px] border bg-gradient-to-br ${tile.tint} ${tile.border} px-1 text-center shadow-sm transition active:scale-95`}
            >
              <Icon className="h-7 w-7 text-pink-500" />
              <span className="text-[11px] font-black leading-tight">{tile.title}</span>
            </button>
          );
        })}
      </div>

      {recentReward ? (
        <RewardCard mission={recentReward} onRequestReward={() => onRequestReward(recentReward)} />
      ) : null}
    </>
  );
}

function MissionsPanel({
  completedMissionIds,
  onCompleteMission,
  onRequestReward,
}: {
  completedMissionIds: string[];
  onCompleteMission: (mission: Mission) => void;
  onRequestReward: (mission: Mission) => void;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-500">Missões</p>
          <h2 className="text-3xl font-black">Hoje a Lorena brilha</h2>
        </div>
        <Trophy className="h-9 w-9 text-yellow-500" />
      </div>

      <div className="mt-5 grid gap-4">
        {missions.map((mission) => {
          const done = completedMissionIds.includes(mission.id);
          const subject = subjects.find((item) => item.id === mission.subjectId) ?? subjects[0];
          const Icon = subject.icon;

          return (
            <article
              key={mission.id}
              className="rounded-[28px] border border-pink-100 bg-white p-4 shadow-lg shadow-pink-950/5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: subject.soft, color: subject.accent }}>
                  <Icon className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black" style={{ color: subject.accent }}>
                    {subject.title}
                  </p>
                  <h3 className="text-xl font-black">{mission.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-slate-500">{mission.detail}</p>
                </div>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-yellow-700">
                  +{mission.xp}
                </span>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onCompleteMission(mission)}
                  disabled={done}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-black transition active:scale-95 ${
                    done ? "bg-emerald-50 text-emerald-600" : "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  {done ? "Concluída" : "Completar"}
                </button>
                <button
                  type="button"
                  onClick={() => onRequestReward(mission)}
                  disabled={!done}
                  className="flex h-12 w-14 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 transition active:scale-95 disabled:opacity-40"
                  title="Pedir recompensa"
                >
                  <Gift className="h-5 w-5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StickerPanel({ unlockedStickerIds }: { unlockedStickerIds: string[] }) {
  return (
    <section className="mt-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-500">Figurinhas</p>
          <h2 className="text-3xl font-black">Coleção da Lorena</h2>
        </div>
        <Sparkles className="h-9 w-9 text-pink-500" />
      </div>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-pink-100 bg-pink-50">
        <Image
          src="/stickers/lorena-stickers-sheet.png"
          alt="Pack de figurinhas da Lorena"
          width={1088}
          height={1448}
          className="w-full"
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {stickers.map((sticker) => {
          const unlocked = unlockedStickerIds.includes(sticker.id);
          return (
            <div
              key={sticker.id}
              className={`relative min-h-[136px] overflow-hidden rounded-[24px] border bg-white p-2 shadow-sm ${
                unlocked ? "border-pink-100" : "border-slate-100"
              }`}
            >
              <Image
                src={sticker.src}
                alt={sticker.title}
                width={160}
                height={160}
                className={`h-24 w-full object-contain transition ${unlocked ? "" : "grayscale opacity-35"}`}
              />
              <p className="mt-1 text-center text-xs font-black leading-tight">{sticker.title}</p>
              {!unlocked ? (
                <span className="absolute inset-0 flex items-center justify-center bg-white/35">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow">
                    <Lock className="h-5 w-5" />
                  </span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RewardCard({ mission, onRequestReward }: { mission: Mission; onRequestReward: () => void }) {
  return (
    <section className="mt-6 rounded-[28px] border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-4 shadow-lg shadow-yellow-900/5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-pink-500">
          <Gift className="h-9 w-9" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black">Pedido para o papai</h3>
          <p className="mt-1 text-sm leading-snug text-slate-500">{mission.reward}</p>
        </div>
        <button
          type="button"
          onClick={onRequestReward}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-emerald-500/25 transition active:scale-95"
          title="Enviar pedido pelo WhatsApp"
        >
          <span className="text-3xl font-black">☎</span>
        </button>
      </div>
    </section>
  );
}

function BottomNavigation({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  return (
    <nav className="mt-6 rounded-full border border-pink-100 bg-white/95 p-2 shadow-xl shadow-pink-950/10 backdrop-blur">
      <div className="grid grid-cols-3 gap-1">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as TabId)}
              className={`flex h-14 items-center justify-center gap-2 rounded-full text-sm font-black transition active:scale-95 ${
                selected ? "bg-pink-50 text-pink-500" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TargetIcon() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-red-400">
      <span className="h-3 w-3 rounded-full bg-red-500" />
      <span className="absolute -right-1 -top-1 text-lg">🎯</span>
    </span>
  );
}
