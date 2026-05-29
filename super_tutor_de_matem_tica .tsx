import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Camera, 
  Upload, 
  Send, 
  RotateCcw, 
  Sparkles, 
  Settings, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  Award, 
  Trash2, 
  Edit3, 
  HelpCircle,
  CheckCircle,
  Menu,
  X,
  FileText,
  MousePointer,
  Eraser
} from 'lucide-react';

// Chave e modelo inicial padrão. O utilizador poderá alterar nas configurações locais.
const DEFAULT_MODEL = "gemini-2.5-flash-preview-09-2025";

export default function App() {
  // --- Estados do Aplicativo ---
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lucas_tutor_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('lucas_tutor_model') || DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('lucas_tutor_custom_model') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'lousa', 'trilhas'
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null); // base64 da imagem
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('lucas_tutor_xp') || '0', 10));
  const [unlockedBadges, setUnlockedBadges] = useState(() => JSON.parse(localStorage.getItem('lucas_tutor_badges') || '["Iniciante"]'));
  const [notification, setNotification] = useState(null);

  // Lista de mensagens do Chat
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Olá, Lucas! 🚀 Eu sou o teu Tutor Particular de Matemática do 9º Ano! Estou aqui para te ajudar a desvendar qualquer mistério dos números, equações ou geometria.\n\nComo funciona? Podes enviar-me uma pergunta, escolher um tópico da aba **Trilhas**, desenhar na nossa **Lousa** ou clicar na **Câmera/Upload** para me enviares uma foto da tua lição de casa! \n\n*Minha missão especial:* Eu vou ensinar-te o passo a passo de como resolver, dando-te dicas inteligentes, mas **nunca** te darei a resposta final de bandeja! Vamos aprender juntos?",
      timestamp: new Date()
    }
  ]);

  // --- Estados da Lousa Interativa ---
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#a78bfa'); // violet-400
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush'); // 'brush' ou 'eraser'

  const chatEndRef = useRef(null);

  // --- Efeitos e Inicializações ---
  useEffect(() => {
    // Rolar chat para o final ao receber novas mensagens
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Salvar conquistas localmente
  useEffect(() => {
    localStorage.setItem('lucas_tutor_xp', xp.toString());
    localStorage.setItem('lucas_tutor_badges', JSON.stringify(unlockedBadges));
  }, [xp, unlockedBadges]);

  // Injetar KaTeX para renderizar fórmulas matemáticas de forma belíssima
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

  // Forçar renderização de fórmulas matemáticas nas mensagens
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
      }, 100);
    }
  };

  useEffect(() => {
    triggerMathRender();
  }, [messages, activeTab]);

  // Mostrar Notificação Temporária
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // --- Sistema de Conquistas (XP e Emblemas) ---
  const addXp = (amount) => {
    setXp(prev => {
      const newXp = prev + amount;
      checkBadges(newXp);
      return newXp;
    });
  };

  const checkBadges = (currentXp) => {
    const badges = [...unlockedBadges];
    let unlockedNew = false;

    if (currentXp >= 100 && !badges.includes('Desbravador de Bhaskara')) {
      badges.push('Desbravador de Bhaskara');
      unlockedNew = true;
    }
    if (currentXp >= 300 && !badges.includes('Mestre de Pitágoras')) {
      badges.push('Mestre de Pitágoras');
      unlockedNew = true;
    }
    if (currentXp >= 600 && !badges.includes('Einstein do 9º Ano')) {
      badges.push('Einstein do 9º Ano');
      unlockedNew = true;
    }
    if (currentXp >= 1000 && !badges.includes('Lenda da Matemática')) {
      badges.push('Lenda da Matemática');
      unlockedNew = true;
    }

    if (unlockedNew) {
      setUnlockedBadges(badges);
      showToast(`🏆 Conquista Desbloqueada! O Lucas ganhou um novo título!`, 'success');
    }
  };

  // --- Função do Leitor de Voz (TTS) ---
  const speakText = (text) => {
    if (!voiceEnabled) return;
    window.speechSynthesis?.cancel(); // Cancelar vozes anteriores
    
    // Remover notações matemáticas complexas para melhorar a pronúncia falada
    let cleanText = text
      .replace(/\$\$([\s\S]*?)\$\$/g, ' expressando a fórmula ')
      .replace(/\$([\s\S]*?)\$/g, ' $1 ')
      .replace(/\\Delta/g, 'delta')
      .replace(/\\frac{([\s\S]*?)}{([\s\S]*?)}/g, ' $1 dividido por $2 ')
      .replace(/\\sqrt{([\s\S]*?)}/g, ' raiz quadrada de $1 ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-PT'; // Adaptado para voz padrão portuguesa
    utterance.rate = 1.1;
    window.speechSynthesis?.speak(utterance);
  };

  const stopVoice = () => {
    window.speechSynthesis?.cancel();
  };

  // --- Integração com a API do Gemini ---
  const sendToGemini = async (userPrompt, base64Img = null) => {
    const activeKey = apiKey || "";
    if (!activeKey) {
      showToast("⚠️ API Key do Gemini não configurada! Clica na engrenagem no topo para configurar e salvar.", "error");
      return null;
    }

    const modelToUse = customModel || selectedModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${activeKey}`;

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
          text: `Você é o "Tutor do Lucas", um professor de matemática brilhante, dinâmico, motivador e extremamente didático para um jovem do 9º ano do Ensino Fundamental II.
                 
                 DIRETRIZES CRUCIALMENTE OBRIGATÓRIAS:
                 1. NUNCA, SOB NENHUMA HIPÓTESE, DÊ O RESULTADO FINAL DIRETAMENTE.
                 2. Se o Lucas te enviar uma imagem ou texto com uma equação, exercício ou dúvida:
                    a. Cumprimente-o calorosamente usando emojis positivos.
                    b. Identifique o assunto matemático (Ex: Equação do 2º grau com Bhaskara, Teorema de Pitágoras, Razões trigonométricas no triângulo retângulo, Funções, Racionalização).
                    c. Explique a lógica por trás da questão e a fórmula necessária, usando formatação LaTeX para equações matemáticas (ex: $$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$ ou $a^2 = b^2 + c^2$).
                    d. Divida a resolução em passos pequenos e amigáveis.
                    e. Ajude-o a realizar APENAS O PRIMEIRO PASSO do cálculo ou dê uma pista brilhante para ele começar.
                    f. Termine fazendo uma pergunta convidativa e divertida para que ele execute o próximo passo e te responda.
                 3. Mantenha um tom encorajador e amigável, como um herói de videogame ou um mentor muito legal. Se ele acertar ou tentar, dê muito reforço positivo (XP)!
                 4. Use quebras de linha frequentes, negritos e emojis para tornar o texto leve e de fácil leitura para um adolescente.`
        }]
      }
    };

    // Algoritmo de Backoff Exponencial para retentativas de conexões instáveis
    let delay = 1000;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Erro na API Gemini: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) return outputText;
        throw new Error("Formato de resposta inesperado do Gemini.");
      } catch (err) {
        if (attempt === 4) {
          showToast(`Erro ao conectar com o Gemini: ${err.message}`, "error");
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    return null;
  };

  // --- Envio de Mensagem/Foto ---
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !uploadedImage) return;

    const currentMessageText = inputMessage;
    const currentImage = uploadedImage;

    // Criar mensagem do Lucas no chat local
    const lucasMessage = {
      id: `lucas-${Date.now()}`,
      role: 'user',
      text: currentMessageText || "Aqui está a foto da minha lição de matemática, podes ajudar-me a entender?",
      image: currentImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, lucasMessage]);
    setInputMessage('');
    setUploadedImage(null);
    setImagePreview(null);
    setIsTyping(true);

    // Prompt construído para integrar o contexto
    let apiPrompt = currentMessageText;
    if (currentImage && !currentMessageText) {
      apiPrompt = "Analise esta imagem com o exercício de matemática. Explique do que se trata e me ajude a resolver passo a passo, sem me dar o resultado direto!";
    } else if (currentImage && currentMessageText) {
      apiPrompt = `Analise esta imagem e responda à minha pergunta: ${currentMessageText}. Lembre-se de me guiar passo a passo de forma didática sem dar a resposta direta.`;
    }

    const tutorResponse = await sendToGemini(apiPrompt, currentImage);

    setIsTyping(false);

    if (tutorResponse) {
      const newTutorMessage = {
        id: `tutor-${Date.now()}`,
        role: 'assistant',
        text: tutorResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newTutorMessage]);
      addXp(15); // Recompensa por engajamento de estudo!
      
      // Falar a resposta se o som estiver ativo
      if (voiceEnabled) {
        speakText(tutorResponse);
      }
    }
  };

  // --- Processamento de Imagens ---
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        setImagePreview(reader.result);
        showToast("📸 Foto carregada com sucesso! Pronta para enviar.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  // --- Funções da Lousa Digital (Canvas) ---
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Suporte para Mouse e Touch (Dispositivos Móveis)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : brushColor; // Cores do fundo slate-800 ou lápis
    ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawingMode = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b'; // fundo slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    showToast("🧹 Lousa limpa!", "success");
  };

  // Ajustar o canvas para ser responsivo
  useEffect(() => {
    if (activeTab === 'lousa' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 450;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [activeTab]);

  // Enviar o rascunho da Lousa como foto para o Tutor no Chat
  const sendLousaToTutor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageBase64 = canvas.toDataURL('image/png');
    
    setUploadedImage(imageBase64);
    setImagePreview(imageBase64);
    setActiveTab('chat');
    showToast("✏️ Rascunho da Lousa anexado! Escreve a tua dúvida ou clica em enviar para o Tutor.", "success");
  };

  // --- Configurações Locais ---
  const saveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('lucas_tutor_api_key', apiKey);
    localStorage.setItem('lucas_tutor_model', selectedModel);
    localStorage.setItem('lucas_tutor_custom_model', customModel);
    setShowSettings(false);
    showToast("💾 Configurações de API salvas!", "success");
  };

  // --- Trilhas de Estudo do 9º Ano ---
  const trilhasMatematica = [
    {
      id: 'bhaskara',
      titulo: 'Equações de 2º Grau',
      sub: 'A famosa Fórmula de Bhaskara',
      emoji: '📐',
      formula: '$$ax^2 + bx + c = 0$$',
      problema: 'Encontra as raízes da equação: $$x^2 - 5x + 6 = 0$$'
    },
    {
      id: 'pitágoras',
      titulo: 'Teorema de Pitágoras',
      sub: 'Hipotenusa e Catetos no Triângulo Retângulo',
      emoji: '🔺',
      formula: '$$a^2 = b^2 + c^2$$',
      problema: 'Um triângulo tem catetos medindo 3 cm e 4 cm. Qual a medida da hipotenusa?'
    },
    {
      id: 'trig',
      titulo: 'Razões Trigonométricas',
      sub: 'Seno, Cosseno e Tangente',
      emoji: '🏹',
      formula: '$$\\text{Seno} = \\frac{\\text{Cateto Oposto}}{\\text{Hipotenusa}}$$',
      problema: 'Num triângulo retângulo com hipotenusa de 10 m e ângulo de 30°, qual a medida do cateto oposto?'
    },
    {
      id: 'funcao',
      titulo: 'Funções do 1º e 2º Grau',
      sub: 'Gráficos, retas e parábolas',
      emoji: '📈',
      formula: '$$f(x) = ax + b$$',
      problema: 'Se uma função afim é dada por $$f(x) = 2x + 3$$, qual o valor de $$f(5)$$?'
    },
    {
      id: 'potencias',
      titulo: 'Potenciação e Radiciação',
      sub: 'Propriedades de potências e raízes',
      emoji: '🔋',
      formula: '$$a^m \\cdot a^n = a^{m+n}$$',
      problema: 'Simplifica e racionaliza a expressão: $$\\frac{3}{\\sqrt{5}}$$'
    }
  ];

  const iniciarTrilha = (trilha) => {
    setInputMessage(`Estou a estudar "${trilha.titulo}" no 9º ano. Podes ajudar-me a resolver este exemplo passo a passo? \n\nQuestão: ${trilha.problema}`);
    setActiveTab('chat');
    showToast(`A iniciar Trilha de ${trilha.titulo}!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500 text-rose-200'
        }`}>
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-violet-400 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                Matemática com Lucas
              </h1>
              <p className="text-xs text-slate-400 font-medium">O teu Super Tutor Inteligente de 9º Ano</p>
            </div>
          </div>

          {/* Área de Conquistas e Configuração */}
          <div className="flex items-center flex-wrap gap-3">
            {/* XP Badge */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/80">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-slate-300">
                Lucas: <span className="text-yellow-400">{xp} XP</span>
              </span>
            </div>

            {/* Voice Control Button */}
            <button 
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) stopVoice();
                showToast(voiceEnabled ? "🔈 Voz do Tutor desativada" : "🔊 Voz do Tutor ativada", "success");
              }}
              className={`p-2 rounded-xl transition ${voiceEnabled ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
              title={voiceEnabled ? "Desativar voz do tutor" : "Ativar voz do tutor"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Settings Trigger */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              <Settings className="w-4 h-4" />
              <span>Chave API</span>
            </button>
          </div>

        </div>
      </header>

      {/* MODAL DE CONFIGURAÇÃO DE API */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <Settings className="text-violet-400 w-5 h-5" />
              <h3 className="text-lg font-bold">Configuração da API Gemini</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Insere a tua chave API paga do Google AI Studio para fazer o reconhecimento de fotos de tarefas e gerar explicações inteligentes para o Lucas.
            </p>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">A tua API Key do Gemini:</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cola a tua AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-500 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Versão do Modelo Gemini:</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-300"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Mais Recente, Ultra Rápido e Inteligente)</option>
                  <option value="gemini-3.1-flash">Gemini 3.1 Flash (Performance Melhorada e Rapidez)</option>
                  <option value="gemini-2.5-flash-preview-09-2025">Gemini 2.5 Flash (Padrão Canvas - Altamente Recomendado)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Matemática Avançada e Complexa)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Leve)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Escrever outro modelo customizado se necessário:</label>
                <input 
                  type="text" 
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Ex: gemini-3.5-pro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-500 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Deixa em branco para usar o modelo selecionado acima.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL (DASHBOARD) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* COLUNA ESQUERDA: Trilhas de Conquistas e Temas (9º Ano) */}
        <aside className="lg:col-span-1 flex flex-col gap-5">
          
          {/* Menu de Navegação - Mobile Friendly Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-row lg:flex-col gap-1.5 shadow-xl">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${activeTab === 'chat' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Tutor Chat</span>
            </button>
            <button 
              onClick={() => setActiveTab('lousa')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${activeTab === 'lousa' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Lousa Digital</span>
            </button>
            <button 
              onClick={() => setActiveTab('trilhas')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${activeTab === 'trilhas' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Trilhas 9º Ano</span>
            </button>
          </div>

          {/* Gamificação / Conquistas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3.5">
              <Award className="w-5 h-5 text-yellow-400" />
              <h3 className="font-extrabold text-sm text-slate-200">Emblemas de Conquistas</h3>
            </div>
            <div className="space-y-2">
              {['Iniciante', 'Desbravador de Bhaskara', 'Mestre de Pitágoras', 'Einstein do 9º Ano', 'Lenda da Matemática'].map((badge) => {
                const isUnlocked = unlockedBadges.includes(badge);
                return (
                  <div 
                    key={badge} 
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      isUnlocked 
                        ? 'bg-slate-800/80 border-violet-500/30 text-white' 
                        : 'bg-slate-950/40 border-slate-900/60 text-slate-500'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${isUnlocked ? 'text-violet-400' : 'text-slate-700'}`} />
                    <div className="flex-1">
                      <p className="text-xs font-bold leading-tight">{badge}</p>
                      <p className="text-[10px] text-slate-400">
                        {badge === 'Iniciante' && 'Começou a jornada de estudos!'}
                        {badge === 'Desbravador de Bhaskara' && 'Desbloqueia com 100 XP'}
                        {badge === 'Mestre de Pitágoras' && 'Desbloqueia com 300 XP'}
                        {badge === 'Einstein do 9º Ano' && 'Desbloqueia com 600 XP'}
                        {badge === 'Lenda da Matemática' && 'Desbloqueia com 1000 XP'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dica do Tutor */}
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/40 border border-indigo-950 rounded-2xl p-4 shadow-md hidden lg:block">
            <div className="flex items-center gap-2 text-indigo-300 mb-2">
              <HelpCircle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Dica Didática</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tirar uma foto nítida e bem iluminada do teu caderno ajuda o Tutor a compreender melhor a questão de matemática e dar as melhores dicas explicativas!
            </p>
          </div>

        </aside>

        {/* COLUNA DIREITA CENTRAL: Conteúdo Dinâmico com base na Tab Ativa */}
        <section className="lg:col-span-3 flex flex-col min-h-[550px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          
          {/* TAB CHAT: Tutor Interativo */}
          {activeTab === 'chat' && (
            <div className="flex flex-col flex-1 h-full">
              {/* Status Header */}
              <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="bg-violet-600/20 p-2 rounded-xl border border-violet-500/40">
                      <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Super Tutor de Matemática</h4>
                    <span className="text-[10px] text-slate-400">Pronto para te guiar passo a passo</span>
                  </div>
                </div>
                {/* Botão limpar chat */}
                <button 
                  onClick={() => {
                    if(confirm("Lucas, desejas limpar a nossa conversa para começares um novo estudo?")) {
                      setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        text: "Olá, Lucas! Pronto para novos desafios? Envia-me uma pergunta ou foto de exercício e vamos resolver!",
                        timestamp: new Date()
                      }]);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-100 transition rounded-lg hover:bg-slate-800"
                  title="Limpar Conversa"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Histórico de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[480px]">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 leading-relaxed text-sm shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-950 border border-slate-800/80 text-slate-200 rounded-tl-none'
                    }`}>
                      
                      {/* Imagem em anexo */}
                      {msg.image && (
                        <div className="mb-3 max-w-sm rounded-lg overflow-hidden border border-white/10">
                          <img src={msg.image} alt="Exercício Enviado" className="w-full h-auto object-contain max-h-52" />
                        </div>
                      )}

                      {/* Texto de Mensagem */}
                      <div className="whitespace-pre-line prose prose-invert max-w-none text-slate-100 font-sans leading-relaxed">
                        {msg.text}
                      </div>

                      {/* TTS speaker button for Tutor's message */}
                      {msg.role === 'assistant' && (
                        <div className="mt-3 flex justify-end">
                          <button 
                            onClick={() => speakText(msg.text)}
                            className="text-xs text-violet-400 hover:text-violet-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-800/40 transition"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Ouvir Explicação</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Efeito digitando */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span className="text-xs text-slate-400 font-medium ml-1">Tutor está a pensar no passo a passo...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Barra de Entrada / Upload */}
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                {/* Visualizador de Imagem Pré-selecionada */}
                {imagePreview && (
                  <div className="mb-3 flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-violet-500/30">
                    <div className="flex items-center gap-2.5">
                      <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-violet-500/30" />
                      <div>
                        <p className="text-xs font-bold text-violet-300">Imagem da tarefa anexada!</p>
                        <p className="text-[10px] text-slate-400">Pronta para envio ao Tutor.</p>
                      </div>
                    </div>
                    <button 
                      onClick={removeSelectedImage}
                      className="text-slate-400 hover:text-rose-400 p-1.5 bg-slate-900/80 rounded-lg hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  
                  {/* Botão de Upload da Câmera / Arquivo */}
                  <div className="relative">
                    <label className="flex items-center justify-center p-3 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-indigo-400 hover:text-indigo-300 transition cursor-pointer h-full" title="Tirar foto ou carregar lição">
                      <Camera className="w-5 h-5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* Input de Texto */}
                  <input 
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={imagePreview ? "Escreve uma pergunta sobre esta lição..." : "Escreve a tua dúvida ou envia uma foto do caderno!"}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:outline-none focus:border-violet-500 rounded-2xl px-4 text-sm text-white"
                  />

                  {/* Botão Enviar */}
                  <button 
                    type="submit"
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white p-3 rounded-2xl transition shadow-lg shadow-violet-600/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>

                </form>
              </div>
            </div>
          )}

          {/* TAB LOUSA: Quadro Negro Interativo */}
          {activeTab === 'lousa' && (
            <div className="flex flex-col flex-1 p-5">
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-md font-bold text-slate-200">Lousa de Matemática do Lucas</h4>
                  <p className="text-xs text-slate-400">Rascunha aqui os teus cálculos ou desenha formas geométricas!</p>
                </div>
                
                {/* Controles da lousa */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Brush / Eraser Selectors */}
                  <button 
                    onClick={() => setTool('brush')}
                    className={`p-2 rounded-xl transition ${tool === 'brush' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'}`}
                    title="Lápis de Desenho"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-xl transition ${tool === 'eraser' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'}`}
                    title="Borracha"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  {/* Seletor de Cores */}
                  {tool === 'brush' && (
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl">
                      {['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#f59e0b', '#ffffff'].map((color) => (
                        <button 
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={`w-5 h-5 rounded-full transition-transform ${brushColor === color ? 'scale-125 border-2 border-white' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Limpar Canvas */}
                  <button 
                    onClick={clearCanvas}
                    className="p-2 bg-slate-850 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-750 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* Canvas Board */}
              <div className="relative border border-slate-750 bg-slate-800 rounded-2xl overflow-hidden shadow-inner flex-1 min-h-[350px]">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawingMode}
                  onMouseLeave={stopDrawingMode}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawingMode}
                  className="absolute inset-0 cursor-crosshair w-full h-full touch-none"
                />
              </div>

              {/* Footer Lousa: Enviar pro Tutor */}
              <div className="mt-4 flex justify-between items-center bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Queres que o Tutor veja ou corrija o teu rascunho?</span>
                <button 
                  onClick={sendLousaToTutor}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enviar Rascunho ao Tutor</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB TRILHAS: Tópicos e Exercícios Preparatórios */}
          {activeTab === 'trilhas' && (
            <div className="p-6 flex flex-col flex-1">
              <div className="mb-6">
                <h4 className="text-lg font-bold text-slate-100">Trilhas de Estudo do 9º Ano</h4>
                <p className="text-xs text-slate-400 mt-0.5">Seleciona uma lição para praticares o raciocínio com o teu Tutor.</p>
              </div>

              {/* Grid das Trilhas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {trilhasMatematica.map((trilha) => (
                  <div 
                    key={trilha.id}
                    className="bg-slate-950 border border-slate-800 hover:border-violet-500/40 rounded-2xl p-4 transition-all duration-350 hover:-translate-y-1 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-2xl">{trilha.emoji}</span>
                        <div>
                          <h5 className="font-extrabold text-sm text-slate-200">{trilha.titulo}</h5>
                          <p className="text-[10px] text-slate-400">{trilha.sub}</p>
                        </div>
                      </div>
                      
                      {/* Fórmula em LaTeX */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 my-3 text-center text-xs font-mono text-violet-300">
                        {trilha.formula}
                      </div>

                      <div className="text-xs text-slate-300 mt-2 bg-slate-900/30 p-2.5 rounded-lg border border-dashed border-slate-800">
                        <span className="font-bold text-amber-400">Desafio:</span> {trilha.problema}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex justify-end">
                      <button 
                        onClick={() => iniciarTrilha(trilha)}
                        className="bg-violet-600/20 hover:bg-violet-600 hover:text-white border border-violet-500/30 text-violet-300 font-bold py-1.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5"
                      >
                        <span>Praticar com Tutor</span>
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

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 text-center py-4 text-xs text-slate-500">
        <p>Desenvolvido com carinho para o Lucas estudar matemática! • 🚀 Matérias do 9º Ano</p>
      </footer>

    </div>
  );
}