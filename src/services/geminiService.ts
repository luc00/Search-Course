export interface Course {
  id: string;
  title: string;
  provider: string;
  price: string;
  duration: string;
  certificate: boolean;
  rating: string;
  link: string;
  description: string;
  level?: string;
  tags?: string[];
  modulesCount?: number;
  featured?: boolean;
}

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  summary: string;
  content: string;
  practicalExercise?: string;
  quiz?: Quiz;
  keyTakeaways?: string[];
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface CourseCurriculum {
  courseTitle: string;
  provider: string;
  estimatedTotalHours: string;
  learningObjectives: string[];
  modules: CourseModule[];
}

export interface SearchResponse {
  summary: string;
  courses: Course[];
  sources: Array<{ web?: { title?: string; uri?: string } }>;
  query: string;
}

export const searchCourses = async (query: string, filter?: any): Promise<SearchResponse> => {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filter }),
  });

  if (!response.ok) {
    throw new Error(`Errore durante la ricerca: ${response.statusText}`);
  }

  return await response.json();
};

export const getComplexAdvice = async (
  message: string,
  history: Array<{ role: 'user' | 'model'; parts?: any[]; text?: string }>
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: history.map(h => ({
        role: h.role,
        text: h.text || h.parts?.[0]?.text || "",
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Errore chat advisor: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64Audio, mimeType: "audio/wav" }),
  });

  if (!response.ok) {
    throw new Error(`Errore trascrizione audio: ${response.statusText}`);
  }

  const data = await response.json();
  return data.transcription || "";
};

export const fetchCourseCurriculum = async (course: Course): Promise<CourseCurriculum> => {
  const response = await fetch("/api/course-curriculum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: course.title,
      provider: course.provider,
      description: course.description,
      level: course.level,
    }),
  });

  if (!response.ok) {
    throw new Error(`Errore generazione aula corso: ${response.statusText}`);
  }

  return await response.json();
};
