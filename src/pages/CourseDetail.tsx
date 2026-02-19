import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RichTextEditor from '@/components/RichTextEditor';
import DOMPurify from 'dompurify';
import {
  ChevronLeft,
  Play,
  FileText,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Circle,
  Clock,
  Award,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Pencil,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Module, QuizQuestion } from '@/types/lms';
import CompletionModal from '@/components/CompletionModal';

const DEFAULT_QUIZ_PASS_SCORE = 70;
type QuizFormType = "mcq" | "checkbox" | "paragraph" | "short_answer" | "rating" | "agree" | "choose_photo";
type QuizFormQuestion = {
  id: string;
  type: QuizFormType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  answerText?: string;
  scaleMax?: number;
};

const getQuizPassScore = (content?: string) => {
  if (!content) return DEFAULT_QUIZ_PASS_SCORE;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed?.passScore === 'number') {
      return Math.min(100, Math.max(1, parsed.passScore));
    }
  } catch {
    const match = content.match(/pass(?:ing)?\s*score\s*[:=]\s*(\d{1,3})/i);
    if (match) return Math.min(100, Math.max(1, Number(match[1])));
  }
  return DEFAULT_QUIZ_PASS_SCORE;
};

const extractYouTubeVideoId = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  const matchers = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const re of matchers) {
    const match = trimmed.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
};

const parseQuizFormsFromModule = (module: Module): QuizFormQuestion[] => {
  try {
    const parsed = module.content ? JSON.parse(module.content) : null;
    if (Array.isArray(parsed?.forms)) return parsed.forms as QuizFormQuestion[];
  } catch {
    // ignore
  }
  return (module.questions || []).map((q) => ({
    id: q.id,
    type: "mcq" as const,
    prompt: q.question,
    options: q.options,
    correctIndex: q.correctAnswer,
  }));
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const parsePptModuleContent = (content?: string): { fileUrl: string; slideRange: string } => {
  if (!content) return { fileUrl: "", slideRange: "" };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.fileUrl === "string") {
      return {
        fileUrl: parsed.fileUrl,
        slideRange: typeof parsed.slideRange === "string" ? parsed.slideRange : "",
      };
    }
  } catch {
    // legacy plain URL
  }
  return { fileUrl: content, slideRange: "" };
};



const getDurationHours = (duration: any): string => {
  if (!duration && duration !== 0) return 'N/A';
  const str = String(duration).trim();
  if (!str || str === '0') return 'N/A';
  // If it's already a human-readable string like "2 hours" or "30 mins", return as-is
  if (isNaN(Number(str))) return str;
  // It's a number — treat as minutes
  const mins = Number(str);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
};

