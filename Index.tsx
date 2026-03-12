import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Volume2, Sprout, RotateCcw, Wheat, ShieldCheck,
  CreditCard, Leaf, HelpCircle, Home, Send,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import grambotLogo from "@/assets/grambot-logo.png";

// Modular services
import { sttService } from "@/services/stt";
import { ttsService } from "@/services/tts";
import { nlpService, type NLPResult } from "@/services/nlp";
import { schemeDB } from "@/services/schemeDatabase";

/* ── Languages ── */
const languages = [
  { code: "en-IN", label: "English", flag: "🇮🇳" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "te-IN", label: "తెలుగు (Telugu)", flag: "🇮🇳" },
];

/* ── Icon helper ── */
const SchemeIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case "wheat": return <Wheat className={className} />;
    case "shield": return <ShieldCheck className={className} />;
    case "leaf": return <Leaf className={className} />;
    case "credit": return <CreditCard className={className} />;
    case "home": return <Home className={className} />;
    default: return <HelpCircle className={className} />;
  }
};

/* ── Chat entry type ── */
interface ChatEntry {
  query: string;
  response: string;
  scheme: string | null;
  confidence: number;
}

/* ═══════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════ */
const Index = () => {
  const [language, setLanguage] = useState("en-IN");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Process a query through the NLP pipeline ── */
  const processQuery = useCallback((query: string) => {
    const result: NLPResult = nlpService.classifyIntent(query, language);

    const entry: ChatEntry = {
      query,
      response: result.responseText,
      scheme: result.schemeName,
      confidence: result.confidence,
    };

    setChatHistory(prev => [...prev, entry]);

    // TTS: Speak the response
    ttsService.speak(result.responseText, language, undefined, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [language]);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  /* ── STT: Mic handler ── */
  const handleMicClick = useCallback(() => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
      return;
    }

    setError(null);

    sttService.start(
      { lang: language },
      {
        onStart: () => setIsListening(true),
        onResult: (result) => {
          processQuery(result.transcript);
        },
        onError: (err) => {
          setError(err);
          setIsListening(false);
        },
        onEnd: () => setIsListening(false),
      }
    );
  }, [isListening, language, processQuery]);

  /* ── Text input handler ── */
  const handleTextSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const query = textInput.trim();
    if (!query) return;
    setTextInput("");
    processQuery(query);
  }, [textInput, processQuery]);

  /* ── Quick scheme tap ── */
  const handleQuickAsk = useCallback((schemeId: string) => {
    const result = nlpService.getDirectSchemeResponse(schemeId, language);
    const scheme = schemeDB.getSchemeById(schemeId);
    if (!scheme) return;

    setChatHistory(prev => [...prev, {
      query: result.schemeName || schemeId,
      response: result.responseText,
      scheme: result.schemeName,
      confidence: 1,
    }]);

    ttsService.speak(result.responseText, language, undefined, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [language]);

  /* ── Replay TTS ── */
  const handleReplay = useCallback((text: string) => {
    ttsService.speak(text, language, undefined, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [language]);

  /* ── Localized strings ── */
  const t = {
    listening: language === "hi-IN" ? "🎙️ सुन रहा हूँ..." : language === "te-IN" ? "🎙️ వింటున్నాను..." : "🎙️ Listening...",
    tapMic: language === "hi-IN" ? "माइक्रोफोन दबाएं या टाइप करें" : language === "te-IN" ? "మైక్రోఫోన్ నొక్కండి లేదా టైప్ చేయండి" : "Tap mic or type your question",
    popularSchemes: language === "hi-IN" ? "लोकप्रिय योजनाएं" : language === "te-IN" ? "ప్రముఖ పథకాలు" : "Popular Schemes",
    speaking: language === "hi-IN" ? "बोल रहा है..." : language === "te-IN" ? "మాట్లాడుతోంది..." : "Speaking...",
    replay: language === "hi-IN" ? "फिर सुनें" : language === "te-IN" ? "మళ్ళీ వినండి" : "Replay",
    tryAsking: language === "hi-IN" ? 'पूछें: "PM-KISAN योजना क्या है?"' : language === "te-IN" ? 'అడగండి: "PM-KISAN పథకం ఏమిటి?"' : 'Try asking: "Tell me about PM-KISAN"',
    orTap: language === "hi-IN" ? "या ऊपर दी गई योजनाओं पर टैप करें" : language === "te-IN" ? "లేదా పైన ఉన్న పథకాలపై నొక్కండి" : "Or tap a scheme above to learn more",
    placeholder: language === "hi-IN" ? "अपना प्रश्न यहाँ टाइप करें..." : language === "te-IN" ? "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి..." : "Type your question here...",
  };

  const allSchemes = schemeDB.getAllSchemes();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full py-3 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <img src={grambotLogo} alt="GramBot Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-primary tracking-tight">GramBot</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">
              Voice Assistant for Government Schemes
            </p>
          </div>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36 sm:w-44 h-9 text-sm font-semibold bg-card border-2 border-primary/20 focus:border-primary">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((l) => (
              <SelectItem key={l.code} value={l.code} className="text-sm py-2">
                {l.flag} {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <main className="flex-1 flex flex-col px-4 py-4 sm:py-6 gap-4 max-w-2xl mx-auto w-full overflow-hidden">
        {/* Quick Scheme Cards */}
        <div className="w-full shrink-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            {t.popularSchemes}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allSchemes.map((s) => (
              <button
                key={s.id}
                onClick={() => handleQuickAsk(s.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-accent/50 transition-all duration-200 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <SchemeIcon type={s.icon} className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-foreground leading-tight">
                  {schemeDB.getSchemeName(s, language)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
          {chatHistory.length === 0 && (
            <div className="text-center text-muted-foreground space-y-3 mt-8">
              <Sprout className="w-10 h-10 mx-auto opacity-40 float-gentle" />
              <p className="text-sm font-semibold">{t.tryAsking}</p>
              <p className="text-xs text-muted-foreground/70">{t.orTap}</p>
            </div>
          )}

          {chatHistory.map((entry, i) => (
            <div key={i} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="bg-primary/10 rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-semibold text-foreground">"{entry.query}"</p>
                </div>
              </div>
              {/* Bot bubble */}
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                  <Sprout className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-sm">
                  {entry.scheme && (
                    <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mb-1.5 uppercase tracking-wider">
                      {entry.scheme}
                    </span>
                  )}
                  <p className="text-sm text-card-foreground leading-relaxed">{entry.response}</p>
                  {i === chatHistory.length - 1 && (
                    <button
                      onClick={() => handleReplay(entry.response)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer mt-2"
                      aria-label="Replay response"
                    >
                      {isSpeaking
                        ? <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        : <RotateCcw className="w-3 h-3" />}
                      {isSpeaking ? t.speaking : t.replay}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-2 text-sm font-semibold text-center shrink-0">
            {error}
          </div>
        )}

        {/* Input Bar: Text + Mic */}
        <div className="shrink-0 flex items-center gap-2 pt-2 border-t border-border">
          <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 h-11 text-sm bg-card border-primary/20 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!textInput.trim()}
              className="h-11 w-11 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          {/* Mic Button */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <span className="absolute w-14 h-14 rounded-full bg-destructive/20 mic-ripple" />
                <span className="absolute w-14 h-14 rounded-full bg-destructive/10 mic-ripple" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer ${
                isListening ? "bg-destructive mic-pulse" : "bg-primary hover:brightness-110 active:scale-95"
              }`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening
                ? <MicOff className="w-5 h-5 text-destructive-foreground" />
                : <Mic className="w-5 h-5 text-primary-foreground" />}
            </button>
          </div>
        </div>

        <p className={`text-xs font-bold text-center transition-colors duration-300 shrink-0 ${isListening ? "text-destructive" : "text-muted-foreground"}`}>
          {isListening ? t.listening : t.tapMic}
        </p>
      </main>

      <footer className="text-center py-2 text-[10px] text-muted-foreground border-t border-border">
        GramBot © 2026 — Empowering Farmers with Voice Technology
      </footer>
    </div>
  );
};

export default Index;
