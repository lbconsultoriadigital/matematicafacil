"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Flame,
  Gift,
  Keyboard,
  Loader2,
  Lock,
  Mic,
  Send,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
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
type StudyMode = "text" | "photo" | "voice";
type ChatMessage = {
  id: string;
  imagePreview?: string;
  mode: StudyMode;
  role: "user" | "assistant";
  subjectId: SubjectId;
  text: string;
};
type RewardRequest = { id: string; missionId: string; reward: string; createdAt: string };
type InlineMedia = { mimeType: string; data: string };
type PreparedImage = InlineMedia & { preview: string };
type SpeechRecognitionResultItem = { [index: number]: { transcript?: string } };
type SpeechRecognitionEventLike = Event & { results: ArrayLike<SpeechRecognitionResultItem> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const STORAGE_KEY = "lorena_facil_state_v2";
const VOICE_STORAGE_KEY = "lorena_facil_voice_v1";
const AUTOMATIC_VOICE = "auto";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    mode: "text",
    role: "assistant",
    subjectId: "history",
    text: "Oi, Lorena! Escolha Foto, Falar ou Digitar. Eu vou te ajudar em passos pequenos, como uma amiga estudando junto.",
  },
];

export function LorenaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("tutor");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("history");
  const [input, setInput] = useState("");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(student.streak);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [unlockedStickerIds, setUnlockedStickerIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [recentReward, setRecentReward] = useState<Mission | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [voiceHint, setVoiceHint] = useState("Toque em Falar para gravar sua pergunta.");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [floatingXp, setFloatingXp] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(AUTOMATIC_VOICE);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setXp(parsed.xp ?? 0);
          setStreak(parsed.streak ?? student.streak);
          setCompletedMissionIds(Array.isArray(parsed.completedMissionIds) ? parsed.completedMissionIds : []);
          setUnlockedStickerIds(Array.isArray(parsed.unlockedStickerIds) ? parsed.unlockedStickerIds : []);
          setMessages(Array.isArray(parsed.messages) ? parsed.messages : initialMessages);
          setRewardRequests(Array.isArray(parsed.rewardRequests) ? parsed.rewardRequests : []);
          setSelectedVoiceName(window.localStorage.getItem(VOICE_STORAGE_KEY) || AUTOMATIC_VOICE);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        setSelectedVoiceName(window.localStorage.getItem(VOICE_STORAGE_KEY) || AUTOMATIC_VOICE);
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

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceName);
  }, [hydrated, selectedVoiceName]);

  useEffect(() => {
    return () => {
      stopRecordingTracks();
      if (recordingTimerRef.current) {
        window.clearTimeout(recordingTimerRef.current);
      }
      recognitionRef.current?.abort();
    };
  }, []);

  const selectedSubjectData = subjects.find((subject) => subject.id === selectedSubject) ?? subjects[0];
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const completedCount = completedMissionIds.length;
  const totalMissions = missions.length;
  const nextLevelProgress = Math.min(100, Math.round((xp / 220) * 100));
  const nextMissions = missions.filter((mission) => !completedMissionIds.includes(mission.id));
  const latestSticker = recentReward ? stickers.find((sticker) => sticker.id === recentReward.stickerId) : null;

  function completeMission(mission: Mission) {
    if (completedMissionIds.includes(mission.id)) return;

    setCompletedMissionIds((current) => [...current, mission.id]);
    setXp((current) => current + mission.xp);
    setStreak((current) => current + 1);
    setRecentReward(mission);
    setFloatingXp(`+${mission.xp} XP e 1 figurinha`);
    setUnlockedStickerIds((current) => {
      if (current.includes(mission.stickerId)) return current;
      return [...current, mission.stickerId];
    });

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

  async function sendTutorRequest({
    audio,
    image,
    message,
    mode,
    userText,
  }: {
    audio?: InlineMedia;
    image?: PreparedImage;
    message: string;
    mode: StudyMode;
    userText?: string;
  }) {
    const trimmed = message.trim();
    if ((!trimmed && !image && !audio) || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      imagePreview: image?.preview,
      mode,
      role: "user",
      text:
        userText ||
        (mode === "photo"
          ? "Enviei uma foto da atividade."
          : mode === "voice"
            ? "Enviei uma pergunta de voz."
            : trimmed),
      subjectId: selectedSubject,
    };

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audio ? { data: audio.data, mimeType: audio.mimeType } : undefined,
          image: image ? { data: image.data, mimeType: image.mimeType } : undefined,
          message: trimmed,
          mode,
          subjectId: selectedSubject,
        }),
      });

      const data = (await response.json()) as { answer?: string };
      const answer = data.answer || "Vamos tentar de novo com uma pergunta menor?";
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          mode,
          role: "assistant",
          text: answer,
          subjectId: selectedSubject,
        },
      ]);
      speakTutor(answer);
    } catch {
      const answer = "Não consegui responder agora. Sua pergunta ficou salva aqui para tentarmos de novo.";
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          mode,
          role: "assistant",
          text: answer,
          subjectId: selectedSubject,
        },
      ]);
      speakTutor(answer);
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendTutorRequest({ message: text, mode: "text" });
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isSending) return;

    setIsReadingPhoto(true);
    setPhotoName(file.name);

    try {
      const image = await prepareImage(file);
      setPhotoPreview(image.preview);
      await sendTutorRequest({
        image,
        message: "Leia a foto da atividade e transforme em um plano de estudo simples.",
        mode: "photo",
        userText: "Enviei uma foto da minha atividade.",
      });
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `photo-error-${Date.now()}`,
          mode: "photo",
          role: "assistant",
          subjectId: selectedSubject,
          text: "Não consegui ler essa foto. Tente tirar outra foto com boa luz e a folha bem retinha.",
        },
      ]);
    } finally {
      setIsReadingPhoto(false);
    }
  }

  async function toggleVoiceRecording() {
    if (isListening) {
      stopVoiceRecording();
      return;
    }

    if (isSending) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceHint("Este navegador não liberou gravação. Use Digitar por enquanto.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      transcriptRef.current = "";

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishVoiceRecording();
      };

      startSpeechRecognition();
      recorder.start();
      setIsListening(true);
      setVoiceHint("Estou ouvindo. Toque em Falar de novo para enviar.");
      recordingTimerRef.current = window.setTimeout(() => stopVoiceRecording(), 10000);
    } catch {
      setVoiceHint("Para falar comigo, libere o microfone do celular.");
    }
  }

  function startSpeechRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceHint("Vou gravar sua voz e tentar entender pelo áudio.");
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        transcriptRef.current = transcript;
        if (transcript) setInput(transcript);
      };
      recognition.onerror = () => {
        setVoiceHint("Continue falando. Se não virar texto, eu tento pelo áudio.");
      };
      recognition.onend = null;
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceHint("Vou gravar sua voz e tentar entender pelo áudio.");
    }
  }

  function stopVoiceRecording() {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      void finishVoiceRecording();
    }

    setIsListening(false);
  }

  async function finishVoiceRecording() {
    stopRecordingTracks();
    const transcript = transcriptRef.current.trim() || input.trim();
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    recorderRef.current = null;

    if (transcript) {
      setInput("");
      setVoiceHint("Pergunta enviada. Toque para gravar outra.");
      await sendTutorRequest({
        message: transcript,
        mode: "voice",
        userText: `Eu falei: ${transcript}`,
      });
      return;
    }

    if (chunks.length > 0) {
      const mimeType = chunks[0]?.type || "audio/webm";
      const blob = new Blob(chunks, { type: mimeType });
      const dataUrl = await blobToDataUrl(blob);
      const data = dataUrl.split(",")[1];
      if (data) {
        setVoiceHint("Áudio enviado. Toque para gravar outra.");
        await sendTutorRequest({
          audio: { data, mimeType },
          message: "Escute minha pergunta de voz e me ajude a estudar.",
          mode: "voice",
          userText: "Enviei uma pergunta de voz.",
        });
        return;
      }
    }

    setVoiceHint("Não ouvi nada. Tente falar pertinho do celular.");
  }

  function stopRecordingTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function toggleVoice() {
    setIsVoiceEnabled((enabled) => {
      if (enabled) window.speechSynthesis?.cancel();
      return !enabled;
    });
  }

  function testVoice() {
    speakTutor("Oi, Lorena! Essa é a voz que eu vou usar para estudar com você.");
  }

  function speakTutor(text?: string) {
    if (!isVoiceEnabled || !text || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    const voice = pickVoice(voices, selectedVoiceName);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "pt-BR";
    utterance.rate = 1.15;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-[#17183f] md:bg-[#f4f2fb]">
      {floatingXp ? (
        <div className="fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-full bg-[#17183f] px-5 py-3 text-sm font-extrabold text-white shadow-2xl">
          {floatingXp}
        </div>
      ) : null}

      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white px-4 pb-4 pt-2 shadow-2xl shadow-pink-950/5 md:my-6 md:rounded-[38px]">
        <Header streak={streak} />

        {activeTab === "tutor" ? (
          <TutorHome
            completedCount={completedCount}
            input={input}
            isListening={isListening}
            isReadingPhoto={isReadingPhoto}
            isSending={isSending}
            isVoiceEnabled={isVoiceEnabled}
            latestAssistant={latestAssistant}
            latestSticker={latestSticker}
            nextLevelProgress={nextLevelProgress}
            nextMissions={nextMissions}
            onCompleteMission={completeMission}
            onInputChange={setInput}
            onPhotoTap={() => fileInputRef.current?.click()}
            onRequestReward={requestReward}
            onSendMessage={sendMessage}
            onShortcut={(id) => {
              if (id === "missions" || id === "stickers") setActiveTab(id);
            }}
            onSpeakLatest={() => speakTutor(latestAssistant?.text)}
            onTestVoice={testVoice}
            onToggleVoice={toggleVoice}
            onVoiceTap={toggleVoiceRecording}
            onVoiceChange={setSelectedVoiceName}
            photoName={photoName}
            photoPreview={photoPreview}
            recentReward={recentReward}
            selectedSubject={selectedSubject}
            selectedSubjectData={selectedSubjectData}
            selectedVoiceName={selectedVoiceName}
            setSelectedSubject={setSelectedSubject}
            totalMissions={totalMissions}
            unlockedStickerCount={unlockedStickerIds.length}
            voices={availableVoices}
            voiceHint={voiceHint}
            xp={xp}
          />
        ) : null}

        {activeTab === "missions" ? (
          <MissionsPanel
            completedMissionIds={completedMissionIds}
            onCompleteMission={completeMission}
            onRequestReward={requestReward}
            unlockedStickerIds={unlockedStickerIds}
          />
        ) : null}

        {activeTab === "stickers" ? <StickerPanel unlockedStickerIds={unlockedStickerIds} /> : null}

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>
    </main>
  );
}

function Header({ streak }: { streak: number }) {
  return (
    <header className="mt-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-lg shadow-pink-500/20">
          <span className="absolute left-3.5 top-3 h-7 w-1.5 rounded-full bg-white/80" />
          <span className="absolute right-3.5 top-3 h-7 w-1.5 rounded-full bg-white/80" />
          <span className="absolute bottom-3 h-1.5 w-8 rounded-full bg-yellow-300" />
          <Sparkles className="relative h-6 w-6" />
        </div>
        <h1 className="text-[27px] font-black leading-[0.92]">
          Lorena
          <br />
          <span className="text-pink-500">Fácil</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center leading-tight">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-5 w-5 fill-orange-500/20 text-orange-500" />
            <span className="text-xl font-black">{streak}</span>
          </div>
          <span className="text-xs font-bold text-pink-500">sequência</span>
        </div>
        <div className="relative h-[54px] w-[54px] overflow-hidden rounded-full border-[4px] border-pink-400 bg-pink-50">
          <Image
            src={student.avatar}
            alt="Lorena"
            fill
            priority
            sizes="54px"
            className="object-cover object-top"
          />
          <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
      </div>
    </header>
  );
}

function TutorHome({
  completedCount,
  input,
  isListening,
  isReadingPhoto,
  isSending,
  isVoiceEnabled,
  latestAssistant,
  latestSticker,
  nextLevelProgress,
  nextMissions,
  onCompleteMission,
  onInputChange,
  onPhotoTap,
  onRequestReward,
  onSendMessage,
  onShortcut,
  onSpeakLatest,
  onTestVoice,
  onToggleVoice,
  onVoiceChange,
  onVoiceTap,
  photoName,
  photoPreview,
  recentReward,
  selectedSubject,
  selectedSubjectData,
  selectedVoiceName,
  setSelectedSubject,
  totalMissions,
  unlockedStickerCount,
  voices,
  voiceHint,
  xp,
}: {
  completedCount: number;
  input: string;
  isListening: boolean;
  isReadingPhoto: boolean;
  isSending: boolean;
  isVoiceEnabled: boolean;
  latestAssistant?: ChatMessage;
  latestSticker?: (typeof stickers)[number] | null;
  nextLevelProgress: number;
  nextMissions: Mission[];
  onCompleteMission: (mission: Mission) => void;
  onInputChange: (value: string) => void;
  onPhotoTap: () => void;
  onRequestReward: (mission: Mission) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onShortcut: (id: string) => void;
  onSpeakLatest: () => void;
  onTestVoice: () => void;
  onToggleVoice: () => void;
  onVoiceChange: (voiceName: string) => void;
  onVoiceTap: () => void;
  photoName: string;
  photoPreview: string | null;
  recentReward: Mission | null;
  selectedSubject: SubjectId;
  selectedSubjectData: (typeof subjects)[number];
  selectedVoiceName: string;
  setSelectedSubject: (subjectId: SubjectId) => void;
  totalMissions: number;
  unlockedStickerCount: number;
  voices: SpeechSynthesisVoice[];
  voiceHint: string;
  xp: number;
}) {
  const missionPreview = nextMissions.slice(0, 2);

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-[30px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-pink-700 p-4 text-white shadow-xl shadow-pink-600/20">
        <div className="flex items-center gap-3">
          <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-full border-[5px] border-white/85 bg-pink-100 shadow-xl shadow-pink-950/20">
            <Image src={student.avatar} alt="Tutora Lorena" fill priority sizes="86px" className="object-cover object-top" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-pink-50">Tutora de História e Inglês</p>
            <h2 className="text-[30px] font-black leading-tight">Oi, Lorena!</h2>
            <p className="text-[16px] font-medium leading-snug text-pink-50">Como quer estudar agora?</p>
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur transition active:scale-95"
            title={isVoiceEnabled ? "Desligar voz" : "Ligar voz"}
          >
            {isVoiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <HeroAction
            active={isReadingPhoto}
            icon={Camera}
            label="Foto"
            sublabel="Ler tarefa"
            onClick={onPhotoTap}
          />
          <HeroAction
            active={isListening}
            icon={Mic}
            label={isListening ? "Parar" : "Falar"}
            sublabel={isListening ? "Enviar voz" : "Gravar"}
            onClick={onVoiceTap}
          />
          <HeroAction
            active={false}
            icon={Keyboard}
            label="Digitar"
            sublabel="Pergunta"
            onClick={() => document.getElementById("lorena-question")?.focus()}
          />
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2">
        {subjects.map((subject) => {
          const Icon = subject.icon;
          const selected = selectedSubject === subject.id;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => setSelectedSubject(subject.id)}
              className={`flex h-14 items-center gap-2 rounded-[18px] border px-3 text-left transition active:scale-[0.98] ${
                selected ? "border-pink-300 bg-pink-50" : "border-slate-100 bg-white shadow-sm"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: subject.soft, color: subject.accent }}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-lg font-black leading-none">{subject.title}</span>
            </button>
          );
        })}
      </section>

      <form onSubmit={onSendMessage} className="mt-3 flex h-[60px] items-center gap-2 rounded-full border border-pink-100 bg-white p-2 shadow-lg shadow-pink-950/10">
        <input
          id="lorena-question"
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Digite sua dúvida aqui..."
          className="min-w-0 flex-1 bg-transparent px-3 text-[15px] font-semibold text-[#17183f] outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/25 transition active:scale-95 disabled:opacity-60"
          title="Enviar pergunta"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 fill-current" />}
        </button>
      </form>

      <div className="mt-3 rounded-[20px] bg-slate-50 px-4 py-3 text-sm font-bold leading-snug text-slate-500">
        {isListening ? "Gravando sua voz. Fale pertinho do celular." : isReadingPhoto ? "Estou lendo a foto da atividade." : voiceHint}
      </div>

      <VoicePicker
        enabled={isVoiceEnabled}
        onChange={onVoiceChange}
        onTestVoice={onTestVoice}
        selectedVoiceName={selectedVoiceName}
        voices={voices}
      />

      {photoPreview ? (
        <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-pink-100 bg-white p-3 shadow-sm">
          <Image src={photoPreview} alt="Foto enviada" width={74} height={74} className="h-[74px] w-[74px] rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-pink-500">Foto enviada</p>
            <p className="truncate text-sm font-semibold text-slate-500">{photoName || "atividade da Lorena"}</p>
          </div>
          <BookOpenCheck className="h-7 w-7 text-pink-500" />
        </div>
      ) : null}

      {latestAssistant ? (
        <section className="mt-3 rounded-[24px] bg-[#f5f7ff] p-4 text-[15px] leading-relaxed text-slate-600 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-black text-[#17183f]">{selectedSubjectData.agentName}</p>
            <button
              type="button"
              onClick={onSpeakLatest}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm transition active:scale-95"
              title="Ouvir resposta"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <p className="whitespace-pre-line">{latestAssistant.text}</p>
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="XP" value={xp.toString()} />
        <MiniStat label="Figurinhas" value={`${unlockedStickerCount}/${stickers.length}`} />
        <MiniStat label="Tarefas" value={`${completedCount}/${totalMissions}`} />
      </section>

      <section className="mt-4 overflow-hidden rounded-[26px] border border-pink-100 bg-white p-4 shadow-lg shadow-pink-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-pink-500">Começo do jogo</p>
            <h3 className="text-xl font-black">Tudo zerado para começar</h3>
          </div>
          <div className="h-2 w-20 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-pink-500" style={{ width: `${nextLevelProgress}%` }} />
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          {missionPreview.map((mission) => (
            <CompactMission
              key={mission.id}
              mission={mission}
              onComplete={() => onCompleteMission(mission)}
            />
          ))}
        </div>

        {missionPreview.length === 0 ? (
          <div className="mt-3 rounded-[20px] bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Todas as missões foram concluídas. A coleção ficou completa.
          </div>
        ) : null}
      </section>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {shortcutTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onShortcut(tile.id)}
              className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-1.5 rounded-[18px] border bg-gradient-to-br ${tile.tint} ${tile.border} px-1 text-center shadow-sm transition active:scale-95`}
            >
              <Icon className="h-7 w-7 text-pink-500" />
              <span className="text-[10px] font-black leading-tight">{tile.title}</span>
            </button>
          );
        })}
      </div>

      {latestSticker ? (
        <section className="mt-4 rounded-[26px] border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-4 shadow-lg shadow-yellow-900/5">
          <div className="flex items-center gap-3">
            <Image src={latestSticker.src} alt={latestSticker.title} width={64} height={64} className="h-16 w-16 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-yellow-700">Figurinha liberada</p>
              <h3 className="text-xl font-black">{latestSticker.title}</h3>
            </div>
          </div>
        </section>
      ) : null}

      {recentReward ? <RewardCard mission={recentReward} onRequestReward={() => onRequestReward(recentReward)} /> : null}
    </>
  );
}

