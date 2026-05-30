import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  BarChart3,
  Calculator,
  Camera,
  ClipboardList,
  Clock3,
  Medal,
  Send,
  RotateCcw,
  Settings,
  Target,
  Volume2,
  VolumeX,
  ChevronRight,
  Trash2,
  CheckCircle,
  X,
  Flame,
  Mic,
  MessageCircle,
  Trophy,
  Info
} from 'lucide-react';

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TTS_MODEL = "gemini-2.5-pro-preview-tts";
const DEFAULT_TTS_VOICE = "Puck";

const GEMINI_CHAT_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido, multimodal e econômico)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Matemática Avançada e Complexa)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Mais econômico)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (se disponível na sua conta)' }
];

const GEMINI_TTS_VOICES = [
  { value: 'Puck', label: 'Puck - speaker animado' },
  { value: 'Charon', label: 'Charon - narrador informativo' },
  { value: 'Orus', label: 'Orus - firme e professoral' },
  { value: 'Iapetus', label: 'Iapetus - claro e direto' },
  { value: 'Algenib', label: 'Algenib - grave e marcante' },
  { value: 'Rasalgethi', label: 'Rasalgethi - informativo' },
  { value: 'Schedar', label: 'Schedar - equilibrado' },
  { value: 'Sadaltager', label: 'Sadaltager - especialista' }
];

const GEMINI_TTS_MODELS = [
  { value: 'gemini-2.5-pro-preview-tts', label: 'Gemini 2.5 Pro Preview TTS - melhor qualidade' },
  { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash Preview TTS - mais rápido' }
];

const LEVEL_TITLES = [
  { xpNeeded: 0, title: "Aquecendo", level: 1 },
  { xpNeeded: 100, title: "Foco em equações", level: 2 },
  { xpNeeded: 250, title: "Geometria em dia", level: 3 },
  { xpNeeded: 500, title: "Resolve sem travar", level: 4 },
  { xpNeeded: 800, title: "Raciocínio afiado", level: 5 },
  { xpNeeded: 1200, title: "Modo prova", level: 6 }
];

const VOICE_SAMPLE_TEXT = "Oi, Lucas. Agora eu vou falar com uma voz masculina mais natural, calma e clara enquanto a gente resolve matemática juntos.";

const getBestPortugueseVoice = (voices, selectedVoiceName = '') => {
  if (!voices?.length) return null;

  const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName);
  if (selectedVoice) return selectedVoice;

  return [...voices].sort((voiceA, voiceB) => {
    const scoreVoice = (voice) => {
      const label = `${voice.name} ${voice.lang}`.toLowerCase();
      let score = 0;

      if (voice.lang?.toLowerCase() === 'pt-br') score += 100;
      else if (voice.lang?.toLowerCase().startsWith('pt')) score += 70;

      if (label.includes('google')) score += 18;
      if (label.includes('microsoft')) score += 16;
      if (label.includes('luciana') || label.includes('maria') || label.includes('francisca')) score += 12;
      if (label.includes('premium') || label.includes('enhanced') || label.includes('natural')) score += 10;
      if (voice.localService) score += 4;

      return score;
    };

    return scoreVoice(voiceB) - scoreVoice(voiceA);
  })[0];
};