// Helper logic for safe HTML decoding (moved outside component)
const decodeHtmlEntities = (input: string): string => {
  if (!input) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = input;
  return txt.value;
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, effectiveRole, updateUserProgress, completeCourse, openLoginModal } = useAuth();
  const { getCourseById, deleteCourse, updateCourse } = useCourses();
  const contentTopRef = useRef<HTMLDivElement>(null); // Ref for scrolling to content top

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [assignmentContent, setAssignmentContent] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentFileUploading, setAssignmentFileUploading] = useState(false);
  const [assignmentSavedAt, setAssignmentSavedAt] = useState<string | null>(null);

  // --- Word Content Extraction & Editing State ---
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [isEditingWord, setIsEditingWord] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isSavingWord, setIsSavingWord] = useState(false);

  // --- Pagination & Trivia State ---
  const [viewMode, setViewMode] = useState<'reader' | 'trivia'>('reader');
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [triviaCards, setTriviaCards] = useState<{ question: string; answer: string }[]>([]);
  const [currentTriviaIndex, setCurrentTriviaIndex] = useState(0);
  const [showTriviaAnswer, setShowTriviaAnswer] = useState(false);

  // --- Completion Modal State ---
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    type: 'module' | 'quiz' | 'course';
    title?: string;
    score?: number;
  }>({ isOpen: false, type: 'module' });

  const [isFocusMode, setIsFocusMode] = useState(false);

  // --- Admin Course Editing State ---
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Process Word HTML into Pages and Trivia
  useEffect(() => {
    if (!wordHtml) return;

    // 1. Pagination Logic
    const parser = new DOMParser();
    const doc = parser.parseFromString(wordHtml, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    const newPages: string[] = [];
    let currentPageContent: Node[] = [];
    let currentLength = 0;
    const MAX_PAGE_LENGTH = 1500; // split roughly every 1500 characters

    nodes.forEach((node) => {
      const isHeader = node.nodeName.match(/^H[1-6]$/);
      const nodeLength = node.textContent?.length || 0;

      // Start new page if we hit a header AND we have enough content, OR if page is just too long
      if ((isHeader || currentLength > MAX_PAGE_LENGTH) && currentPageContent.length > 0) {
        const div = document.createElement('div');
        currentPageContent.forEach(n => div.appendChild(n.cloneNode(true)));
        newPages.push(div.innerHTML);
        currentPageContent = [];
        currentLength = 0;
      }
      currentPageContent.push(node);
      currentLength += nodeLength;
    });

    // Push remaining
    if (currentPageContent.length > 0) {
      const div = document.createElement('div');
      currentPageContent.forEach(n => div.appendChild(n.cloneNode(true)));
      newPages.push(div.innerHTML);
    }
    setPages(newPages.length > 0 ? newPages : [wordHtml]);
    setPageIndex(0); // Reset to page 1

    // 2. Trivia Extraction Logic
    // Pattern: Look for paragraphs containing "Question" and extract generic Q&A
    const extractedTrivia: { question: string; answer: string }[] = [];
    // Only text based analysis for now
    const textBlocks = Array.from(doc.body.querySelectorAll('p, li, blockquote'));

    for (let i = 0; i < textBlocks.length; i++) {
      const text = textBlocks[i].textContent || "";
      // Simple heuristic: Line starts with "Question" or "Q:"
      if (text.match(/^(Question|Q\s*[:\-])/i) || textBlocks[i].querySelector('strong')?.textContent?.match(/Question/i)) {
        const questionText = text; // or strip "Question:" prefix
        // Look ahead for "Answer"
        let answerText = "Answer not found in document structure.";

        // Try next few siblings for "Answer"
        for (let j = 1; j <= 3; j++) {
          if (i + j < textBlocks.length) {
            const nextText = textBlocks[i + j].textContent || "";
            if (nextText.match(/^(Answer|A\s*[:\-])/i) || textBlocks[i + j].querySelector('strong')?.textContent?.match(/Answer/i)) {
              answerText = textBlocks[i + j].innerHTML;
              i += j; // Skip this line in main loop
              break;
            }
          }
        }
        if (answerText !== "Answer not found in document structure.") {
          extractedTrivia.push({
            question: textBlocks[i].innerHTML,
            answer: answerText
          });
        }
      }
    }
    setTriviaCards(extractedTrivia);

  }, [wordHtml]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const course = getCourseById(id || '');
  const userProgress = user?.progress.find(p => p.courseId === id);

  useEffect(() => {
    console.log('CourseDetail: Progress Effect', { userProgress, courseId: id });
    if (userProgress && course) {
      setActiveModuleIndex(userProgress.lastModuleIndex);
      // Load completed modules from progress percentage to be more accurate
      // If progress is 100%, all are done. If 0%, none. 
      // Otherwise, assume linear progression or respect existing state if we are tracking specific IDs locally?
      // Since backend only stores 'progress' %, we estimate count. 
      // Ideally we should assume everything up to lastModuleIndex is 'read', but 'completed' usually implies passing quiz/finishing video.

      const total = course.modules.length;
      // Calculate how many modules "should" be done based on progress %
      const estimatedCompletedCount = Math.round((userProgress.progress / 100) * total);

      // We can also just trust 'lastModuleIndex' means "I am working on this", so 0 to lastModuleIndex-1 are DONE.
      // But if I just finished 0 and am ON 0 (before clicking next), it's ambiguous.
      // Let's use the MAX of (estimated based on progress) and (lastModuleIndex).

      const countByProgress = estimatedCompletedCount;
      const countByIndex = userProgress.lastModuleIndex;

      // Use the larger valid number to determine 'completed' modules
      const safeCount = Math.max(countByProgress, countByIndex);

      const completed = course.modules
        .slice(0, safeCount)
        .map(m => m.id);

      console.log('CourseDetail: Calculated completed modules', {
        progress: userProgress.progress,
        lastIndex: userProgress.lastModuleIndex,
        safeCount,
        completedIds: completed
      });

      setCompletedModules(prev => {
        // Merge with existing to avoid un-completing things during session
        const combined = new Set([...prev, ...completed]);
        return Array.from(combined);
      });
    }
  }, [userProgress, course]);


  useEffect(() => {
    // Auto-expand current module section
    if (course?.modules[activeModuleIndex]) {
      setExpandedModules([course.modules[activeModuleIndex].id]);
    }
  }, [activeModuleIndex, course]);

  useEffect(() => {
    if (!user || !course) return;
    const module = course.modules[activeModuleIndex];
    if (!module || module.type !== 'assignment' || effectiveRole !== 'learner') {
      setAssignmentContent('');
      setAssignmentSavedAt(null);
      return;
    }
    setAssignmentLoading(true);
    void api
      .get<{ content: string; submittedAt: string } | null>(`/me/assignments/${module.id}`)
      .then(({ data }) => {
        setAssignmentContent(data?.content || '');
        setAssignmentSavedAt(data?.submittedAt || null);
      })
      .catch(() => {
        setAssignmentContent('');
        setAssignmentSavedAt(null);
      })
      .finally(() => setAssignmentLoading(false));
  }, [activeModuleIndex, course, user, effectiveRole]);

  // --- Mammoth Parsing Effect ---
  // We need to define currentModule safely here for the effect
  const currentModuleForEffect = course?.modules[activeModuleIndex];
  // Detect if content is ALREADY html (extracted) or a URL
  const isHtmlContent = currentModuleForEffect?.type === 'word' && currentModuleForEffect.content && !currentModuleForEffect.content.trim().startsWith('http');

  // Helper logic to decode potentially double/triple escaped HTML entities
  const decodeHtmlEntities = (input: string): string => {
    const txt = document.createElement("textarea");
    txt.innerHTML = input;
    return txt.value;
  };

  useEffect(() => {
    if (!currentModuleForEffect || currentModuleForEffect.type !== 'word') return;

    if (isHtmlContent) {
      let content = currentModuleForEffect.content;

      // Try to decode up to 3 times or until we find a distinct opening tag
      // Use a simple heuristic: if it contains &lt; it needs decoding.
      let attempts = 0;
      while ((content.includes('&lt;') || content.includes('&amp;')) && attempts < 3) {
        const decoded = decodeHtmlEntities(content);
        if (decoded === content) break; // Stop if no change
        content = decoded;
        attempts++;
      }

      setWordHtml(content);
      return;
    }

    const docUrl = currentModuleForEffect.content;
    const fetchAndParse = async () => {
      try {
        // Dynamic import to avoid SSR issues if any
        const mammoth = await import('mammoth');
        const response = await fetch(docUrl);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setWordHtml(result.value);
      } catch (err) {
        console.error("Failed to parse Word doc", err);
      }
    };
    fetchAndParse();
  }, [currentModuleForEffect, isHtmlContent]);

  const handleSaveWordContent = async () => {
    if (!course || !currentModuleForEffect) return;
    setIsSavingWord(true);
    try {
      await api.patch(`/courses/${course.id}/modules/${currentModuleForEffect.id}`, {
        content: editorContent
      });
      setWordHtml(editorContent);
      setIsEditingWord(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to save content", err);
    } finally {
      setIsSavingWord(false);
    }
  };

  // Auth gate: block unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border max-w-md w-full">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Login Required</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You need to be logged in to view course content. Please log in or create an account to continue.
            </p>
            <button
              onClick={() => openLoginModal()}
              className="btn-primary w-full py-2.5 shadow-lg shadow-primary/20"
            >
              Log In to Continue
            </button>
            <Link to="/courses" className="block mt-4 text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Browse Courses
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {!isFocusMode && <Navbar />}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Course not found</h2>
            <Link to="/courses" className="text-primary hover:underline">
              Back to courses
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentModule = course.modules[activeModuleIndex];
  const totalModules = course.modules.length;
  // Use backend progress as source of truth; merge with local completedModules for real-time updates
  const backendProgress = userProgress?.progress ?? 0;
  const localProgress = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;
  // Take the higher of the two to avoid showing lower progress than what backend has
  const progress = Math.max(backendProgress, localProgress);
  const isEnrolled = userProgress !== undefined || user?.completedCourses.includes(course.id) || user?.role === 'admin';
  const isCourseComplete = user?.completedCourses.includes(course.id);
  const isInstructor = user?.role === 'admin';

  // --- Restored Logic Functions ---

  const handleEnroll = () => {
    if (!user) {
      openLoginModal();
      return;
    }
    if (effectiveRole !== 'learner' || isInstructor) {
      return;
    }
    updateUserProgress(course.id, {
      progress: 0,
      lastModuleIndex: 0,
      startedAt: new Date().toISOString()
    });
  };

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      const newCompleted = [...completedModules, moduleId];
      setCompletedModules(newCompleted);

      // Update progress
      const newProgress = Math.round((newCompleted.length / totalModules) * 100);
      updateUserProgress(course.id, {
        progress: newProgress,
        lastModuleIndex: activeModuleIndex
      });
    }
  };

  const handleModuleComplete = () => {
    markModuleComplete(currentModule.id);

    // Trigger celebration
    setCompletionModal({
      isOpen: true,
      type: 'module',
      title: 'Module Completed!',
    });
  };

  const handleNextModule = () => {
    if (activeModuleIndex < totalModules - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
      setQuizAnswers({});
      setQuizSubmitted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Prepare for course completion
      handleCompleteCourse();
    }
  };

  const handleQuizSubmit = () => {
    const forms = parseQuizFormsFromModule(currentModule);
    if (!forms.length) return;
    const passScore = getQuizPassScore(currentModule.content);

    let scoredCount = 0;
    let correctCount = 0;
    forms.forEach((q) => {
      const answer = quizAnswers[q.id];
      if (q.type === "mcq" || q.type === "choose_photo" || q.type === "agree" || q.type === "rating") {
        if (typeof q.correctIndex === "number") {
          scoredCount += 1;
          if (answer === q.correctIndex) correctCount += 1;
        }
        return;
      }
      if (q.type === "checkbox") {
        if ((q.correctIndexes || []).length > 0) {
          scoredCount += 1;
          const expected = new Set(q.correctIndexes || []);
          const actual = new Set(Array.isArray(answer) ? answer : []);
          const sameSize = expected.size === actual.size;
          const sameValues = [...expected].every((v) => actual.has(v));
          if (sameSize && sameValues) correctCount += 1;
        }
        return;
      }
      if (q.type === "short_answer" || q.type === "paragraph") {
        if (q.answerText && q.answerText.trim()) {
          scoredCount += 1;
          if (normalizeText(String(answer || "")) === normalizeText(q.answerText)) correctCount += 1;
        }
      }
    });

    const score =
      scoredCount > 0
        ? Math.round((correctCount / scoredCount) * 100)
        : 100;
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= passScore) {
      markModuleComplete(currentModule.id);
      setCompletionModal({
        isOpen: true,
        type: 'quiz',
        score: score,
        title: 'Quiz Passed!',
      });
    }
  };

  const handleAssignmentSubmit = async () => {
    if (!course || !currentModule || currentModule.type !== 'assignment') return;
    const plain = assignmentContent.replace(/<[^>]+>/g, "").trim();
    if (!plain) return;
    setAssignmentLoading(true);
    try {
      const { data } = await api.post<{ submittedAt: string }>('/me/assignments/submit', {
        courseId: course.id,
        moduleId: currentModule.id,
        content: assignmentContent,
      });
      setAssignmentSavedAt(data?.submittedAt || new Date().toISOString());
      markModuleComplete(currentModule.id);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleAssignmentFileUpload = async (file: File) => {
    setAssignmentFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileLink = `<p><a href="${data.url}" target="_blank" rel="noopener noreferrer">${file.name}</a></p>`;
      setAssignmentContent((prev) => `${prev}${fileLink}`);
    } finally {
      setAssignmentFileUploading(false);
    }
  };

  const handleCompleteCourse = () => {
    if (effectiveRole !== 'learner') return;
    completeCourse(course.id, course.title, course.cpdPoints);
    navigate('/certificates');
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getModuleIcon = (type: Module['type']) => {
    switch (type) {
      case 'video': return Play;
      case 'pdf': return FileText;
      case 'ppt': return FileText;
      case 'word': return FileText;
      case 'assignment': return FileText;
      case 'quiz': return HelpCircle;
    }
  };

  const renderModuleContent = () => {
    switch (currentModule.type) {
      case 'video':
        const youtubeId = extractYouTubeVideoId(currentModule.content);
        return (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={currentModule.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={currentModule.content}
                  controls
                  className="w-full h-full"
                  onEnded={() => markModuleComplete(currentModule.id)}
                />
              )}
            </div>
            <button
              onClick={handleModuleComplete}
              className="btn-primary flex items-center gap-2"
            >
              Mark as Complete & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'pdf':
      case 'ppt':
      case 'word':
        const pptMeta = currentModule.type === "ppt" ? parsePptModuleContent(currentModule.content) : null;
        let docUrl = currentModule.type === "ppt" ? pptMeta?.fileUrl || "" : currentModule.content;

        // Determine viewer URL
        const isPdf = currentModule.type === 'pdf' || docUrl.toLowerCase().endsWith('.pdf');
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(docUrl)}&embedded=true`;
        const viewerUrl = isPdf ? docUrl : googleViewerUrl;

        // Render Word Content (Extracted)
        if (currentModule.type === 'word') {
          // Extract subtitle from Word HTML content (first heading or first sentence)
          const extractSubtitle = (): string => {
            if (!wordHtml) return '';
            const parser = new DOMParser();
            const doc = parser.parseFromString(wordHtml, 'text/html');
            // Try to get the first heading
            const firstHeading = doc.querySelector('h1, h2, h3');
            if (firstHeading?.textContent?.trim()) return firstHeading.textContent.trim();
            // Fallback: first paragraph text (truncated)
            const firstP = doc.querySelector('p');
            if (firstP?.textContent?.trim()) {
              const text = firstP.textContent.trim();
              return text.length > 120 ? text.substring(0, 120) + '…' : text;
            }
            return '';
          };
          const subtitle = extractSubtitle();

          return (
            <div className="space-y-0">
              {/* Premium Module Header */}
              <div className="relative overflow-hidden rounded-t-xl border border-border border-b-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--accent) / 0.05) 50%, hsl(var(--muted)) 100%)',
                }}>
                {/* Subtle top gradient accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary/40" />

                <div className="px-6 pt-5 pb-4">
                  {/* Module position badge + Actions row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-3 py-1 rounded-full">
                      <FileText className="w-3.5 h-3.5" />
                      Module {activeModuleIndex + 1} of {totalModules}
                    </span>
                    <div className="flex gap-2">
                      {effectiveRole === 'admin' && (
                        <button
                          onClick={() => {
                            setEditorContent(wordHtml || '');
                            setIsEditingWord(!isEditingWord);
                          }}
                          className="btn-secondary btn-sm inline-flex items-center gap-2 text-xs"
                        >
                          <Pencil className="w-3 h-3" />
                          {isEditingWord ? 'Cancel Edit' : 'Edit Content'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg md:text-xl font-bold text-foreground leading-snug">
                    {currentModule.title}
                  </h2>

                  {/* Subtitle - extracted from document content */}
                  {subtitle && (
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {subtitle}
                    </p>
                  )}

                  {/* Duration badge if available */}
                  {currentModule.duration && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {currentModule.duration} min read
                    </div>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-background border border-border rounded-b-xl p-8 min-h-[400px]">
                {isEditingWord ? (
                  <div className="space-y-4">
                    <RichTextEditor
                      value={editorContent}
                      onChange={setEditorContent}
                      placeholder="Edit document content..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-primary"
                        onClick={handleSaveWordContent}
                        disabled={isSavingWord}
                      >
                        {isSavingWord ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* View Mode Toggle */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-muted p-1 rounded-lg inline-flex">
                        <button
                          onClick={() => setViewMode('reader')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'reader'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          Read Mode
                        </button>
                        <button
                          onClick={() => setViewMode('trivia')}
                          disabled={triviaCards.length === 0}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'trivia'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                            }`}
                        >
                          <HelpCircle className="w-4 h-4" />
                          Trivia Mode
                          {triviaCards.length > 0 && <span className="badge badge-accent ml-1">{triviaCards.length}</span>}
                        </button>
                      </div>
                    </div>

                    {/* Content Display */}
                    {viewMode === 'trivia' && triviaCards.length > 0 ? (
                      <div className="max-w-2xl mx-auto">
                        <div className="card-elevated p-8 min-h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>

                          <h3 className="text-muted-foreground uppercase text-xs font-bold tracking-wider mb-4">
                            Question {currentTriviaIndex + 1} of {triviaCards.length}
                          </h3>

                          <div
                            className="text-xl md:text-2xl font-semibold text-foreground mb-8 text-balance"
                            dangerouslySetInnerHTML={{ __html: triviaCards[currentTriviaIndex].question }}
                          />

                          {showTriviaAnswer ? (
                            <div className="animate-fade-in w-full bg-success/10 p-6 rounded-xl border border-success/20 mb-8">
                              <p className="text-sm text-success font-bold uppercase mb-2">Answer</p>
                              <div
                                className="text-lg text-foreground/90 text-left"
                                dangerouslySetInnerHTML={{ __html: triviaCards[currentTriviaIndex].answer }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowTriviaAnswer(true)}
                              className="btn-secondary mb-8"
                            >
                              Reveal Answer
                            </button>
                          )}

                          <div className="flex items-center gap-4 w-full justify-between mt-auto pt-6 border-t border-border/50">
                            <button
                              onClick={() => {
                                setCurrentTriviaIndex(prev => Math.max(0, prev - 1));
                                setShowTriviaAnswer(false);
                              }}
                              disabled={currentTriviaIndex === 0}
                              className="text-muted-foreground hover:text-primary disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => {
                                if (currentTriviaIndex < triviaCards.length - 1) {
                                  setCurrentTriviaIndex(prev => prev + 1);
                                  setShowTriviaAnswer(false);
                                } else {
                                  setViewMode('reader'); // Go back to reading
                                }
                              }}
                              className="btn-primary"
                            >
                              {currentTriviaIndex < triviaCards.length - 1 ? 'Next Question' : 'Finish Trivia'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Reader Mode (Paginated)
                      <div className="bg-sheet rounded-xl">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert word-reader min-h-[500px]"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(pages[pageIndex] || '<p>Loading content...</p>', {
                              USE_PROFILES: { html: true },
                              FORBID_TAGS: ['source-footnote', 'script', 'style'],
                              FORBID_ATTR: ['data-path-to-node', '_ngcontent-ng-c1943435085', 'data-turn-source-index', 'ng-version'],
                              KEEP_CONTENT: false, // Remove forbidden tags AND their content
                            })
                          }}
                        />

                        {/* Pagination Controls */}
                        {pages.length > 1 && (
                          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                            <button
                              onClick={() => {
                                setPageIndex(prev => Math.max(0, prev - 1));
                                contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              disabled={pageIndex === 0}
                              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Previous Page
                            </button>

                            <span className="text-sm font-medium text-muted-foreground">
                              Page {pageIndex + 1} of {pages.length}
                            </span>

                            <button
                              onClick={() => {
                                setPageIndex(prev => Math.min(pages.length - 1, prev + 1));
                                contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              disabled={pageIndex === pages.length - 1}
                              className="btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                              Next Page
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleModuleComplete}
                className="btn-primary flex items-center gap-2"
              >
                Mark as Complete & Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        }

        // Render PDF / PPT (Iframe Viewer)
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted p-4 rounded-t-xl border border-border border-b-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{currentModule.title}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={docUrl}
                  download
                  className="btn-secondary btn-sm inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                {currentModule.type === 'ppt' && pptMeta?.slideRange && (
                  <span className="text-xs text-muted-foreground self-center mr-2">
                    Slides: {pptMeta.slideRange}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-background border border-border rounded-b-xl overflow-hidden h-[800px] relative">
              {currentModule.type !== 'pdf' && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 -z-10">
                  <p className="text-muted-foreground">Loading document viewer...</p>
                </div>
              )}
              <iframe
                src={viewerUrl}
                className="w-full h-full border-none"
                title={currentModule.title}
              />
              {/* Fallback/Warning for localhost/Office files */}
              {!isPdf && (
                <div className="p-2 text-xs text-center text-muted-foreground bg-muted border-t border-border">
                  Note: Document preview requires a public URL. If you are on localhost or the preview fails, please use the Download button.
                </div>
              )}
            </div>

            <button
              onClick={handleModuleComplete}
              className="btn-primary flex items-center gap-2"
            >
              Mark as Complete & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground">{currentModule.title}</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(currentModule.content || "<p>No instructions provided.</p>"),
                }}
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Your Submission (Rich Text)</label>
                <RichTextEditor
                  value={assignmentContent}
                  onChange={setAssignmentContent}
                  placeholder="Write and format your assignment submission here..."
                  minHeightClass="min-h-[180px]"
                />
                <div className="mt-3">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Attach file(s): PDF, PPT, Word, Video, Images
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,video/*,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAssignmentFileUpload(file);
                      e.target.value = "";
                    }}
                    className="input-field py-2 text-sm"
                  />
                  {assignmentFileUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                </div>
              </div>

              {assignmentSavedAt && (
                <div className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Last submitted at {new Date(assignmentSavedAt).toLocaleString()}
                </div>
              )}

              <button
                onClick={handleAssignmentSubmit}
                disabled={assignmentLoading || assignmentFileUploading}
                className="btn-primary w-full md:w-auto"
              >
                {assignmentLoading ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        );

      case 'quiz':
        const quizForms = parseQuizFormsFromModule(currentModule);
        const passScore = getQuizPassScore(currentModule.content);
        const allRequiredAnswered = quizForms.every(q => {
          // Simplistic required check? Assuming all are required for now
          const ans = quizAnswers[q.id];
          return ans !== undefined && ans !== "" && (Array.isArray(ans) ? ans.length > 0 : true);
        });

        return (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">Quiz: {currentModule.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Pass score: {passScore}% • Questions: {quizForms.length}
              </p>

              {quizSubmitted ? (
                <div className={`p-6 rounded-xl border ${quizScore >= passScore ? 'bg-success/10 border-success/20' : 'bg-red-50 border-red-100'}`}>
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${quizScore >= passScore ? 'bg-success text-white' : 'bg-red-100 text-red-500'}`}>
                      {quizScore >= passScore ? <Award className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>
                    <h4 className="text-xl font-bold mb-2">
                      {quizScore >= passScore ? 'Congratulations! Passed' : 'Keep Trying'}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      You scored {quizScore}%. Required: {passScore}%
                    </p>
                    <button
                      onClick={() => {
                        setQuizSubmitted(false);
                        setQuizAnswers({});
                        setQuizScore(0);
                      }}
                      className="btn-secondary"
                    >
                      Retake Quiz
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {quizForms.map((q, idx) => (
                    <div key={q.id} className="space-y-3">
                      <p className="font-medium text-foreground flex gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        {q.prompt}
                      </p>

                      {q.type === 'mcq' && (
                        <div className="space-y-2 pl-6">
                          {(q.options || []).map((opt, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name={q.id}
                                value={optIdx}
                                checked={quizAnswers[q.id] === optIdx}
                                onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div className="pl-6">
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Type your answer..."
                            value={quizAnswers[q.id] || ''}
                            onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          />
                        </div>
                      )}

                      {/* Add other types as needed */}
                    </div>
                  ))}

                  <button
                    onClick={handleQuizSubmit}
                    disabled={!allRequiredAnswered}
                    className="w-full btn-primary py-3"
                  >
                    Submit Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      {!isFocusMode && <Navbar />}

      <main className={`flex-1 container mx-auto px-4 ${isFocusMode ? 'py-8 max-w-5xl' : 'py-8'}`}>
        {/* Toggle Focus Mode Button - ALWAYS VISIBLE */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="btn-secondary rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {isFocusMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            )}
          </button>
        </div>

        {/* Breadcrumb / Header - Hidden in Focus Mode */}
        {!isFocusMode && (
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => navigate('/courses')}
              className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Courses
            </button>
          </div>
        )}

        {/* Course Header — Compact */}
        {!isFocusMode && (
          <div className="bg-card rounded-xl p-5 shadow-sm border border-border mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditingCourse ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Course Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={isSavingCourse}
                        onClick={async () => {
                          if (!id || !editTitle.trim()) return;
                          setIsSavingCourse(true);
                          try {
                            await updateCourse(id, { title: editTitle.trim(), description: editDescription.trim() });
                            setIsEditingCourse(false);
                          } catch (err) {
                            alert('Failed to save course changes.');
                          } finally {
                            setIsSavingCourse(false);
                          }
                        }}
                        className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs"
                      >
                        <Save className="w-3 h-3" />
                        {isSavingCourse ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditingCourse(false)}
                        className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                      {course.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>{getDurationHours(course.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                        <Award className="w-3 h-3 text-accent" />
                        <span>{course.cpdPoints} CPD Points</span>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                        <BookOpen className="w-3 h-3" />
                        <span>{totalModules} Modules</span>
                      </div>
                      {isCourseComplete && (
                        <div className="flex items-center gap-1 bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Admin actions + progress */}
              <div className="flex items-center gap-3">
                {effectiveRole === 'admin' && !isEditingCourse && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditTitle(course.title);
                        setEditDescription(course.description || '');
                        setIsEditingCourse(true);
                      }}
                      className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!id) return;
                        if (window.confirm('Are you sure you want to permanently delete this course? This action cannot be undone.')) {
                          try {
                            await deleteCourse(id);
                            navigate('/courses');
                          } catch (err) {
                            alert('Failed to delete course. You may not have permission.');
                          }
                        }
                      }}
                      className="btn-sm inline-flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}

                {/* Compact progress bar */}
                <div className="md:w-48 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">{progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Content Area (Left) */}
          <div className="space-y-6 min-w-0">
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden" ref={contentTopRef}>
              {renderModuleContent()}
            </div>

            {/* Module Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (activeModuleIndex > 0) {
                    setActiveModuleIndex(activeModuleIndex - 1);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={activeModuleIndex === 0}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Module</span>
              </button>
              <button
                onClick={() => {
                  setCompletionModal(prev => ({ ...prev, isOpen: false }));
                  if (activeModuleIndex < totalModules - 1) {
                    setActiveModuleIndex(activeModuleIndex + 1);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    handleCompleteCourse();
                  }
                }}
                className="btn-primary flex items-center gap-2"
              >
                {activeModuleIndex < totalModules - 1 ? 'Next Module' : 'Complete Course'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar (Right) — Sticky on Desktop */}
          {!isFocusMode && (
            <div className="hidden lg:block">
              <div className="sticky top-6 space-y-4">
                {/* Progress Card */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                    <span className="text-sm font-bold text-primary">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {completedModules.length} of {totalModules} modules completed
                  </p>
                </div>

                {/* Module List */}
                <div className="bg-card rounded-xl border border-border p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Modules</h3>
                  <div className="space-y-1">
                    {course.modules.map((module, index) => {
                      const isActive = index === activeModuleIndex;
                      const isCompleted = completedModules.includes(module.id);
                      const Icon = getModuleIcon(module.type);

                      return (
                        <button
                          key={module.id}
                          onClick={() => {
                            setActiveModuleIndex(index);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-sm ${isActive
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                            : isCompleted
                              ? 'text-foreground hover:bg-muted/50'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' :
                            isCompleted ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                            }`}>
                            {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight truncate">{module.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                              {module.type} • {module.duration ? Math.round(module.duration / 60) + ' min' : '5 min'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Enroll / Certificate */}
                {!isInstructor && (
                  <>
                    {!isEnrolled ? (
                      <button
                        onClick={handleEnroll}
                        className="w-full btn-primary py-2.5 shadow-lg shadow-primary/20 rounded-xl"
                      >
                        Start Learning
                      </button>
                    ) : progress === 100 ? (
                      <button
                        onClick={() => navigate('/certificates')}
                        className="w-full btn-secondary py-2.5 rounded-xl"
                      >
                        View Certificate
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Mobile Module List (below content on small screens) */}
          {!isFocusMode && (
            <div className="lg:hidden">
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold text-sm mb-3">Course Modules</h3>
                <div className="space-y-1">
                  {course.modules.map((module, index) => {
                    const isActive = index === activeModuleIndex;
                    const isCompleted = completedModules.includes(module.id);
                    const Icon = getModuleIcon(module.type);

                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          setActiveModuleIndex(index);
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 transition-all text-sm ${isActive
                          ? 'bg-primary/10 text-primary'
                          : isCompleted
                            ? 'text-foreground hover:bg-muted/50'
                            : 'text-muted-foreground hover:bg-muted/50'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${isActive ? 'bg-primary text-primary-foreground' :
                          isCompleted ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                          }`}>
                          {isCompleted ? <CheckCircle className="w-3 h-3" /> : index + 1}
                        </div>
                        <span className="font-medium truncate">{module.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <CompletionModal
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal(prev => ({ ...prev, isOpen: false }))}
        onNext={handleNextModule}
        type={completionModal.type}
        title={completionModal.title}
        score={completionModal.score}
      />

      {!isFocusMode && <Footer />}
    </div >
  );
};

export default CourseDetail;