function HeroAction({
  active,
  icon: Icon,
  label,
  onClick,
  sublabel,
}: {
  active: boolean;
  icon: typeof Camera;
  label: string;
  onClick: () => void;
  sublabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[86px] flex-col items-center justify-center rounded-[22px] px-2 text-center font-black transition active:scale-95 ${
        active ? "bg-yellow-300 text-[#17183f]" : "bg-white text-[#17183f] shadow-xl shadow-pink-950/10"
      }`}
    >
      <Icon className="h-7 w-7 text-pink-500" />
      <span className="mt-1 text-[17px] leading-tight">{label}</span>
      <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-slate-500">{sublabel}</span>
    </button>
  );
}

function VoicePicker({
  enabled,
  onChange,
  onTestVoice,
  selectedVoiceName,
  voices,
}: {
  enabled: boolean;
  onChange: (voiceName: string) => void;
  onTestVoice: () => void;
  selectedVoiceName: string;
  voices: SpeechSynthesisVoice[];
}) {
  const voiceOptions = voices.filter((voice) => voice.lang.toLowerCase().startsWith("pt"));

  return (
    <section className="mt-3 rounded-[20px] border border-pink-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-black text-pink-500">Voz do tutor</span>
          <select
            value={selectedVoiceName}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full rounded-full border border-pink-100 bg-pink-50 px-3 text-sm font-black text-[#17183f] outline-none"
          >
            <option value={AUTOMATIC_VOICE}>Automática, igual Lucas</option>
            {voiceOptions.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onTestVoice}
          disabled={!enabled}
          className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/20 transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
          title="Testar voz"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-slate-500">
        No celular, as vozes Google ou Samsung costumam soar mais naturais.
      </p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-pink-100 bg-white px-3 py-3 text-center shadow-sm">
      <p className="text-[21px] font-black leading-none text-[#17183f]">{value}</p>
      <p className="mt-1 text-[11px] font-black text-pink-500">{label}</p>
    </div>
  );
}

function CompactMission({ mission, onComplete }: { mission: Mission; onComplete: () => void }) {
  const subject = subjects.find((item) => item.id === mission.subjectId) ?? subjects[0];
  const sticker = stickers.find((item) => item.id === mission.stickerId);
  const Icon = subject.icon;

  return (
    <article className="grid grid-cols-[44px_1fr_46px] items-center gap-3 rounded-[20px] bg-slate-50 p-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: subject.soft, color: subject.accent }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{mission.title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">
          Libera: {sticker?.title ?? "figurinha"}
        </p>
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/20 transition active:scale-95"
        title="Completar missão"
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>
    </article>
  );
}

function MissionsPanel({
  completedMissionIds,
  onCompleteMission,
  onRequestReward,
  unlockedStickerIds,
}: {
  completedMissionIds: string[];
  onCompleteMission: (mission: Mission) => void;
  onRequestReward: (mission: Mission) => void;
  unlockedStickerIds: string[];
}) {
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-500">Missões</p>
          <h2 className="text-3xl font-black">Começar do zero</h2>
        </div>
        <Trophy className="h-9 w-9 text-yellow-500" />
      </div>

      <div className="mt-3 rounded-[22px] bg-pink-50 p-4 text-sm font-bold text-pink-700">
        Cada tarefa concluída libera exatamente uma figurinha. Progresso: {completedMissionIds.length}/{missions.length}.
      </div>

      <div className="mt-4 grid gap-4">
        {missions.map((mission) => {
          const done = completedMissionIds.includes(mission.id);
          const subject = subjects.find((item) => item.id === mission.subjectId) ?? subjects[0];
          const sticker = stickers.find((item) => item.id === mission.stickerId);
          const Icon = subject.icon;
          const unlocked = unlockedStickerIds.includes(mission.stickerId);

          return (
            <article
              key={mission.id}
              className="rounded-[26px] border border-pink-100 bg-white p-4 shadow-lg shadow-pink-950/5"
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

              <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-slate-50 p-3">
                {sticker ? (
                  <Image
                    src={sticker.src}
                    alt={sticker.title}
                    width={58}
                    height={58}
                    className={`h-[58px] w-[58px] object-contain ${unlocked ? "" : "grayscale opacity-40"}`}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{sticker?.title ?? "Figurinha"}</p>
                  <p className="text-xs font-semibold text-slate-500">{done ? "Liberada" : "Bloqueada até concluir"}</p>
                </div>
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
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-500">Figurinhas</p>
          <h2 className="text-3xl font-black">Coleção da Lorena</h2>
        </div>
        <Sparkles className="h-9 w-9 text-pink-500" />
      </div>

      <div className="mt-3 rounded-[22px] bg-pink-50 p-4 text-sm font-bold text-pink-700">
        {unlockedStickerIds.length}/{stickers.length} liberadas. Complete tarefas para abrir o pack.
      </div>

      <div className="mt-4 overflow-hidden rounded-[26px] border border-pink-100 bg-pink-50">
        <Image
          src="/stickers/lorena-stickers-sheet.png"
          alt="Pack de figurinhas da Lorena"
          width={1088}
          height={1448}
          className="w-full"
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {stickers.map((sticker) => {
          const unlocked = unlockedStickerIds.includes(sticker.id);
          return (
            <div
              key={sticker.id}
              className={`relative min-h-[132px] overflow-hidden rounded-[22px] border bg-white p-2 shadow-sm ${
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
    <section className="mt-4 rounded-[26px] border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-4 shadow-lg shadow-yellow-900/5">
      <div className="flex items-center gap-4">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-yellow-100 text-pink-500">
          <Gift className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black">Pedir ao papai</h3>
          <p className="mt-1 text-sm leading-snug text-slate-500">{mission.reward}</p>
        </div>
        <button
          type="button"
          onClick={onRequestReward}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-emerald-500/25 transition active:scale-95"
          title="Enviar pedido pelo WhatsApp"
        >
          <span className="text-2xl font-black">☎</span>
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
    <nav className="mt-5 rounded-full border border-pink-100 bg-white/95 p-2 shadow-xl shadow-pink-950/10 backdrop-blur">
      <div className="grid grid-cols-3 gap-1">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as TabId)}
              className={`flex h-[52px] items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95 ${
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

function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .slice(0, 1100);
}

function pickVoice(voices: SpeechSynthesisVoice[], selectedVoiceName: string) {
  if (selectedVoiceName === AUTOMATIC_VOICE) return undefined;

  const selected = voices.find((voice) => voice.name === selectedVoiceName);
  if (selected) return selected;

  const ptVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("pt"));
  const maleNames = ["daniel", "antonio", "antônio", "ricardo", "carlos", "felipe", "male", "mascul"];
  return (
    ptVoices.find((voice) => maleNames.some((name) => voice.name.toLowerCase().includes(name))) ||
    ptVoices.find((voice) => voice.lang.toLowerCase() === "pt-br") ||
    ptVoices[0] ||
    voices[0]
  );
}

async function prepareImage(file: File): Promise<PreparedImage> {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.82);
  const data = preview.split(",")[1];
  if (!data) throw new Error("Image conversion failed");
  return { data, mimeType: "image/jpeg", preview };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return fileToDataUrl(blob);
}