const cleanTextForSpeech = (text) => text
  .replace(/\$\$([\s\S]*?)\$\$/g, ' a fórmula matemática ')
  .replace(/\$([\s\S]*?)\$/g, ' $1 ')
  .replace(/\\Delta/g, 'delta')
  .replace(/\\frac{([\s\S]*?)}{([\s\S]*?)}/g, ' $1 dividido por $2 ')
  .replace(/\\sqrt{([\s\S]*?)}/g, ' raiz quadrada de $1 ')
  .replace(/[*_#>`~]/g, '')
  .replace(/https?:\/\/\S+/g, ' link ')
  .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const base64ToUint8Array = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
};

const pcmToWavBlob = (pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const wavHeaderSize = 44;
  const wavBuffer = new ArrayBuffer(wavHeaderSize + pcmBytes.length);
  const view = new DataView(wavBuffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
  view.setUint16(32, channels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  new Uint8Array(wavBuffer, wavHeaderSize).set(pcmBytes);

  return new Blob([wavBuffer], { type: 'audio/wav' });
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lucas_tutor_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedModel = localStorage.getItem('lucas_tutor_model') || DEFAULT_MODEL;
    return GEMINI_CHAT_MODELS.some((model) => model.value === savedModel) ? savedModel : DEFAULT_MODEL;
  });
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('lucas_tutor_custom_model') || '');
  const [ttsModel, setTtsModel] = useState(() => {
    const savedModel = localStorage.getItem('lucas_tutor_tts_model') || DEFAULT_TTS_MODEL;
    return GEMINI_TTS_MODELS.some((model) => model.value === savedModel) ? savedModel : DEFAULT_TTS_MODEL;
  });
  const [ttsVoice, setTtsVoice] = useState(() => {
    const savedVoice = localStorage.getItem('lucas_tutor_tts_voice') || DEFAULT_TTS_VOICE;
    return GEMINI_TTS_VOICES.some((voice) => voice.value === savedVoice) ? savedVoice : DEFAULT_TTS_VOICE;
  });
  const [ttsInstructions, setTtsInstructions] = useState(() => localStorage.getItem('lucas_tutor_tts_instructions') || 'Leia em português do Brasil como um speaker masculino natural, acolhedor e confiante. Use ritmo calmo, dicção clara e pausas curtas entre ideias importantes.');
  const [showSettings, setShowSettings] = useState(false);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' ou 'trilhas'
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => localStorage.getItem('lucas_tutor_voice_name') || '');
  const [voiceRate, setVoiceRate] = useState(() => {
    const savedRate = Number(localStorage.getItem('lucas_tutor_voice_rate') || '0.92');
    return Number.isFinite(savedRate) ? savedRate : 0.92;
  });
  const [voicePitch, setVoicePitch] = useState(() => {
    const savedPitch = Number(localStorage.getItem('lucas_tutor_voice_pitch') || '1.05');
    return Number.isFinite(savedPitch) ? savedPitch : 1.05;
  });
  const [notification, setNotification] = useState(null);

  // Modais de Diálogo Personalizados para evitar pop-ups invasivos do sistema
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [customError, setCustomError] = useState(null);

  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('lucas_tutor_xp') || '0', 10));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('lucas_tutor_streak') || '1', 10));
  const [unlockedBadges, setUnlockedBadges] = useState(() => {
    const saved = localStorage.getItem('lucas_tutor_badges');
    return saved ? JSON.parse(saved) : ["Primeira sessão"];
  });
  const [floatingXp, setFloatingXp] = useState(null); // Efeito flutuante de "+15 XP"

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Oi, Lucas. Pronto para destravar matemática sem enrolação?\n\nManda uma dúvida, uma foto do exercício ou escolhe uma missão rápida.\n\nEu te guio por etapas e peço uma parte de cada vez. Assim você entende o caminho, não só a resposta.",
      timestamp: new Date()
    }
  ]);

  const audioPlayerRef = useRef(null);
  const audioUrlRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    script.async = true;
    script.onload = () => {
      const autoRenderScript = document.createElement('script');
      autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
      autoRenderScript.async = true;
      autoRenderScript.onload = () => {
        triggerMathRender();
      };
      document.head.appendChild(autoRenderScript);
    };
    document.head.appendChild(script);
  }, []);

  const triggerMathRender = () => {
    if (window.renderMathInElement) {
      setTimeout(() => {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }, 150);
    }
  };

  useEffect(() => {
    triggerMathRender();
  }, [messages, activeTab]);

  useEffect(() => {
    if (messages.length > 1 || isTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    localStorage.setItem('lucas_tutor_xp', xp.toString());
    localStorage.setItem('lucas_tutor_badges', JSON.stringify(unlockedBadges));
    localStorage.setItem('lucas_tutor_streak', streak.toString());
  }, [xp, unlockedBadges, streak]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      setSelectedVoiceName((currentVoiceName) => currentVoiceName || getBestPortugueseVoice(voices)?.name || '');
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('lucas_tutor_voice_name', selectedVoiceName);
    localStorage.setItem('lucas_tutor_voice_rate', voiceRate.toString());
    localStorage.setItem('lucas_tutor_voice_pitch', voicePitch.toString());
  }, [selectedVoiceName, voiceRate, voicePitch]);

  useEffect(() => {
    localStorage.setItem('lucas_tutor_tts_model', ttsModel);
    localStorage.setItem('lucas_tutor_tts_voice', ttsVoice);
    localStorage.setItem('lucas_tutor_tts_instructions', ttsInstructions);
  }, [ttsModel, ttsVoice, ttsInstructions]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleXpGain = (amount) => {
    setFloatingXp(`+${amount} XP`);
    setTimeout(() => setFloatingXp(null), 1800);

    setXp(prev => {
      const nextXp = prev + amount;
      checkBadgeUnlock(nextXp);
      return nextXp;
    });
  };

  const getLevelInfo = (currentXp) => {
    let currentLevel = LEVEL_TITLES[0];
    let nextLevel = LEVEL_TITLES[1];

    for (let i = 0; i < LEVEL_TITLES.length; i++) {
      if (currentXp >= LEVEL_TITLES[i].xpNeeded) {
        currentLevel = LEVEL_TITLES[i];
        nextLevel = LEVEL_TITLES[i + 1] || LEVEL_TITLES[i];
      }
    }
    return { currentLevel, nextLevel };
  };

  const { currentLevel, nextLevel } = getLevelInfo(xp);
  const xpInCurrentLevel = xp - currentLevel.xpNeeded;
  const xpNeededForNext = nextLevel.xpNeeded - currentLevel.xpNeeded;
  const progressPercent = xpNeededForNext > 0 ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100) : 100;
  const displayStreak = Math.max(streak, 12);

  const checkBadgeUnlock = (currentXp) => {
    const badges = [...unlockedBadges];
    let newlyUnlocked = [];

    if (currentXp >= 100 && !badges.includes('Álgebra básica')) {
      newlyUnlocked.push('Álgebra básica');
    }
    if (currentXp >= 250 && !badges.includes('Geometria essencial')) {
      newlyUnlocked.push('Geometria essencial');
    }
    if (currentXp >= 500 && !badges.includes('Triângulos')) {
      newlyUnlocked.push('Triângulos');
    }
    if (currentXp >= 800 && !badges.includes('Funções')) {
      newlyUnlocked.push('Funções');
    }
    if (currentXp >= 1200 && !badges.includes('Raciocínio avançado')) {
      newlyUnlocked.push('Raciocínio avançado');
    }

    if (newlyUnlocked.length > 0) {
      const updated = [...badges, ...newlyUnlocked];
      setUnlockedBadges(updated);
      showToast(`Novo marco desbloqueado: ${newlyUnlocked[newlyUnlocked.length - 1]}`, 'success');
    }
  };

  const speakWithBrowserVoice = (textToRead) => {
    window.speechSynthesis?.cancel();

    const voices = availableVoices.length ? availableVoices : window.speechSynthesis?.getVoices() || [];
    const preferredVoice = getBestPortugueseVoice(voices, selectedVoiceName);

    const utterance = new SpeechSynthesisUtterance(textToRead);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || 'pt-BR';
    } else {
      utterance.lang = 'pt-BR';
    }
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.volume = 1;
    window.speechSynthesis?.speak(utterance);
  };

  const playAudioBlob = (audioBlob) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioUrlRef.current = audioUrl;
    audioPlayerRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      audioUrlRef.current = null;
      audioPlayerRef.current = null;
    };

    return audio.play();
  };

  const speakText = async (text, force = false) => {
    if (!force && !voiceEnabled) return;

    const textToRead = cleanTextForSpeech(text);
    if (!textToRead) return;

    stopVoice();

    try {
      if (!apiKey.trim()) {
        throw new Error('Adicione sua chave do Gemini em Ajustes para usar a voz premium.');
      }

      const promptForVoice = `${ttsInstructions}\n\nTexto para narrar:\n"${textToRead.slice(0, 4500)}"`;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptForVoice }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: ttsVoice
                }
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Falha na voz por API: ${response.status}`);
      }

      const data = await response.json();
      const inlineAudio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!inlineAudio) {
        throw new Error('O Gemini nao retornou audio.');
      }

      await playAudioBlob(pcmToWavBlob(base64ToUint8Array(inlineAudio)));
    } catch (err) {
      if (force) {
        setCustomError(`Não consegui tocar a voz premium do Gemini agora. ${err.message}`);
      }
      speakWithBrowserVoice(textToRead);
    }
  };

  const stopVoice = () => {
    window.speechSynthesis?.cancel();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const sendToGemini = async (userPrompt, base64Img = null) => {
    if (!apiKey) {
      return simulateOfflineResponse(userPrompt);
    }

    const modelToUse = customModel || selectedModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

    const parts = [{ text: userPrompt }];
    if (base64Img) {
      const mimeType = base64Img.split(';')[0].split(':')[1];
      const data = base64Img.split(',')[1];
      parts.push({ inlineData: { mimeType, data } });
    }

    const payload = {
      contents: [{ role: "user", parts: parts }],
      systemInstruction: {
        parts: [{
          text: `Você é um tutor particular de matemática para um estudante do 9º ano chamado Lucas. Seja claro, acolhedor e direto. Use português brasileiro natural, sem gírias ou linguagem promocional.

                 REGRAS DE OURO DIDÁTICAS:
                 1. NUNCA revele a resposta final ou o resultado do cálculo de imediato.
                 2. Se Lucas enviar uma foto ou pergunta de matemática:
                    - Cumprimente-o de forma breve.
                    - Mostre que você identificou o problema matemático de forma simples e direta no português brasileiro.
                    - Formate as equações de modo belíssimo usando LaTeX (ex: $$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$).
                    - Divida a resolução em micro-etapas (no máximo 3 passos simples).
                    - Peça para ele fazer APENAS o primeiro micro-cálculo e te responder no chat.
                 3. Mantenha o foco no raciocínio. Soe como um professor paciente e moderno, não como propaganda de jogo.`
        }]
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro na API Gemini: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar a resposta agora. Tente enviar novamente.";
    } catch (err) {
      setCustomError(`Ocorreu um erro ao conectar: ${err.message}. Verifique sua chave de API nos ajustes ou use o modo demonstração.`);
      return null;
    }
  };

  const simulateOfflineResponse = (prompt) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (prompt.includes('bhaskara') || prompt.includes('2º grau')) {
          resolve("**Equação do 2º grau**\n\nBoa, Lucas. Para resolver com Bhaskara, começamos pelo discriminante:\n\n$$\\Delta = b^2 - 4ac$$\n\nNa equação $$x^2 - 5x + 6 = 0$$, os coeficientes são:\n\n* **a** = 1\n* **b** = -5\n* **c** = 6\n\nPrimeiro passo: calcule $$b^2$$, ou seja, $$(-5) \\times (-5)$$. Quanto dá?");
        } else if (prompt.includes('pitágoras') || prompt.includes('triângulo')) {
          resolve("**Teorema de Pitágoras**\n\nEm um triângulo retângulo, usamos:\n\n$$a^2 = b^2 + c^2$$\n\nOs catetos medem 3 cm e 4 cm. Para achar a hipotenusa, primeiro elevamos os catetos ao quadrado:\n\n* Quanto é $$3^2$$?\n* Quanto é $$4^2$$?\n\nCalcule esses dois valores e me diga a soma deles.");
        } else {
          resolve("**Modo demonstração**\n\nAinda não encontrei uma chave do Gemini salva nos ajustes. Com a chave configurada, eu consigo analisar fotos e responder dúvidas personalizadas.\n\nEnquanto isso, você pode abrir a aba **Missões** e praticar com desafios prontos.");
        }
      }, 1500);
    });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !uploadedImage) return;

    const currentMessageText = inputMessage;
    const currentImage = uploadedImage;

    const lucasMessage = {
      id: `lucas-${Date.now()}`,
      role: 'user',
      text: currentMessageText || "Enviei a foto do exercício. Você me ajuda a entender por onde começar?",
      image: currentImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, lucasMessage]);
    setInputMessage('');
    setUploadedImage(null);
    setImagePreview(null);
    setIsTyping(true);

    const promptText = currentMessageText || "Analise a imagem de matemática e me ajude a resolver de forma didática.";
    const responseText = await sendToGemini(promptText, currentImage);

    setIsTyping(false);

    if (responseText) {
      const tutorMessage = {
        id: `tutor-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, tutorMessage]);
      handleXpGain(15);

      if (voiceEnabled) {
        speakText(responseText);
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        setImagePreview(reader.result);
        showToast("Imagem carregada. Escreva sua pergunta e envie.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const trilhasMatematica = [
    {
      id: 'bhaskara',
      titulo: 'Equações de 2º Grau',
      sub: 'A famosa Fórmula de Bhaskara',
      ritmo: '12 min',
      nivel: 'Prova chegando',
      xp: 25,
      accent: 'from-blue-600 to-cyan-500',
      formula: '$$ax^2 + bx + c = 0$$',
      problema: 'Encontre as raízes da equação: $$x^2 - 5x + 6 = 0$$'
    },
    {
      id: 'pitágoras',
      titulo: 'Teorema de Pitágoras',
      sub: 'Hipotenusa e Catetos no Triângulo Retângulo',
      ritmo: '9 min',
      nivel: 'Aquecimento',
      xp: 20,
      accent: 'from-emerald-500 to-lime-400',
      formula: '$$a^2 = b^2 + c^2$$',
      problema: 'Um triângulo retângulo tem catetos de 3 cm e 4 cm. Qual é a medida da hipotenusa?'
    },
    {
      id: 'trig',
      titulo: 'Razões Trigonométricas',
      sub: 'Seno, Cosseno e Tangente',
      ritmo: '15 min',
      nivel: 'Desafio médio',
      xp: 30,
      accent: 'from-fuchsia-500 to-rose-400',
      formula: '$$\\text{Seno} = \\frac{\\text{Cateto Oposto}}{\\text{Hipotenusa}}$$',
      problema: 'Num triângulo retângulo com hipotenusa de 10 m e ângulo de 30°, qual a medida do cateto oposto?'
    },
    {
      id: 'funcao',
      titulo: 'Funções do 1º e 2º Grau',
      sub: 'Estudo de retas, coeficientes e gráficos',
      ritmo: '10 min',
      nivel: 'Reta e gráfico',
      xp: 25,
      accent: 'from-amber-400 to-orange-500',
      formula: '$$f(x) = ax + b$$',
      problema: 'Se uma função afim é dada por $$f(x) = 2x + 3$$, qual é o valor de $$f(5)$$?'
    }
  ];

  const quickActions = [
    {
      id: 'photo',
      title: 'Corrigir foto',
      detail: 'manda a questão',
      icon: Camera,
      prompt: 'Vou enviar uma foto do exercício. Analise com calma e me ajude só com o primeiro passo.',
      toast: 'Modo foto pronto.'
    },
    {
      id: 'stuck',
      title: 'Estou travado',
      detail: 'me dá uma pista',
      icon: Target,
      prompt: 'Estou travado em uma questão de matemática. Me dê uma pista sem entregar a resposta final.',
      toast: 'Pista preparada.'
    },
    {
      id: 'quiz',
      title: 'Me testa',
      detail: '3 perguntas rápidas',
      icon: ClipboardList,
      prompt: 'Crie um mini treino de 3 perguntas de matemática do 9º ano. Uma pergunta por vez, sem mostrar a resposta antes.',
      toast: 'Mini treino criado.'
    }
  ];

  const startQuickAction = (action) => {
    setInputMessage(action.prompt);
    setActiveTab('chat');
    showToast(action.toast, 'success');
  };

  const iniciarTrilha = (trilha) => {
    setInputMessage(`Estou estudando "${trilha.titulo}" no 9º ano. Pode me ajudar a resolver essa tarefa passo a passo? \n\nQuestão: ${trilha.problema}`);
    setActiveTab('chat');
    showToast(`${trilha.titulo} iniciado.`, 'success');
  };

  const saveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('lucas_tutor_api_key', apiKey);
    localStorage.setItem('lucas_tutor_model', selectedModel);
    localStorage.setItem('lucas_tutor_custom_model', customModel);
    setShowSettings(false);
    showToast("Ajustes salvos.", "success");
  };

  return (
    <div className="min-h-screen bg-[#f5f7ff] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">

      {/* Efeito Visual Flutuante ao ganhar XP */}
      {floatingXp && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-slate-900 text-white font-semibold px-4 py-2 rounded-full shadow-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{floatingXp}</span>
        </div>
      )}

      <div className="min-h-screen bg-white md:bg-[#f4f7ff]">
        <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-white px-5 pb-8 pt-3 text-[#171b44] md:my-6 md:rounded-[38px] md:shadow-2xl md:shadow-blue-950/10">
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

          <header className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14">
                <span className="absolute left-0 top-1 h-11 w-2.5 rounded-full bg-blue-600" />
                <span className="absolute left-1 top-1 h-2.5 w-12 origin-left rotate-[42deg] rounded-full bg-blue-600" />
                <span className="absolute right-0 top-1 h-2.5 w-12 origin-right -rotate-[42deg] rounded-full bg-blue-600" />
                <span className="absolute bottom-2 left-6 h-2.5 w-9 -rotate-45 rounded-full bg-lime-400" />
              </div>
              <h1 className="text-[30px] font-extrabold leading-[0.92] tracking-tight">
                Matemática<br />
                <span className="text-blue-600">Fácil</span>
              </h1>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <Flame className="h-7 w-7 fill-orange-500/20 text-orange-500" />
                <div className="leading-tight">
                  <p className="text-2xl font-extrabold">{displayStreak}</p>
                  <p className="text-sm text-[#171b44]">dias</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="relative h-[58px] w-[58px] overflow-hidden rounded-full border-[4px] border-blue-200 bg-blue-50"
                title="Ajustes do Lucas"
              >
                <img src="/assets/lucas-avatar.png" alt="Lucas" className="h-full w-full object-cover object-top" />
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
              </button>
            </div>
          </header>

          {activeTab === 'chat' ? (
            <>
              <section className="relative mt-7 overflow-hidden rounded-[28px] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-950/5">
                <div className="absolute inset-y-0 right-0 w-[39%] rounded-r-[28px] bg-blue-600" style={{ clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)' }} />
                <div className="relative z-10 grid grid-cols-[1fr_108px] gap-4">
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <Target className="h-7 w-7" />
                      </span>
                      <div>
                        <p className="text-sm font-bold">Desafio de hoje</p>
                        <p className="mt-2 text-[18px] leading-snug text-[#283056]">
                          Resolva 3 exercícios de<br />
                          <span className="text-blue-600">Equações do 1º grau</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 flex items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 text-white">
                        <CheckCircle className="h-6 w-6" />
                      </span>
                      <span className="h-0.5 flex-1 bg-lime-400" />
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 text-white">
                        <CheckCircle className="h-6 w-6" />
                      </span>
                      <span className="h-0.5 flex-1 bg-lime-400" />
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-lg font-bold text-[#171b44]">3</span>
                    </div>
                  </div>

                  <div className="relative z-10 pl-2 pt-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold">+40</span>
                      <span className="rounded-full bg-[#171b44] px-2 py-1 text-xs font-bold text-lime-400">XP</span>
                    </div>
                    <p className="mt-1 text-[17px] leading-tight text-blue-50">para o próximo nível</p>
                    <div className="mt-9 h-2 rounded-full bg-blue-400/50">
                      <div className="h-full w-1/2 rounded-full bg-lime-400" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-5 overflow-hidden rounded-[30px] border-2 border-blue-600 bg-white shadow-xl shadow-blue-600/10">
                <div className="relative h-[305px] overflow-hidden bg-blue-600 px-6 pt-12 text-white">
                  <span className="absolute left-5 top-8 text-3xl text-white/15">x²</span>
                  <span className="absolute right-8 top-7 text-4xl text-white/20">√a</span>
                  <span className="absolute right-10 top-28 text-3xl text-white/15">a²+b²</span>
                  <span className="absolute left-6 bottom-16 h-20 w-20 rounded-full border-2 border-dashed border-white/15" />
                  <img src="/assets/lucas-avatar.png" alt="Tutor Lucas" className="absolute -bottom-7 -left-9 w-[210px] max-w-none" />

                  <div className="relative ml-[138px]">
                    <p className="flex items-center gap-2 text-sm text-blue-50">
                      <span className="h-3 w-3 rounded-full bg-lime-400" />
                      Seu tutor de matemática
                    </p>
                    <h2 className="mt-6 text-[34px] font-extrabold leading-tight tracking-tight">Fala, Lucas! 👋</h2>
                    <p className="mt-3 text-[24px] leading-tight text-blue-100">Em que posso te ajudar hoje?</p>
                  </div>
                </div>

                <div className="relative bg-white px-5 pb-6 pt-16">
                  {imagePreview && (
                    <div className="absolute left-7 right-7 top-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <span>Foto anexada para análise</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImage(null);
                          setImagePreview(null);
                        }}
                        className="text-blue-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="absolute -top-10 left-6 right-6 flex h-20 items-center gap-3 rounded-full bg-white p-3 shadow-xl shadow-blue-950/10">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Fazer uma pergunta..."
                      className="min-w-0 flex-1 bg-transparent px-3 text-[18px] text-[#171b44] outline-none placeholder:text-slate-300"
                    />
                    <button type="submit" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                      <Send className="h-7 w-7" />
                    </button>
                  </form>

                  <div className="grid grid-cols-2 divide-x divide-slate-200 pt-3">
                    <label className="flex cursor-pointer items-center gap-4 pr-4">
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Camera className="h-7 w-7" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold leading-tight">Enviar foto</span>
                        <span className="block text-sm text-slate-500">de um exercício</span>
                      </span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setVoiceEnabled(true);
                        speakText(VOICE_SAMPLE_TEXT, true);
                      }}
                      className="flex items-center gap-4 pl-4 text-left"
                    >
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-lime-50 text-lime-600">
                        <Mic className="h-7 w-7" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold leading-tight">Falar com o tutor</span>
                        <span className="block text-sm text-slate-500">(voz)</span>
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6 grid grid-cols-4 gap-3">
                {[
                  { label: 'Revisar conteúdos', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
                  { label: 'Desafios diários', icon: Target, color: 'bg-lime-50 text-lime-600' },
                  { label: 'Meu progresso', icon: BarChart3, color: 'bg-orange-50 text-orange-500' },
                  { label: 'Conquistas', icon: Medal, color: 'bg-violet-50 text-violet-600' }
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => item.label.includes('Desafios') ? setActiveTab('trilhas') : showToast(`${item.label} em breve.`, 'success')}
                      className={`${item.color} flex min-h-[92px] flex-col items-center justify-center rounded-2xl p-2 text-center shadow-sm`}
                    >
                      <ItemIcon className="h-8 w-8" />
                      <span className="mt-3 text-[13px] font-semibold leading-tight text-[#171b44]">{item.label}</span>
                    </button>
                  );
                })}
              </section>

              <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <span className="text-yellow-400">⚡</span>
                    Missão da semana
                  </h3>
                  <button type="button" onClick={() => setActiveTab('trilhas')} className="text-sm font-bold text-blue-600">Ver todas</button>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lime-50 text-lime-600">
                    <BookOpen className="h-8 w-8" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-bold">Foque em Funções</h4>
                    <p className="text-sm leading-snug text-slate-500">Complete 5 atividades sobre função do 1º grau</p>
                  </div>
                  <button type="button" onClick={() => iniciarTrilha(trilhasMatematica[3])} className="flex shrink-0 items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-[#171b44]">
                    <span><strong>2/5</strong><br /><span className="text-xs text-slate-500">concluídas</span></span>
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div className="h-full w-[40%] rounded-full bg-lime-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-600">40%</span>
                </div>
              </section>
            </>
          ) : (
            <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-blue-950/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold">Missões</h2>
                  <p className="mt-1 text-sm text-slate-500">Escolha um treino rápido para hoje.</p>
                </div>
                <button type="button" onClick={() => setActiveTab('chat')} className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600">Tutor</button>
              </div>
              <div className="mt-5 space-y-3">
                {trilhasMatematica.map((trilha) => (
                  <button
                    key={trilha.id}
                    type="button"
                    onClick={() => iniciarTrilha(trilha)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-bold">{trilha.titulo}</p>
                        <p className="mt-1 text-xs text-slate-500">{trilha.ritmo} • +{trilha.xp} XP</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <nav className="mx-auto mt-5 w-full max-w-[390px] rounded-[30px] border border-slate-200 bg-white/95 p-2 shadow-xl shadow-blue-950/10 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-base font-bold transition-all ${activeTab === 'chat' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}
            >
              <MessageCircle className="h-6 w-6" />
              Tutor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trilhas')}
              className={`flex items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-base font-bold transition-all ${activeTab === 'trilhas' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}
            >
              <ClipboardList className="h-6 w-6" />
              Missões
            </button>
          </div>
        </nav>
      </div>

      <header className="hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 via-cyan-500 to-lime-400 p-2.5 rounded-2xl shadow-lg shadow-blue-600/20">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md border border-blue-100">
                  9º ano
                </span>
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-orange-600 font-semibold">
                  <Flame className="w-3 h-3 fill-orange-500/20" />
                  {streak} dias
                </span>
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-slate-950 tracking-tight leading-tight">
                Matemática Fácil<span className="hidden sm:inline"> com Lucas</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden md:flex bg-white p-2 rounded-2xl border border-slate-200 items-center gap-3 w-60 shadow-sm">
              <div className="relative shrink-0">
                  <div className="bg-lime-100 p-1.5 rounded-xl text-lime-700">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="absolute -top-1 -right-1.5 bg-blue-600 text-[9px] px-1 rounded-full text-white font-bold">
                  Lv.{currentLevel.level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center text-[10px] mb-1 font-medium">
                  <span className="text-slate-600 truncate max-w-[128px]">{currentLevel.title}</span>
                  <span className="text-slate-500">{xp}/{nextLevel.xpNeeded}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-lime-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controle de Voz do Tutor */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) stopVoice();
                showToast(voiceEnabled ? "Explicações faladas desativadas." : "Explicações faladas ativadas.", "success");
              }}
              className={`p-2.5 rounded-xl transition-all border ${voiceEnabled ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200'}`}
              title={voiceEnabled ? "Mudar para modo silencioso" : "Ativar leitura por voz suave"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border border-slate-200"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </button>
          </div>

        </div>
      </header>

      {/* Painel de configuração */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl p-6 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <Settings className="text-blue-600 w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-900">Ajustes do Tutor</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <p>
                Aqui você ajusta a voz por API, a inteligência do Gemini e as chaves usadas no Tutor.
              </p>
            </div>

            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Chave de API do Gemini</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua API key começando com AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Modelo do tutor</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-sans"
                >
                  {GEMINI_CHAT_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Modelo Gemini específico</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Ex: gemini-2.5-pro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Deixe em branco para usar a opção selecionada no seletor acima.</span>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 uppercase tracking-wider">Voz do tutor</label>
                    <p className="text-[11px] text-blue-800/75 mt-0.5">
                      Usa sua própria chave Gemini e os créditos da sua conta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceEnabled(true);
                      speakText(VOICE_SAMPLE_TEXT, true);
                    }}
                    className="shrink-0 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4" />
                    Testar
                  </button>
                </div>

                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 disabled:text-slate-400"
                >
                  {GEMINI_TTS_VOICES.map((voice) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>

                <select
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700"
                >
                  {GEMINI_TTS_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={ttsInstructions}
                  onChange={(e) => setTtsInstructions(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 resize-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-blue-900">
                    Fallback velocidade: {voiceRate.toFixed(2)}x
                    <input
                      type="range"
                      min="0.75"
                      max="1.1"
                      step="0.05"
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(Number(e.target.value))}
                      className="w-full accent-blue-600 mt-2"
                    />
                  </label>
                  <label className="text-xs font-semibold text-blue-900">
                    Fallback tom: {voicePitch.toFixed(2)}
                    <input
                      type="range"
                      min="0.85"
                      max="1.2"
                      step="0.05"
                      value={voicePitch}
                      onChange={(e) => setVoicePitch(Number(e.target.value))}
                      className="w-full accent-blue-600 mt-2"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-sm"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÁREA DE TRABALHO DO LUCAS */}
      <main className="hidden">

        {/* Barra lateral */}
        <aside className="hidden lg:col-span-1 lg:flex flex-col gap-5">

          {/* Navegação */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-row lg:flex-col gap-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Tutor</span>
            </button>
            <button
              onClick={() => setActiveTab('trilhas')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${activeTab === 'trilhas' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Missões</span>
            </button>
          </div>

          <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-lg shadow-slate-950/10 overflow-hidden relative">
            <div aria-hidden="true" className="absolute -right-2 -top-4 text-7xl font-semibold leading-none text-white/5">x</div>
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-lime-300">
                <Target className="w-3.5 h-3.5" />
                Desafio de hoje
              </div>
              <h3 className="mt-2 text-base font-semibold leading-tight">Bhaskara em 3 passos</h3>
              <p className="mt-1 text-xs text-slate-300">Treino rápido para ganhar confiança antes da prova.</p>
              <button
                onClick={() => iniciarTrilha(trilhasMatematica[0])}
                className="mt-4 w-full bg-white text-slate-950 hover:bg-lime-100 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              >
                Começar agora
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-600 font-sans">Progresso</h3>
            </div>
            <div className="space-y-2">
              {['Primeira sessão', 'Álgebra básica', 'Geometria essencial', 'Triângulos', 'Funções', 'Raciocínio avançado'].map((badge) => {
                const isUnlocked = unlockedBadges.includes(badge);
                return (
                  <div
                    key={badge}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isUnlocked
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 shrink-0 ${isUnlocked ? 'text-blue-600' : 'text-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{badge}</p>
                      <p className="text-[9px] text-slate-500 leading-none mt-1">
                        {badge.includes('Primeira') && 'Primeiro acesso'}
                        {badge.includes('Álgebra') && '100 XP'}
                        {badge.includes('Geometria') && '250 XP'}
                        {badge.includes('Triângulos') && '500 XP'}
                        {badge.includes('Funções') && '800 XP'}
                        {badge.includes('avançado') && '1200 XP'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        {/* CONTAINER PRINCIPAL DO CONTEÚDO ATIVO */}
        <section className="lg:col-span-3 flex flex-col h-[calc(100dvh-170px)] lg:h-auto lg:min-h-[550px] bg-white border border-white rounded-[28px] shadow-xl shadow-blue-950/5 overflow-hidden">

          {/* TAB CHAT DO TUTOR */}
          {activeTab === 'chat' && (
            <div className="flex flex-col flex-1 h-full">

              <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="bg-blue-600 p-2 rounded-xl border border-blue-500 text-white shadow-sm shadow-blue-600/20">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950 flex items-center gap-1.5">
                      <span>Tutor de matemática</span>
                      <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">online</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">Modo foco: uma etapa por vez</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2 text-slate-500 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 border border-slate-200"
                  title="Começar de novo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Histórico das Mensagens */}
              <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-[#f7f8fc]">
                <div className="rounded-[24px] bg-slate-950 text-white p-4 md:p-5 shadow-lg shadow-slate-950/10 overflow-hidden relative">
                  <div aria-hidden="true" className="absolute right-4 top-4 text-7xl font-semibold leading-none text-white/5">9</div>
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-lime-300">
                        <Target className="w-3.5 h-3.5" />
                        Desafio de hoje
                      </div>
                      <span className="rounded-full bg-lime-300 px-2 py-1 text-[10px] font-bold text-slate-950">+25 XP</span>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold leading-tight">Bhaskara sem drama.</h2>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
                      Treino curto, com pista no tempo certo e sem entregar a resposta final.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => iniciarTrilha(trilhasMatematica[0])}
                        className="bg-white text-slate-950 hover:bg-lime-100 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                      >
                        Começar desafio
                      </button>
                      <button
                        onClick={() => startQuickAction(quickActions[2])}
                        className="border border-white/15 bg-white/5 text-white hover:bg-white/10 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                      >
                        Quero um quiz
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => startQuickAction(action)}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <ActionIcon className="w-4 h-4" />
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-slate-950">{action.title}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{action.detail}</span>
                      </button>
                    );
                  })}
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed text-sm shadow-sm transition-all ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-md'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-md'
                    }`}>

                      {msg.image && (
                        <div className="mb-3 max-w-sm rounded-lg overflow-hidden border border-white/10">
                          <img src={msg.image} alt="Tarefa do Lucas" className="w-full h-auto object-contain max-h-52" />
                        </div>
                      )}

                      <div className={`whitespace-pre-line prose max-w-none font-sans leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                        {msg.text}
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => speakText(msg.text)}
                            className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 transition-all hover:bg-blue-100"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Ouvir explicação</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md p-4 flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-xs text-slate-500 font-medium">Preparando a próxima dica...</span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Entrada de Texto e Câmera de Foto de Lição */}
              <div className="p-3 md:p-4 bg-white border-t border-slate-200">
                {imagePreview && (
                  <div className="mb-3 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <img src={imagePreview} alt="Tarefa selecionada" className="w-12 h-12 rounded-lg object-cover border border-sky-200" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Foto anexada</p>
                        <p className="text-[10px] text-slate-500">Pronta para o Tutor analisar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setImagePreview(null);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5 bg-white rounded-lg hover:bg-rose-50 transition-all border border-slate-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">

                  {/* Botão Câmera/Upload */}
                  <label className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer h-full" title="Tirar foto ou carregar lição">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Escrita de texto */}
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={imagePreview ? "Pergunte sobre a foto..." : "Digite sua dúvida ou peça um desafio..."}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-2xl px-4 text-sm text-slate-800 placeholder:text-slate-400"
                  />

                  {/* Enviar */}
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB TRILHAS */}
          {activeTab === 'trilhas' && (
            <div className="p-4 md:p-6 flex flex-col flex-1 bg-[#f7f8fc]">
              <div className="mb-4 rounded-[24px] bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                      <BookOpen className="text-blue-600" />
                      <span>Missões do 9º ano</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Treinos curtos para sentir progresso sem ficar preso numa aula gigante.</p>
                  </div>
                  <button
                    onClick={() => iniciarTrilha(trilhasMatematica[0])}
                    className="bg-slate-950 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Missão do dia
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <p className="mt-2 text-lg font-semibold text-slate-950">{streak}</p>
                    <p className="text-[10px] text-slate-500">dias</p>
                  </div>
                  <div className="rounded-2xl bg-lime-50 p-3">
                    <Medal className="w-4 h-4 text-lime-700" />
                    <p className="mt-2 text-lg font-semibold text-slate-950">Lv.{currentLevel.level}</p>
                    <p className="text-[10px] text-slate-500">nível</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <BarChart3 className="w-4 h-4 text-rose-600" />
                    <p className="mt-2 text-lg font-semibold text-slate-950">{xp}</p>
                    <p className="text-[10px] text-slate-500">XP</p>
                  </div>
                </div>
              </div>

              {/* Lista de missões */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {trilhasMatematica.map((trilha, index) => (
                  <div
                    key={trilha.id}
                    className="bg-white border border-slate-200 hover:border-blue-200 rounded-[22px] transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden"
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${trilha.accent}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h5 className="font-semibold text-sm text-slate-950">{trilha.titulo}</h5>
                            <p className="text-[10px] text-slate-500 font-medium">{trilha.sub}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">+{trilha.xp} XP</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <Clock3 className="w-3.5 h-3.5" />
                        {trilha.ritmo}
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        {trilha.nivel}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 my-3 text-center text-xs font-mono text-slate-700">
                        {trilha.formula}
                      </div>

                      <div className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-lg border border-dashed border-slate-200">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Exercício:</span> {trilha.problema}
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex justify-end">
                      <button
                        onClick={() => iniciarTrilha(trilha)}
                        className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5"
                      >
                        <span>Iniciar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>

      <nav className="hidden">
        <div className="grid h-16 grid-cols-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${activeTab === 'chat' ? 'text-blue-700' : 'text-slate-500'}`}
        >
          <MessageCircle className="w-5 h-5" />
          Tutor
        </button>
        <button
          onClick={() => setActiveTab('trilhas')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${activeTab === 'trilhas' ? 'text-blue-700' : 'text-slate-500'}`}
        >
          <BookOpen className="w-5 h-5" />
          Missões
        </button>
        </div>
      </nav>

      {/* FOOTER */}
      <footer className="hidden">
        <p>Matemática Fácil • Conteúdos do 9º ano</p>
      </footer>

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA DE CHAT */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-rose-100 max-w-sm w-full rounded-2xl p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900 mb-2 font-sans">Reiniciar estudo?</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Lucas, se você apagar a conversa, seu histórico com o Tutor será zerado. Tem certeza de que quer reiniciar este estudo do zero?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl text-xs font-bold transition-all text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    text: "Oi, Lucas. Pronto para destravar matemática sem enrolação?\n\nManda uma dúvida, uma foto do exercício ou escolhe uma missão rápida.\n\nEu te guio por etapas e peço uma parte de cada vez. Assim você entende o caminho, não só a resposta.",
                    timestamp: new Date()
                  }]);
                  setShowClearConfirm(false);
                  showToast("Histórico zerado.", "success");
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-rose-600/25"
              >
                Zerar histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERRO CUSTOMIZADO */}
      {customError && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-amber-100 max-w-md w-full rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-yellow-600 mb-3">
              <Info className="w-5 h-5 shrink-0" />
              <h4 className="text-md font-semibold">Aviso</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {customError}
            </p>
            <button
              onClick={() => setCustomError(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 text-slate-700"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
