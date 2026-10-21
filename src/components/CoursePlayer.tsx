import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, CheckCircle2, Circle, Play, Pause, Award, Clock, 
  ExternalLink, BookOpen, Sparkles, ChevronRight, ChevronLeft,
  Share2, Printer, Download, Check, HelpCircle, Code2, ShieldCheck,
  RefreshCw, UserCheck
} from "lucide-react";
import Markdown from "react-markdown";
import { Course, CourseCurriculum, fetchCourseCurriculum } from "../services/geminiService";
import { cn } from "../lib/utils";

interface CoursePlayerProps {
  course: Course;
  onBack: () => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack }) => {
  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Interactive quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  
  // Certificate state
  const [showCertificate, setShowCertificate] = useState(false);
  const [studentName, setStudentName] = useState("Luca Rossi");
  const [isEditingName, setIsEditingName] = useState(false);
  const [certificateCopied, setCertificateCopied] = useState(false);

  // Video player simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(15);
  const [playbackSpeed, setPlaybackSpeed] = useState("1.0x");

  // Load course curriculum
  useEffect(() => {
    let isMounted = true;
    const loadCurriculum = async () => {
      setLoading(true);
      try {
        const data = await fetchCourseCurriculum(course);
        if (isMounted) {
          setCurriculum(data);
          // Pre-complete first lesson for good onboarding feel
          if (data.modules?.[0]?.lessons?.[0]) {
            setCompletedLessons(new Set([data.modules[0].lessons[0].id]));
          }
        }
      } catch (err) {
        console.error("Error loading curriculum:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCurriculum();
    return () => { isMounted = false; };
  }, [course]);

  // Reset quiz state when switching lessons
  useEffect(() => {
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);
    setIsPlaying(false);
    setVideoProgress(10);
  }, [activeModuleIndex, activeLessonIndex]);

  // Video progress interval
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentModule = curriculum?.modules[activeModuleIndex];
  const currentLesson = currentModule?.lessons[activeLessonIndex];

  // Calculate total lessons and completion percentage
  const totalLessons = curriculum?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 1;
  const progressPercent = Math.min(
    100,
    Math.round((completedLessons.size / Math.max(1, totalLessons)) * 100)
  );

  const handleLessonComplete = () => {
    if (currentLesson) {
      const nextSet = new Set(completedLessons);
      nextSet.add(currentLesson.id);
      setCompletedLessons(nextSet);

      // Check if there is a next lesson in this module
      if (currentModule && activeLessonIndex < currentModule.lessons.length - 1) {
        setActiveLessonIndex(prev => prev + 1);
      } else if (curriculum && activeModuleIndex < curriculum.modules.length - 1) {
        // Move to next module
        setActiveModuleIndex(prev => prev + 1);
        setActiveLessonIndex(0);
      } else {
        // Course finished!
        setShowCertificate(true);
      }
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonIndex(prev => prev - 1);
    } else if (activeModuleIndex > 0 && curriculum) {
      const prevMod = curriculum.modules[activeModuleIndex - 1];
      setActiveModuleIndex(prev => prev - 1);
      setActiveLessonIndex(prevMod.lessons.length - 1);
    }
  };

  const handleCopyCredential = () => {
    navigator.clipboard.writeText(`https://searchcourse.app/verify/SC-${course.id || "2026"}-VRF`);
    setCertificateCopied(true);
    setTimeout(() => setCertificateCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#202124] flex flex-col">
      {/* Top Learning Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors flex items-center gap-1.5 text-sm font-semibold"
              title="Torna alla ricerca"
            >
              <ArrowLeft size={18} />
              <span>Esci dall'aula</span>
            </button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {course.provider}
                </span>
                <span className="text-xs text-gray-400 font-medium">| {course.level || "Tutti i livelli"}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate max-w-md md:max-w-xl">
                {course.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-700">Progresso Corso</p>
                <p className="text-[11px] text-gray-500 font-medium">{progressPercent}% completato ({completedLessons.size}/{totalLessons})</p>
              </div>
              <div className="w-24 sm:w-32 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {course.certificate && (
              <button
                onClick={() => setShowCertificate(true)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Award size={15} className="text-amber-600" />
                <span className="hidden md:inline">Vedi Attestato</span>
              </button>
            )}

            <a
              href={course.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <span>Sito Ufficiale</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-gray-800">Preparazione dell'aula interattiva in corso...</p>
          <p className="text-sm text-gray-500 max-w-md text-center">
            Stiamo strutturando i moduli, le lezioni didattiche, le esercitazioni pratiche e i quiz per <strong>{course.title}</strong>.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Sidebar / Syllabus Navigation */}
          <aside className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm flex flex-col h-fit lg:sticky lg:top-20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" />
                  Programma del Corso
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {curriculum?.modules.length} Moduli · {totalLessons} Lezioni pratiche
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-full border border-emerald-100">
                Aula Attiva
              </span>
            </div>

            {/* Modules List */}
            <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {curriculum?.modules.map((module, mIdx) => {
                const isCurrentModule = mIdx === activeModuleIndex;
                const isModuleCompleted = module.lessons.every(l => completedLessons.has(l.id));

                return (
                  <div 
                    key={module.id} 
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden",
                      isCurrentModule ? "border-blue-200 bg-blue-50/20" : "border-gray-100 bg-gray-50/50"
                    )}
                  >
                    <div className="p-3 bg-white/70 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isModuleCompleted ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-500">
                            {mIdx + 1}
                          </div>
                        )}
                        <h4 className="font-bold text-xs text-gray-900 truncate max-w-[200px]">
                          {module.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {module.lessons.filter(l => completedLessons.has(l.id)).length}/{module.lessons.length}
                      </span>
                    </div>

                    <div className="p-2 space-y-1">
                      {module.lessons.map((lesson, lIdx) => {
                        const isActive = mIdx === activeModuleIndex && lIdx === activeLessonIndex;
                        const isDone = completedLessons.has(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              setActiveModuleIndex(mIdx);
                              setActiveLessonIndex(lIdx);
                            }}
                            className={cn(
                              "w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all font-medium",
                              isActive
                                ? "bg-blue-600 text-white shadow-sm font-semibold"
                                : isDone
                                ? "bg-white text-gray-800 hover:bg-emerald-50/60"
                                : "text-gray-600 hover:bg-white"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isDone ? (
                                <CheckCircle2 size={14} className={isActive ? "text-white" : "text-emerald-500"} />
                              ) : (
                                <Circle size={14} className={isActive ? "text-white" : "text-gray-300"} />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </div>
                            <span className={cn("text-[10px] shrink-0 ml-2", isActive ? "text-blue-100" : "text-gray-400")}>
                              {lesson.duration}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick action: Certificate Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/80">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                <Award size={16} className="text-amber-600" />
                <span>Certificazione Finale</span>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed mb-3">
                Completa tutti i moduli e i quiz per rilasciare l'attestato nominativo verificabile con credenziale univoca.
              </p>
              <button
                onClick={() => setShowCertificate(true)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                {progressPercent === 100 ? "🎉 Ritira il tuo Attestato!" : "Anteprima Attestato"}
              </button>
            </div>
          </aside>

          {/* Main Lesson View */}
          <main className="lg:col-span-8 space-y-6">
            {/* Interactive Lesson Header & Media Simulation */}
            <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm">
              {/* Simulated Classroom Screen */}
              <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col justify-between min-h-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Lezione {activeLessonIndex + 1} di {currentModule?.lessons.length} · {currentModule?.title}
                    </span>
                    <span className="text-xs text-gray-300 font-medium flex items-center gap-1">
                      <Clock size={13} />
                      {currentLesson?.duration || "15 min"}
                    </span>
                  </div>

                  <div className="my-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                      {currentLesson?.title}
                    </h2>
                    <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                      {currentLesson?.summary}
                    </p>
                  </div>

                  {/* Simulated Media Controls */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden cursor-pointer">
                        <div 
                          className="bg-blue-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                        <span>{isPlaying ? "In riproduzione lezione..." : "Pausa"}</span>
                        <span>{videoProgress}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const speeds = ["1.0x", "1.25x", "1.5x", "2.0x"];
                        const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                        setPlaybackSpeed(next);
                      }}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-mono font-bold text-gray-200 transition-colors"
                    >
                      {playbackSpeed}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lesson Text & In-Depth Markdown Content */}
              <div className="p-6 sm:p-8 space-y-8">
                <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white prose-pre:rounded-2xl prose-a:text-blue-600">
                  <Markdown>{currentLesson?.content}</Markdown>
                </article>

                {/* Practical Exercise Box */}
                {currentLesson?.practicalExercise && (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <Code2 size={18} className="text-emerald-600" />
                      <span>Esercitazione Pratica del Modulo</span>
                    </div>
                    <p className="text-sm text-emerald-900/90 leading-relaxed font-medium">
                      {currentLesson.practicalExercise}
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 size={15} />
                      <span>Completa l'esercizio nel tuo editor o ambiente di lavoro per consolidare l'apprendimento.</span>
                    </div>
                  </div>
                )}

                {/* Interactive Quiz / Knowledge Check */}
                {currentLesson?.quiz && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle size={20} className="text-blue-600" />
                        <h4 className="font-bold text-base text-gray-900">Verifica delle Competenze</h4>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                        Quiz di Lezione
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-800">
                      {currentLesson.quiz.question}
                    </p>

                    <div className="space-y-2.5">
                      {currentLesson.quiz.options.map((option, optIdx) => {
                        const isSelected = selectedQuizOption === optIdx;
                        const isCorrect = currentLesson.quiz?.correctIndex === optIdx;
                        
                        let optionStyle = "border-gray-200 bg-white text-gray-700 hover:border-blue-300";
                        if (isQuizSubmitted) {
                          if (isCorrect) {
                            optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                          } else if (isSelected && !isCorrect) {
                            optionStyle = "border-red-400 bg-red-50 text-red-900";
                          } else {
                            optionStyle = "border-gray-100 bg-gray-50 text-gray-400 opacity-60";
                          }
                        } else if (isSelected) {
                          optionStyle = "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold";
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => !isQuizSubmitted && setSelectedQuizOption(optIdx)}
                            disabled={isQuizSubmitted}
                            className={cn(
                              "w-full text-left p-3.5 rounded-2xl border text-sm transition-all flex items-center justify-between gap-3",
                              optionStyle
                            )}
                          >
                            <span>{option}</span>
                            {isQuizSubmitted && isCorrect && (
                              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!isQuizSubmitted ? (
                      <button
                        onClick={() => selectedQuizOption !== null && setIsQuizSubmitted(true)}
                        disabled={selectedQuizOption === null}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        Verifica Risposta
                      </button>
                    ) : (
                      <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
                        <div className="flex items-center gap-2">
                          {selectedQuizOption === currentLesson.quiz.correctIndex ? (
                            <span className="text-emerald-700 font-bold text-sm flex items-center gap-1.5">
                              <CheckCircle2 size={18} /> Esatto! Risposta Corretta!
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold text-sm flex items-center gap-1.5">
                              <HelpCircle size={18} /> Risposta da Rivedere
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {currentLesson.quiz.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Key Takeaways */}
                {currentLesson?.keyTakeaways && currentLesson.keyTakeaways.length > 0 && (
                  <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <Sparkles size={14} /> Punti Chiave da Ricordare
                    </h5>
                    <ul className="space-y-1.5">
                      {currentLesson.keyTakeaways.map((point, pIdx) => (
                        <li key={pIdx} className="text-xs text-gray-700 flex items-start gap-2">
                          <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Navigation / Next Lesson CTA */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={handlePrevLesson}
                  disabled={activeModuleIndex === 0 && activeLessonIndex === 0}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={16} />
                  <span>Lezione Precedente</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleLessonComplete}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>Segna come Completata e Prosegui</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Official Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl relative border border-gray-100 my-8">
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>

            {/* Certificate Canvas */}
            <div className="border-8 border-double border-amber-300 p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-amber-50/20 via-white to-amber-50/30 text-center relative overflow-hidden shadow-inner">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-center gap-2 mb-4">
                <ShieldCheck size={28} className="text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  SearchCourse Verified Credentials
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-900 tracking-tight uppercase">
                Attestato di Completamento
              </h2>
              <p className="text-xs uppercase tracking-widest text-gray-400 mt-1 font-sans">
                Certificato Ufficiale di Merito e Formazione
              </p>

              <div className="my-8">
                <p className="text-sm text-gray-500 font-sans">Si certifica che</p>
                <div className="flex items-center justify-center gap-2 my-2">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 border-b-2 border-blue-600 outline-none text-center bg-transparent"
                    />
                  ) : (
                    <div 
                      onClick={() => setIsEditingName(true)}
                      className="group cursor-pointer flex items-center gap-2"
                      title="Clicca per modificare il tuo nome sull'attestato"
                    >
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 border-b-2 border-dashed border-gray-300 group-hover:border-blue-600 transition-colors">
                        {studentName}
                      </span>
                      <UserCheck size={18} className="text-gray-400 group-hover:text-blue-600" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed mt-3">
                  ha superato con successo il percorso didattico completo e le verifiche delle competenze nel corso:
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-2 font-sans">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Erogato da <strong>{course.provider}</strong> con verifica tramite SearchCourse Academy.
                </p>
              </div>

              <div className="pt-6 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
                <div className="text-left">
                  <p className="font-bold text-gray-700">Data di Rilascio</p>
                  <p>{new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>

                <div className="w-16 h-16 rounded-full border-2 border-amber-400/80 bg-amber-100/50 flex flex-col items-center justify-center text-amber-800">
                  <Award size={20} />
                  <span className="text-[9px] font-extrabold uppercase mt-0.5">VERIFIED</span>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-700">ID Credenziale</p>
                  <p className="font-mono text-gray-800">SC-{course.id || "2026"}-VRF</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 italic">
                * Clicca sul tuo nome per personalizzarlo prima di stampare o scaricare.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyCredential}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Share2 size={14} />
                  <span>{certificateCopied ? "Link Copiato!" : "Copia Link"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} />
                  <span>Stampa / Salva in PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
