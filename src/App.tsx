import React, { useState, useRef, useEffect } from "react";
import { 
  Search, Mic, MicOff, Loader2, Globe, GraduationCap, Award, 
  Clock, ExternalLink, MessageSquare, Sparkles, X, ChevronRight, 
  ArrowLeft, BookOpen, Play, CheckCircle2, Filter, Layers, 
  TrendingUp, Star, ShieldCheck, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { 
  searchCourses, 
  getComplexAdvice, 
  transcribeAudio, 
  Course, 
  SearchResponse 
} from "./services/geminiService";
import { CoursePlayer } from "./components/CoursePlayer";
import { cn } from "./lib/utils";

// Curated starter courses to display directly on the homepage
const POPULAR_COURSES: Course[] = [
  {
    id: "cs50-harvard",
    title: "CS50: Introduction to Computer Science",
    provider: "Harvard University / edX",
    price: "Gratuito (Attestato opzionale)",
    duration: "12 settimane",
    certificate: true,
    rating: "4.9",
    link: "https://cs50.harvard.edu/x/",
    description: "La celebre introduzione all'informatica di Harvard. Impara algoritmi, C, Python, SQL, strutture dati e sviluppo web.",
    level: "Principiante",
    tags: ["Informatica", "Python", "Harvard"],
    featured: true,
  },
  {
    id: "google-data-analytics",
    title: "Google Data Analytics Professional Certificate",
    provider: "Google Career Certificates",
    price: "Gratis in prova / Borse di studio",
    duration: "6 mesi",
    certificate: true,
    rating: "4.8",
    link: "https://grow.google/certificates/data-analytics/",
    description: "Preparati per una carriera da Data Analyst con Google. Pulizia dati, SQL, fogli di calcolo, Tableau e programmazione R.",
    level: "Principiante",
    tags: ["Data Science", "SQL", "Google"],
    featured: true,
  },
  {
    id: "deep-learning-specialization",
    title: "Deep Learning & AI Specialization",
    provider: "DeepLearning.AI / Andrew Ng",
    price: "Gratuito (audit) / Attestato",
    duration: "3 mesi",
    certificate: true,
    rating: "4.9",
    link: "https://www.deeplearning.ai/courses/deep-learning-specialization/",
    description: "Masterclass sui fondamenti delle reti neurali, Deep Learning, computer vision e architetture Transformers dal pioniere Andrew Ng.",
    level: "Intermedio",
    tags: ["AI", "Machine Learning", "PyTorch"],
    featured: true,
  },
  {
    id: "full-stack-open",
    title: "Full Stack Open Modern Web Development",
    provider: "University of Helsinki",
    price: "100% Gratuito con Attestato",
    duration: "Flessibile",
    certificate: true,
    rating: "4.9",
    link: "https://fullstackopen.com/en/",
    description: "Sviluppo web full stack contemporaneo con React, Redux, Node.js, Express, MongoDB, GraphQL e TypeScript.",
    level: "Intermedio",
    tags: ["Full Stack", "React", "Node.js"],
    featured: true,
  }
];

export default function App() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [view, setView] = useState<"home" | "results" | "compare" | "player">("home");
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // AI Advisor Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);

  // Filter chips state
  const [filterCertOnly, setFilterCertOnly] = useState(false);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleSearch = async (searchQuery?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalQ = (searchQuery ?? query).trim();
    if (!finalQ) return;

    if (searchQuery) setQuery(searchQuery);

    setIsSearching(true);
    setView("results");
    try {
      const data = await searchCourses(finalQ, {
        withCertificate: filterCertOnly,
        freeOnly: filterFreeOnly,
      });
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const resultStr = reader.result as string;
          const base64Audio = resultStr.split(",")[1];
          try {
            const transcribed = await transcribeAudio(base64Audio);
            if (transcribed) {
              setQuery(transcribed);
              handleSearch(transcribed);
            }
          } catch (err) {
            console.error("Transcription error:", err);
          }
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setRecordingError("Autorizzazione microfono negata o non disponibile.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsThinking(true);

    try {
      const response = await getComplexAdvice(userMsg, chatHistory);
      setChatHistory((prev) => [...prev, { role: "model", text: response || "" }]);
    } catch (error) {
      console.error("Chat advisor error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: "Ti consiglio di orientarti verso corsi con progetti applicati (es. Google Career Certificates su Coursera o corsi edX di Harvard). Puoi iniziare qualsiasi corso subito con un click!",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleComparison = (course: Course) => {
    setSelectedCourses((prev) => {
      const exists = prev.find((c) => c.title === course.title);
      if (exists) return prev.filter((c) => c.title !== course.title);
      if (prev.length >= 3) return prev;
      return [...prev, course];
    });
  };

  const handleStartCourse = (course: Course) => {
    setActiveCourse(course);
    setView("player");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If in learning player view, render the CoursePlayer directly!
  if (view === "player" && activeCourse) {
    return (
      <CoursePlayer
        course={activeCourse}
        onBack={() => setView(results ? "results" : "home")}
      />
    );
  }

  // Filter courses locally if filters toggled
  const filteredCourses = (results?.courses || []).filter((c) => {
    if (filterCertOnly && !c.certificate) return false;
    if (filterFreeOnly && !c.price.toLowerCase().includes("gratuit") && !c.price.toLowerCase().includes("gratis")) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] font-sans selection:bg-blue-100 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView("home")}
            className="text-2xl font-black tracking-tight flex items-center gap-0.5 hover:opacity-85 transition-opacity"
          >
            <span className="text-[#4285F4]">S</span>
            <span className="text-[#EA4335]">e</span>
            <span className="text-[#FBBC05]">a</span>
            <span className="text-[#4285F4]">r</span>
            <span className="text-[#34A853]">c</span>
            <span className="text-[#EA4335]">h</span>
            <span className="ml-1 text-gray-800 font-extrabold tracking-normal">Course</span>
          </button>

          {view !== "home" && (
            <form
              onSubmit={(e) => handleSearch(undefined, e)}
              className="hidden md:flex items-center bg-white border border-gray-200/90 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-shadow w-[480px] ml-4 focus-within:ring-2 focus-within:ring-blue-500/20"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400"
                placeholder="Cerca corsi, università o certificazioni..."
              />
              <div className="flex items-center gap-2 border-l pl-3 ml-2 border-gray-200">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    isRecording ? "text-red-500 bg-red-50 animate-pulse" : "text-blue-600 hover:bg-blue-50"
                  )}
                  title={isRecording ? "Ferma registrazione" : "Dettatura vocale"}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="submit"
                  className="text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                >
                  <Search size={18} />
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedCourses.length > 0 && view !== "compare" && (
            <button
              onClick={() => setView("compare")}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-full text-xs font-bold transition-colors"
            >
              <Layers size={15} />
              <span>Confronta ({selectedCourses.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold hover:shadow-md transition-all active:scale-95 shadow-sm"
          >
            <Sparkles size={16} />
            <span>AI Advisor</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <AnimatePresence mode="wait">
          {view === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center min-h-[75vh] py-8 text-center"
            >
              {/* Google-like Course Search Logo */}
              <div className="mb-6">
                <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-2">
                  <span className="text-[#4285F4]">S</span>
                  <span className="text-[#EA4335]">e</span>
                  <span className="text-[#FBBC05]">a</span>
                  <span className="text-[#4285F4]">r</span>
                  <span className="text-[#34A853]">c</span>
                  <span className="text-[#EA4335]">h</span>
                  <span className="ml-2 text-gray-900 font-extrabold tracking-normal">Course</span>
                </h1>
                <p className="text-gray-500 text-sm sm:text-base font-medium max-w-xl mx-auto">
                  Il motore di ricerca globale per trovare le migliori offerte di corsi al mondo, confrontarli e <strong>iniziare a studiare direttamente nell'app</strong>.
                </p>
              </div>

              {/* Main Search Box */}
              <form onSubmit={(e) => handleSearch(undefined, e)} className="w-full max-w-2xl px-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Search size={22} />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200/90 rounded-full py-4 pl-14 pr-32 text-base sm:text-lg shadow-sm hover:shadow-md focus:shadow-lg focus:border-blue-400 outline-none transition-all text-gray-800"
                    placeholder="Che corso desideri? (es. Python con attestato gratuito)"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "p-2.5 rounded-full transition-all",
                        isRecording
                          ? "text-red-500 bg-red-50 animate-pulse ring-2 ring-red-400"
                          : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                      )}
                      title="Cerca con la voce"
                    >
                      {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Cerca"}
                    </button>
                  </div>
                </div>
                {recordingError && (
                  <p className="text-xs text-red-500 mt-2 font-medium">{recordingError}</p>
                )}
              </form>

              {/* Fast Category Filter Shortcuts */}
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl px-2">
                {[
                  { label: "Corsi Gratuiti con Attestato", query: "corsi gratuiti con rilascio attestato" },
                  { label: "Google Career Certificates", query: "Google Career Certificates in italiano" },
                  { label: "Harvard & MIT (CS50)", query: "corsi CS50 Harvard edX gratuiti" },
                  { label: "Intelligenza Artificiale & Python", query: "corso intelligenza artificiale python per principianti" },
                  { label: "Cybersecurity & Cloud", query: "corsi cybersecurity riconosciuti" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(item.query);
                      handleSearch(item.query);
                    }}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Direct Access / Start Course Immediately Section */}
              <section className="mt-14 w-full max-w-5xl text-left">
                <div className="flex items-center justify-between mb-5 px-1">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Zap size={20} className="text-amber-500 fill-amber-400" />
                      Inizia Direttamente un Corso Popolare
                    </h3>
                    <p className="text-xs text-gray-500">
                      Accedi subito all'aula didattica con moduli, lezioni pratiche, quiz e attestato finale.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {POPULAR_COURSES.map((course) => (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl p-5 border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {course.provider.split("/")[0]}
                          </span>
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                            ★ {course.rating}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                          {course.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {course.duration}</span>
                          <span className="text-emerald-700 font-bold">{course.price.includes("Gratuit") ? "Gratis" : "Top"}</span>
                        </div>

                        <button
                          onClick={() => handleStartCourse(course)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow"
                        >
                          <Play size={14} className="fill-white" />
                          <span>Inizia Corso Subito</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : view === "results" ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Summary, Filters & Results */}
              <div className="lg:col-span-8 space-y-6">
                {/* Search Bar on mobile if not in header */}
                <div className="md:hidden">
                  <form onSubmit={(e) => handleSearch(undefined, e)} className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 outline-none text-sm"
                      placeholder="Cerca un corso..."
                    />
                    <button type="submit" className="text-blue-600 p-1">
                      <Search size={18} />
                    </button>
                  </form>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={13} /> Filtri:
                    </span>
                    <button
                      onClick={() => setFilterFreeOnly(!filterFreeOnly)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        filterFreeOnly
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      Solo Gratuiti
                    </button>
                    <button
                      onClick={() => setFilterCertOnly(!filterCertOnly)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        filterCertOnly
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      Con Attestato
                    </button>
                  </div>

                  {selectedCourses.length > 0 && (
                    <button
                      onClick={() => setView("compare")}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Confronta ({selectedCourses.length} selezionati) <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                {isSearching ? (
                  <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-base font-bold text-gray-800">Cercando i migliori corsi mondiali con Google Search...</p>
                    <p className="text-xs text-gray-400">Verifica offerte, certificazioni e piani di studio in corso.</p>
                  </div>
                ) : (
                  <>
                    {/* AI Overview Summary Box */}
                    {results?.summary && (
                      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500" />
                        <div className="flex items-center gap-2 text-blue-600 mb-3">
                          <Sparkles size={18} />
                          <h2 className="font-extrabold uppercase tracking-wider text-xs">
                            Panoramica AI & Guida alla Scelta
                          </h2>
                        </div>
                        <div className="prose prose-sm prose-slate max-w-none text-gray-700 leading-relaxed font-sans">
                          <Markdown>{results.summary}</Markdown>
                        </div>
                      </section>
                    )}

                    {/* Course Cards List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                          Corsi Consigliati
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {filteredCourses.length} risultati
                          </span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {filteredCourses.map((course, idx) => {
                          const isSelected = selectedCourses.some((c) => c.title === course.title);

                          return (
                            <motion.div
                              key={course.id || idx}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-white rounded-3xl p-6 border border-gray-200/80 hover:border-blue-300 hover:shadow-lg transition-all flex flex-col md:flex-row gap-6 relative group"
                            >
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                        {course.provider}
                                      </span>
                                      {course.level && (
                                        <span className="text-[11px] text-gray-400 font-medium">
                                          · {course.level}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {course.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-extrabold border border-amber-100">
                                    ★ {course.rating}
                                  </div>
                                </div>

                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {course.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600 pt-1">
                                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>{course.duration}</span>
                                  </div>
                                  <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold",
                                    course.certificate 
                                      ? "bg-amber-50/70 border-amber-200/80 text-amber-800" 
                                      : "bg-gray-50 border-gray-100 text-gray-500"
                                  )}>
                                    <Award size={14} className={course.certificate ? "text-amber-600" : "text-gray-400"} />
                                    <span>{course.certificate ? "Attestato Riconosciuto" : "Senza Attestato"}</span>
                                  </div>
                                  <div className="text-blue-700 font-extrabold text-sm ml-auto bg-blue-50/50 px-3 py-1 rounded-lg">
                                    {course.price}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons Column */}
                              <div className="md:w-56 flex flex-col justify-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-5">
                                <button
                                  onClick={() => handleStartCourse(course)}
                                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                  <Play size={16} className="fill-white" />
                                  <span>Inizia Corso Subito</span>
                                </button>

                                <a
                                  href={course.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-200"
                                >
                                  <span>Sito Ufficiale</span>
                                  <ExternalLink size={13} />
                                </a>

                                <button
                                  onClick={() => toggleComparison(course)}
                                  className={cn(
                                    "w-full py-2 rounded-xl text-xs font-bold transition-all border",
                                    isSelected
                                      ? "bg-blue-50 border-blue-300 text-blue-700 font-extrabold"
                                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {isSelected ? "✓ Selezionato per confronto" : "+ Confronta corso"}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Verified Grounding Sources & AI Consultant */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={18} className="text-blue-600" />
                    <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                      Fonti Verificate Google
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {results?.sources && results.sources.length > 0 ? (
                      results.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.web?.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-2xl bg-gray-50/70 hover:bg-blue-50/60 border border-transparent hover:border-blue-100 transition-all group"
                        >
                          <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600">
                            {source.web?.title || "Portale Ufficiale Corso"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {source.web?.uri}
                          </p>
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Ricerca potenziata da fonti accademiche e piattaforme certificate.
                      </p>
                    )}
                  </div>
                </section>

                {/* AI Counselor Banner */}
                <section className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-base">Consulente Educativo AI</h4>
                        <p className="text-[11px] text-blue-200">Guidato da Google Gemini</p>
                      </div>
                    </div>

                    <p className="text-xs text-blue-100 leading-relaxed">
                      Non sai quale corso scegliere per il tuo obiettivo professionale o hai dubbi sui certificati? Chiedi consiglio al nostro AI Advisor.
                    </p>

                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="w-full bg-white text-blue-700 py-3 rounded-2xl font-black text-xs hover:bg-blue-50 transition-all shadow-md active:scale-95"
                    >
                      Avvia Chat con il Consulente
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          ) : (
            /* Comparison View */
            <motion.div
              key="compare"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setView("results")}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
                      Confronto Corsi
                    </h2>
                    <p className="text-xs text-gray-500">
                      Confronta prezzi, attestati e programmi fianco a fianco.
                    </p>
                  </div>
                </div>

                {selectedCourses.length > 0 && (
                  <button
                    onClick={() => setSelectedCourses([])}
                    className="text-xs text-red-600 hover:underline font-bold"
                  >
                    Rimuovi tutti
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedCourses.map((course, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="p-6 bg-gray-50/80 border-b border-gray-100 flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded">
                            {course.provider}
                          </span>
                          <h4 className="text-lg font-bold text-gray-900 mt-2 mb-1">
                            {course.title}
                          </h4>
                        </div>
                        <button
                          onClick={() => toggleComparison(course)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-gray-100">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Prezzo</p>
                            <p className="font-extrabold text-blue-700 text-sm mt-0.5">{course.price}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Rating</p>
                            <p className="font-extrabold text-amber-600 text-sm mt-0.5">★ {course.rating}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Durata</p>
                            <p className="font-bold text-gray-800 mt-0.5">{course.duration}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Certificato</p>
                            <p className="font-bold text-emerald-700 mt-0.5">
                              {course.certificate ? "Sì (Incluso)" : "Opzionale / No"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Descrizione</p>
                          <p className="text-gray-600 leading-relaxed">{course.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0 space-y-2">
                      <button
                        onClick={() => handleStartCourse(course)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                      >
                        <Play size={15} className="fill-white" />
                        <span>Inizia Questo Corso Subito</span>
                      </button>
                      <a
                        href={course.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Sito Ufficiale</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}

                {selectedCourses.length < 3 && (
                  <button
                    onClick={() => setView(results ? "results" : "home")}
                    className="border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center p-12 text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all bg-white/40 min-h-[300px]"
                  >
                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                      <Search size={28} />
                    </div>
                    <span className="font-bold text-sm">Aggiungi un altro corso</span>
                    <span className="text-xs text-gray-400 mt-1">Puoi confrontare fino a 3 corsi</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Advisor Chat Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">AI Course Advisor</h3>
                    <p className="text-[10px] text-blue-100">Google Gemini Formazione & Carriera</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare size={28} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">Come posso aiutarti oggi?</h4>
                    <p className="text-xs text-gray-500 px-6 leading-relaxed">
                      Chiedimi quale percorso è più richiesto dalle aziende, le differenze tra le certificazioni Google e Harvard, o consigli sul budget.
                    </p>
                  </div>
                )}

                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-none shadow-sm"
                          : "bg-gray-100 text-gray-800 rounded-tl-none prose prose-xs prose-slate"
                      )}
                    >
                      {msg.role === "model" ? <Markdown>{msg.text}</Markdown> : msg.text}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-start gap-2">
                    <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={15} />
                      <span className="text-xs text-gray-500 font-medium italic">
                        Il consulente sta analizzando le migliori opzioni...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Chiedi un consiglio sul corso..."
                    className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-4 pr-12 text-xs sm:text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isThinking}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
            <span className="text-blue-600">SearchCourse</span>
            <span className="text-gray-400 font-normal">| Motore di ricerca & aula corsi</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Corsi Verificati</span>
            <span>Rilascio Attestati</span>
            <span>Google Gemini Search Grounding</span>
          </div>
          <p>© 2026 SearchCourse. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}
