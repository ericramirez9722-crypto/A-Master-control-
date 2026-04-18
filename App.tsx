
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  Loader2,
  Image as ImageIcon,
  Zap,
  AlertCircle,
  Crown,
  Maximize,
  Maximize2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Monitor,
  Smartphone,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  Sliders,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Camera,
  Key,
  RefreshCcw,
  Activity,
  Cpu,
  Layers,
  Repeat,
  ShieldCheck,
  Clock,
  Scan,
  Workflow,
  AlertTriangle,
  CreditCard,
  ShieldAlert,
  Info,
  Search,
  Filter,
  Calendar,
  Brush,
  Eraser,
  Undo,
  Undo2,
  Redo2,
  ExternalLink,
  Terminal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Contrast,
  Droplets,
  Wand2,
  Palette,
  Spline,
  Grid3X3,
  FileCode,
  Box,
  Layout,
  History,
  X,
  HelpCircle,
  Copyright,
  Type as TypeIcon,
  Users,
  MessageSquare,
  MousePointer2,
  Columns,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Mode, Preset, SyntergicDNA } from "./types";
import { IMAGE_PRESETS } from "./constants";
import { gemini } from "./services/geminiService";

// Enhanced Tooltip component supporting wide/detailed technical DNA strings
const Tooltip = ({ children, text, wide = false, title }: { children?: React.ReactNode; text: string; wide?: boolean; title?: string; key?: React.Key }) => (
  <div className="group relative flex items-center justify-center w-full">
    {children}
    <div className={`pointer-events-none absolute bottom-full mb-3 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 z-[100] scale-95 group-hover:scale-100 ${wide ? 'w-72' : 'w-max'}`}>
      <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-2xl border border-[var(--border-primary)] p-3 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] w-full">
        {title && (
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--border-primary)]">
            <Cpu size={10} className="text-amber-400" />
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-[0.3em]">{title}</span>
          </div>
        )}
        <p className={`text-[9px] text-[var(--text-primary)] leading-relaxed tracking-wide ${wide ? 'font-medium' : 'font-black uppercase tracking-[0.2em] whitespace-nowrap'}`}>
          {text}
        </p>
      </div>
      <div className="w-2 h-2 bg-[var(--bg-secondary)]/95 border-r border-b border-[var(--border-primary)] rotate-45 -mt-1 shadow-xl" />
    </div>
  </div>
);

interface HistoryItem {
  id: string;
  timestamp: string;
  mode: string;
  prompt: string;
  params: any;
  image: string;
}

const MAX_PROMPT_LENGTH = 15000;
const MAX_WATERMARK_LENGTH = 50;
const MAX_SEARCH_LENGTH = 100;

export default function App(): React.ReactElement {
  const [mode, setMode] = useState<Mode>("texture");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [prompt, setPrompt] = useState("Vibrant abstract neural threads with metallic finish");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [luxury, setLuxury] = useState(0.8);
  const [realism, setRealism] = useState(0.9);
  const [mutation, setMutation] = useState(0.2);
  const [sceneDepth, setSceneDepth] = useState(0.8);
  const [syntergicParams, setSyntergicParams] = useState<SyntergicDNA>({ lambda: 85, protocol: 90, entropy: 15 });
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [upscaleFactor, setUpscaleFactor] = useState<"2x" | "4x" | "8x">("2x");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `HIST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const exportHistory = () => {
    if (history.length === 0) return;
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ia-studio-history-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  const [error, setError] = useState<{message: string, type: 'quota' | 'permission' | 'critical' | null} | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [highQuality, setHighQuality] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [promptSuggestions, setPromptSuggestions] = useState<{ enhanced: string; keywords: string[] } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [neuralMode, setNeuralMode] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkLogo, setWatermarkLogo] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
  const [isWatermarking, setIsWatermarking] = useState(false);
  const watermarkLogoInputRef = useRef<HTMLInputElement>(null);
  const [objectSearchQuery, setObjectSearchQuery] = useState("");
  const [objectSearchResults, setObjectSearchResults] = useState<any[]>([]);
  const [isSearchingObjects, setIsSearchingObjects] = useState(false);

  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyModeFilter, setHistoryModeFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);

  // Real-time Collaboration State
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const remoteUsersRef = useRef<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>("default");
  const socketRef = useRef<WebSocket | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  const [showAutoBoxes, setShowAutoBoxes] = useState(false);

  const allDetectedObjects = useMemo(() => {
    const searchResults = objectSearchResults.map(obj => ({ ...obj, isAuto: false }));
    const autoResults = showAutoBoxes ? (analysisData?.objects || []).map((obj: any) => ({ ...obj, isAuto: true })) : [];
    return [...searchResults, ...autoResults].filter(obj => obj.box_2d);
  }, [objectSearchResults, analysisData, showAutoBoxes]);

  const handleObjectSearch = async () => {
    const target = gradedImage || resultImage || sourceImage;
    if (!target || !objectSearchQuery) return;
    
    setIsSearchingObjects(true);
    try {
      const results = await gemini.searchSpecificObjects(target, objectSearchQuery);
      setObjectSearchResults(results);
      addLog(`OBJECT DETECTION: SEARCHED FOR "${objectSearchQuery.toUpperCase()}"`);
    } catch (err) {
      addLog("OBJECT DETECTION: SEARCH FAILED");
    } finally {
      setIsSearchingObjects(false);
    }
  };


  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.prompt.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                            item.id.toLowerCase().includes(historySearchQuery.toLowerCase());
      const matchesMode = historyModeFilter === 'all' || item.mode === historyModeFilter;
      
      let matchesDate = true;
      if (historyDateFilter !== 'all') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        if (historyDateFilter === 'today') {
          matchesDate = itemDate.toDateString() === now.toDateString();
        } else if (historyDateFilter === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= oneWeekAgo;
        } else if (historyDateFilter === 'month') {
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          matchesDate = itemDate >= oneMonthAgo;
        }
      }
      
      return matchesSearch && matchesMode && matchesDate;
    });
  }, [history, historySearchQuery, historyModeFilter, historyDateFilter]);

  const handleApplyWatermark = async () => {
    const target = gradedImage || resultImage || sourceImage;
    if (!target) return;
    
    setIsWatermarking(true);
    try {
      const watermarked = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("Canvas context not found");

          ctx.drawImage(img, 0, 0);
          ctx.globalAlpha = watermarkOpacity;

          const padding = canvas.width * 0.05;
          
          const drawContent = (logoImg?: HTMLImageElement) => {
            let x = 0;
            let y = 0;
            
            if (logoImg) {
              const logoWidth = canvas.width * 0.15;
              const logoHeight = (logoImg.height / logoImg.width) * logoWidth;

              switch (watermarkPosition) {
                case 'top-left': x = padding; y = padding; break;
                case 'top-right': x = canvas.width - logoWidth - padding; y = padding; break;
                case 'bottom-left': x = padding; y = canvas.height - logoHeight - padding; break;
                case 'bottom-right': x = canvas.width - logoWidth - padding; y = canvas.height - logoHeight - padding; break;
                case 'center': x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2; break;
              }
              ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
              
              if (watermarkText) {
                ctx.font = `bold ${canvas.width * 0.02}px Inter`;
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 4;
                ctx.fillText(watermarkText, x + logoWidth/2, y + logoHeight + (canvas.width * 0.025));
              }
            } else if (watermarkText) {
              ctx.font = `bold ${canvas.width * 0.035}px Inter`;
              ctx.fillStyle = "white";
              ctx.shadowColor = "rgba(0,0,0,0.8)";
              ctx.shadowBlur = 10;
              
              const metrics = ctx.measureText(watermarkText);
              const textWidth = metrics.width;
              const textHeight = canvas.width * 0.035;

              switch (watermarkPosition) {
                case 'top-left': x = padding; y = padding + textHeight; break;
                case 'top-right': x = canvas.width - textWidth - padding; y = padding + textHeight; break;
                case 'bottom-left': x = padding; y = canvas.height - padding; break;
                case 'bottom-right': x = canvas.width - textWidth - padding; y = canvas.height - padding; break;
                case 'center': x = (canvas.width - textWidth) / 2; y = (canvas.height + textHeight) / 2; break;
              }
              ctx.fillText(watermarkText, x, y);
            }
            resolve(canvas.toDataURL("image/png"));
          };

          if (watermarkLogo) {
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.onload = () => drawContent(logo);
            logo.onerror = () => drawContent();
            logo.src = watermarkLogo;
          } else {
            drawContent();
          }
        };
        img.onerror = () => reject("Failed to load source image");
        img.src = target;
      });
      
      setResultImage(watermarked);
      setGradedImage(null);
      addLog("IP PROTECTION: WATERMARK EMBEDDED SUCCESSFULLY");
    } catch (err) {
      addLog("IP PROTECTION: FAILED TO EMBED WATERMARK");
    } finally {
      setIsWatermarking(false);
    }
  };

  const onWatermarkLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setWatermarkLogo(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSuggestEnhancements = async () => {
    if (!prompt || prompt.length < 5) return;
    setIsSuggesting(true);
    try {
      const suggestions = await gemini.suggestEnhancements(prompt, mode);
      setPromptSuggestions(suggestions);
      addLog(`NEURAL SUGGESTION: GENERATED ${suggestions.keywords.length} KEYWORDS`);
    } catch (err) {
      addLog("NEURAL SUGGESTION: FAILED");
    } finally {
      setIsSuggesting(false);
    }
  };

  const analyzeScene = useCallback(() => {
    // Simulated scene analysis: deeper scenes allow more complexity, higher realism demands higher coherence
    return {
      coherence: Math.min(100, 50 + (realism * 40) + (luxury * 10)),
      structure: Math.min(100, 60 + (sceneDepth * 30) + (syntergicParams.protocol > 80 ? 10 : 0)),
      noise: Math.min(100, 10 + (mutation * 80) + (syntergicParams.entropy / 2))
    };
  }, [realism, luxury, sceneDepth, mutation, syntergicParams]);

  const runAdaptivePass = useCallback((baseDNA?: SyntergicDNA) => {
    const s = analyzeScene();
    const gamma = 0.35;
    
    const startDNA = baseDNA || syntergicParams;

    const targetDNA: SyntergicDNA = {
      lambda: Math.round(startDNA.lambda + gamma * (s.coherence - startDNA.lambda)),
      protocol: Math.round(startDNA.protocol + gamma * (s.structure - startDNA.protocol)),
      entropy: Math.round(startDNA.entropy + gamma * (s.noise - startDNA.entropy)),
    };

    setSyntergicParams(targetDNA);
    addLog(`SYNTERGIC ADAPTATIVE PASS: Λ=${targetDNA.lambda} Π=${targetDNA.protocol} Δν=${targetDNA.entropy}`);
  }, [analyzeScene, syntergicParams]);

  const mapLambda = (v: number) => v > 80 ? "coherent lighting, stable concepts" : v < 40 ? "diffuse lighting, abstract concept drift" : "balanced lighting";
  const mapProtocol = (v: number) => v > 80 ? "structured composition, geometric precision" : v < 40 ? "organic composition, relaxed topology" : "standard studio structure";
  const mapEntropy = (v: number) => v > 60 ? "heavy film grain, dense micro-particles, divergent details" : v < 20 ? "clean textures, deterministic framing" : "subtle film grain, standard detail density";

  // Auto-suggest enhancements in Neural Mode
  useEffect(() => {
    if (!neuralMode || !prompt || prompt.length < 10) return;
    
    const timer = setTimeout(() => {
      handleSuggestEnhancements();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [prompt, neuralMode]);

  // Auto-trigger tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorialV1");
    if (!hasSeenTutorial && hasKey === true) {
      setShowTutorial(true);
      localStorage.setItem("hasSeenTutorialV1", "true");
    }
  }, [hasKey]);
  const [showMaskPreview, setShowMaskPreview] = useState(true);
  const [ethicalProtocol, setEthicalProtocol] = useState(true);
  const [provenanceData, setProvenanceData] = useState<{
    id: string;
    timestamp: string;
    mode: string;
    prompt: string;
    model: string;
    hash: string;
  } | null>(null);
  const stopEvolutionRef = useRef(false);

  const [evolutionCycles, setEvolutionCycles] = useState(2);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [sourceZoom, setSourceZoom] = useState(1);
  const [sourceOffset, setSourceOffset] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [worldbuildResults, setWorldbuildResults] = useState<{ category: string; image: string }[] | null>(null);
  const [multiResults, setMultiResults] = useState<string[] | null>(null);
  const [variationCount, setVariationCount] = useState<1 | 2 | 4 | 8>(1);
  const [assetType, setAssetType] = useState<"icon" | "component" | "illustration">("icon");
  const [assetBackground, setAssetBackground] = useState<"isolated" | "gradient" | "scene">("isolated");
  const [exportSettings, setExportSettings] = useState({ format: 'png', quality: 90 });
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [surfaceDetail, setSurfaceDetail] = useState(1.0);
  const [materialType, setMaterialType] = useState("Metal");
  const [isTiling, setIsTiling] = useState(true);
  const [styleIntensity, setStyleIntensity] = useState(0.8);
  
  // Advanced Color Grading State
  const [grading, setGrading] = useState({
    hue: 0,
    shadowsR: 0, shadowsG: 0, shadowsB: 0,
    midtonesR: 0, midtonesG: 0, midtonesB: 0,
    highlightsR: 0, highlightsG: 0, highlightsB: 0,
    blacks: 0, shadows: 0, midtones: 0, highlights: 0, whites: 0
  });

  const [lutData, setLutData] = useState<number[][][][] | null>(null);
  const [lutSize, setLutSize] = useState<number>(0);
  const [lutName, setLutName] = useState<string>("");
  const [lutIntensity, setLutIntensity] = useState(1);
  const [isApplyingLut, setIsApplyingLut] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [gradedImage, setGradedImage] = useState<string | null>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo History State
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const lastSavedStateRef = useRef<string>("");

  const saveToHistory = useCallback((label: string = "Manual Snapshot") => {
    const currentState = {
      label,
      timestamp: new Date().toISOString(),
      prompt,
      negativePrompt,
      filters: { ...filters },
      grading: { ...grading },
      lutData,
      lutName,
      lutSize,
      lutIntensity,
      straighten,
      sourceZoom,
      sourceOffset: { ...sourceOffset },
      activePreset,
      mask: maskCanvasRef.current ? maskCanvasRef.current.toDataURL() : null,
      thumbnail: gradedImage || resultImage || sourceImage
    };
    
    const stateString = JSON.stringify({ ...currentState, label: undefined, timestamp: undefined, lutData: lutData ? "exists" : "null", mask: currentState.mask ? "exists" : "null", thumbnail: currentState.thumbnail ? "exists" : "null" }); // Don't stringify large data or metadata
    if (stateString === lastSavedStateRef.current) return;
    
    lastSavedStateRef.current = stateString;
    setUndoStack(prev => {
      const newStack = [...prev, currentState];
      if (newStack.length > 50) return newStack.slice(newStack.length - 50);
      return newStack;
    });
    setRedoStack([]);
  }, [prompt, negativePrompt, filters, grading, lutData, lutName, lutSize, lutIntensity, straighten, sourceZoom, sourceOffset, activePreset, resultImage, sourceImage, gradedImage]);

  const applyState = useCallback((state: any) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.negativePrompt !== undefined) setNegativePrompt(state.negativePrompt);
    setFilters(state.filters);
    setGrading(state.grading);
    setLutData(state.lutData);
    setLutName(state.lutName);
    setLutSize(state.lutSize);
    setLutIntensity(state.lutIntensity);
    setStraighten(state.straighten || 0);
    setSourceZoom(state.sourceZoom || 1);
    setSourceOffset(state.sourceOffset || { x: 0, y: 0 });
    setActivePreset(state.activePreset || null);
    setMaskPreview(state.mask || null);
    
    if (state.mask && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = state.mask;
      }
    } else if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    
    lastSavedStateRef.current = JSON.stringify({ ...state, lutData: state.lutData ? "exists" : "null", mask: state.mask ? "exists" : "null" });
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const currentState = {
      prompt,
      negativePrompt,
      filters: { ...filters },
      grading: { ...grading },
      lutData,
      lutName,
      lutSize,
      lutIntensity,
      straighten,
      sourceZoom,
      sourceOffset: { ...sourceOffset },
      activePreset,
      mask: maskCanvasRef.current ? maskCanvasRef.current.toDataURL() : null
    };
    
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    
    applyState(prevState);
    addLog("UNDO: RESTORING PREVIOUS NEURAL STATE");
  }, [undoStack, prompt, negativePrompt, filters, grading, lutData, lutName, lutSize, lutIntensity, straighten, sourceZoom, sourceOffset, activePreset, applyState]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const currentState = {
      prompt,
      negativePrompt,
      filters: { ...filters },
      grading: { ...grading },
      lutData,
      lutName,
      lutSize,
      lutIntensity,
      straighten,
      sourceZoom,
      sourceOffset: { ...sourceOffset },
      activePreset,
      mask: maskCanvasRef.current ? maskCanvasRef.current.toDataURL() : null
    };
    
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
    
    applyState(nextState);
    addLog("REDO: ADVANCING TO NEXT NEURAL STATE");
  }, [redoStack, prompt, negativePrompt, filters, grading, lutData, lutName, lutSize, lutIntensity, straighten, sourceZoom, sourceOffset, activePreset, applyState]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Real-time Collaboration Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get("room") || "default";
    setRoomId(rId);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}?roomId=${rId}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      isRemoteUpdateRef.current = true;

      switch (type) {
        case "init":
          setMyUserId(payload.userId);
          setRemoteUsers(payload.users);
          setComments(payload.comments);
          if (payload.state) {
            applyState(payload.state);
          }
          break;
        case "user:joined":
          setRemoteUsers(prev => [...prev, payload]);
          addLog(`COLLABORATION: ${payload.name.toUpperCase()} JOINED`);
          break;
        case "user:mode-updated":
          setRemoteUsers(prev => prev.map(u => u.id === payload.userId ? { ...u, mode: payload.mode } : u));
          break;
        case "user:typing-status":
          setRemoteUsers(prev => prev.map(u => u.id === payload.userId ? { ...u, isTyping: payload.isTyping } : u));
          break;
        case "user:left":
          setRemoteUsers(prev => prev.filter(u => u.id !== payload.userId));
          setCursors(prev => {
            const next = { ...prev };
            delete next[payload.userId];
            return next;
          });
          addLog("COLLABORATION: USER LEFT");
          break;
        case "state:updated":
          applyState(payload);
          break;
        case "comment:added":
          setComments(prev => [...prev, payload]);
          break;
        case "comment:deleted":
          setComments(prev => prev.filter(c => c.id !== payload.id));
          break;
        case "cursor:moved":
          const user = remoteUsersRef.current.find(u => u.id === payload.userId);
          if (user) {
            setCursors(prev => ({
              ...prev,
              [payload.userId]: { x: payload.x, y: payload.y, name: user.name, color: user.color }
            }));
          }
          break;
      }

      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    };

    return () => {
      socket.close();
    };
  }, [applyState]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "cursor:move",
      payload: { x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 }
    }));
  };

  const addComment = (text: string, x: number, y: number) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "comment:add",
      payload: { text, x, y }
    }));
  };

  const deleteComment = (id: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "comment:delete",
      payload: { id }
    }));
  };

  // Sync local changes to server
  useEffect(() => {
    if (isRemoteUpdateRef.current || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "state:update",
      payload: { filters, grading, prompt, mode, sourceImage, resultImage, mask: maskPreview, activePreset }
    }));
  }, [filters, grading, prompt, mode, sourceImage, resultImage, maskPreview, activePreset]);

  // Update mode separately for presence
  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "user:update-mode",
      payload: { mode }
    }));
  }, [mode]);

  // Handle typing status
  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    const isTyping = prompt.length > 0;
    socketRef.current.send(JSON.stringify({
      type: "user:typing",
      payload: { isTyping }
    }));
    
    if (isTyping) {
      const timer = setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "user:typing",
            payload: { isTyping: false }
          }));
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [prompt]);

  // Auto-apply LUT when intensity or data changes
  useEffect(() => {
    const target = resultImage || sourceImage;
    if (lutData && target && mode === "color-grading") {
      const timer = setTimeout(async () => {
        setIsApplyingLut(true);
        try {
          const res = await applyLUTToImage(target);
          setGradedImage(res);
        } catch (err) {
          console.error("Error applying LUT:", err);
        } finally {
          setIsApplyingLut(false);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lutIntensity, lutData, resultImage, sourceImage, mode]);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showSyntergicControls, setShowSyntergicControls] = useState(true);
  const progressIntervalRef = useRef<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkKeyStatus();
    return () => { if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current); };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [statusLog]);

  const TUTORIAL_STEPS = [
    {
      title: "WELCOME TO MASTER CONTROL",
      description: "You are at the command center of IA Studio. Here you can synthesize, edit, and perfect visual assets with surgical precision.",
      icon: <Cpu className="text-amber-400" size={24} />,
      targetId: null
    },
    {
      title: "MODES OF OPERATION",
      description: "Switch between Generate (creation), Edit (modification), Inpaint (local regeneration), Vision (analysis), and Color-Grading (LUTs).",
      icon: <Layers className="text-indigo-400" size={24} />,
      targetId: "mode-selector"
    },
    {
      title: "SYNTERGIC ENGINE",
      description: "Fine-tune Λ (Coherence), Π (Protocol), and Δν (Entropy) to define the soul of the visual synthesis.",
      icon: <Activity className="text-emerald-400" size={24} />,
      targetId: "syntergic-engine"
    },
    {
      title: "NEURAL INTENT PROMPT",
      description: "Describe your final vision: lighting, materials, composition, and aesthetics. This is the primary signal for the engine.",
      icon: <Terminal className="text-white" size={24} />,
      targetId: "prompt-area"
    },
    {
      title: "SIGNATURE DNA",
      description: "Apply pre-defined aesthetic signatures to anchor your synthesis in specific artistic styles.",
      icon: <Crown className="text-amber-400" size={24} />,
      targetId: "signature-dna"
    },
    {
      title: "3D LUT ENGINE",
      description: "Import .cube files to apply professional cinematic color grading directly in the browser.",
      icon: <Grid3X3 className="text-blue-400" size={24} />,
      targetId: "lut-engine"
    },
    {
      title: "TRIGGER SYNTHESIS",
      description: "Once ready, fire the neural pulse to start the generation process. The time varies based on complexity.",
      icon: <Zap className="text-amber-400" size={24} />,
      targetId: "action-button"
    },
    {
      title: "REAL-TIME COLLABORATION",
      description: "Work with others in real-time. See their cursors, share states, and leave comments directly on the canvas.",
      icon: <Users className="text-indigo-400" size={24} />,
      targetId: "collaboration-presence"
    },
    {
      title: "NEURAL TIMELINE",
      description: "Access the version history to jump back to any previous state of your project with surgical precision.",
      icon: <Clock className="text-amber-400" size={24} />,
      targetId: "undo-redo-controls"
    },
    {
      title: "PROVENANCE & LOGS",
      description: "Monitor the neural handshake and access the ethical provenance data for every generated asset.",
      icon: <ShieldCheck className="text-emerald-400" size={24} />,
      targetId: "provenance-logs"
    }
  ];

  const PROMPT_GUIDE = {
    generate: {
      title: "GENERATE MODE TIPS",
      icon: <Sparkles className="text-amber-400" size={24} />,
      steps: [
        { label: "Subject", text: "Be specific (e.g., 'A futuristic chrome robot' instead of 'a robot')." },
        { label: "Environment", text: "Add context (e.g., 'in a neon-lit cyberpunk alleyway')." },
        { label: "Lighting", text: "Use terms like 'volumetric lighting', 'golden hour', or 'harsh cinematic shadows'." },
        { label: "Composition", text: "Mention camera angles like 'low angle shot' or 'extreme close-up'." },
        { label: "Syntergic", text: "Increase Λ (Coherence) for strict adherence, or Δν (Entropy) for creative surprises." }
      ],
      examples: [
        "A hyper-realistic portrait of a cyberpunk nomad, neon face paint, volumetric smoke, 8k, cinematic lighting.",
        "An architectural visualization of a solarpunk skyscraper, lush vertical gardens, glass and white marble, sunset lighting.",
        "A macro shot of a mechanical eye, intricate gears and circuits, bioluminescent blue glow, shallow depth of field."
      ]
    },
    edit: {
      title: "EDIT MODE TIPS",
      icon: <Brush className="text-indigo-400" size={24} />,
      steps: [
        { label: "Reference", text: "Mention what to keep and what to change from the original image." },
        { label: "Actions", text: "Use verbs: 'Replace the background with...', 'Change the color of...'." },
        { label: "Consistency", text: "Use terms like 'preserving the original lighting and texture'." },
        { label: "Syntergic", text: "Keep Π (Protocol) high to ensure structural integrity of the original image." }
      ],
      examples: [
        "Change the background to a futuristic Martian colony while keeping the character's pose and lighting.",
        "Modify the car's color to a deep metallic emerald green with carbon fiber accents.",
        "Add a holographic interface floating in front of the subject, matching the scene's blue lighting."
      ]
    },
    worldbuilding: {
      title: "WORLDBUILDING TIPS",
      icon: <Workflow className="text-emerald-400" size={24} />,
      steps: [
        { label: "Theme", text: "Establish a consistent aesthetic (e.g., 'Solarpunk architecture with lush greenery')." },
        { label: "Atmosphere", text: "Use sensory words like 'humid', 'ancient', 'technological', or 'ethereal'." },
        { label: "Materials", text: "Mention 'weathered stone', 'liquid metal', 'bioluminescent fibers'." },
        { label: "Syntergic", text: "Balance Λ and Δν for a mix of coherent structures and unique details." }
      ],
      examples: [
        "A subterranean city built inside a giant crystal geode, glowing minerals, steam-powered machinery.",
        "A floating archipelago of islands connected by light bridges, ivory towers, waterfalls falling into the void.",
        "A post-apocalyptic desert oasis built from salvaged starship parts, rusted metal, vibrant desert flowers."
      ]
    },
    texture: {
      title: "TEXTURE GENERATION TIPS",
      icon: <Grid3X3 className="text-purple-400" size={24} />,
      steps: [
        { label: "Surface", text: "Describe the tactile quality (e.g., 'cracked', 'polished', 'weathered', 'oxidized')." },
        { label: "Material", text: "Specify the base (e.g., 'brushed aluminum', 'obsidian', 'velvet', 'mossy bark')." },
        { label: "Scale", text: "Mention the detail scale (e.g., 'micro-scratches', 'large-scale patterns')." },
        { label: "Tiling", text: "Ensure 'Seamless Active' is selected for repeatable assets." }
      ],
      examples: [
        "Weathered dark basalt stone with deep cracks and glowing lava veins, seamless PBR texture.",
        "Intricate futuristic hexagonal carbon fiber weave, matte finish with glossy accents, 8k resolution.",
        "Ancient moss-covered oak bark, detailed micro-textures, natural lighting, seamless tiling."
      ]
    },
    mockup: {
      title: "MOCKUP MODE TIPS",
      icon: <Layout className="text-blue-400" size={24} />,
      steps: [
        { label: "Product", text: "Define the object (e.g., 'minimalist perfume bottle', 'sleek smartphone')." },
        { label: "Setting", text: "Place it in a context (e.g., 'on a marble vanity', 'floating in a void')." },
        { label: "Branding", text: "Mention label areas or logo placements (e.g., 'clean white label', 'embossed logo')." }
      ],
      examples: [
        "A luxury matte black watch on a dark velvet cushion, dramatic side lighting, professional product photography.",
        "A minimalist skincare set on a wet stone surface, natural morning light, clean aesthetic.",
        "A futuristic VR headset floating in a dark studio, neon accents, high-tech presentation."
      ]
    },
    asset: {
      title: "ASSET MODE TIPS",
      icon: <Box className="text-orange-400" size={24} />,
      steps: [
        { label: "Type", text: "Specify the asset (e.g., 'UI icon set', '3D game prop', 'character sprite')." },
        { label: "Style", text: "Define the visual language (e.g., 'flat design', 'low poly', 'hyper-realistic')." },
        { label: "Background", text: "Usually 'isolated on white' or 'transparent background' for easy extraction." }
      ],
      examples: [
        "A set of futuristic sci-fi UI icons, neon blue, glass morphism style, isolated on black background.",
        "A low-poly stylized treasure chest, hand-painted textures, vibrant colors, isolated on white.",
        "A hyper-realistic 3D model of a futuristic drone, white and orange plating, isolated on grey."
      ]
    }
  };

  const WORLDBUILDING_TEMPLATES = [
    {
      id: "sci-fi",
      name: "Cyberpunk Metropolis",
      icon: <Cpu className="text-blue-400" size={16} />,
      prompt: "A sprawling cyberpunk metropolis at night, neon-lit skyscrapers, rain-slicked streets, flying vehicles, volumetric fog, cinematic lighting, ultra-detailed architecture.",
      params: { lambda: 90, pi: 85, deltaNu: 20 }
    },
    {
      id: "fantasy",
      name: "Ethereal Citadel",
      icon: <Sparkles className="text-amber-400" size={16} />,
      prompt: "An ancient ethereal citadel floating above a sea of clouds, bioluminescent flora, crystalline towers, majestic waterfalls, golden hour lighting, magical atmosphere.",
      params: { lambda: 80, pi: 75, deltaNu: 30 }
    },
    {
      id: "historical",
      name: "Victorian London",
      icon: <Clock className="text-stone-400" size={16} />,
      prompt: "Victorian London in the 1880s, cobblestone streets, gas lamps, horse-drawn carriages, thick fog, gothic architecture, sepia-toned cinematic photography.",
      params: { lambda: 95, pi: 95, deltaNu: 5 }
    },
    {
      id: "nature",
      name: "Bioluminescent Jungle",
      icon: <Zap className="text-emerald-400" size={16} />,
      prompt: "A dense bioluminescent jungle on an alien planet, glowing exotic plants, giant mushrooms, vibrant spores in the air, deep twilight, immersive depth of field.",
      params: { lambda: 75, pi: 80, deltaNu: 40 }
    }
  ];

  const PromptGuideOverlay = () => {
    if (!showPromptGuide) return null;
    const guide = (PROMPT_GUIDE as any)[mode] || PROMPT_GUIDE.generate;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 max-w-xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <button 
            onClick={() => setShowPromptGuide(false)}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <Trash2 size={20} />
          </button>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                {guide.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Prompting Guide</span>
                <h3 className="text-2xl font-black tracking-tighter text-white">{guide.title}</h3>
              </div>
            </div>

            <div className="space-y-6 max-h-[50vh] overflow-y-auto custom-scroll pr-2">
              <div className="space-y-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Core Principles</span>
                {guide.steps.map((step: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{step.label}</span>
                    <p className="text-zinc-300 text-xs leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>

              {guide.examples && (
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reference Examples</span>
                  <div className="space-y-3">
                    {guide.examples.map((example: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          setPrompt(example);
                          setShowPromptGuide(false);
                          addLog(`PROTOCOL: APPLIED EXAMPLE PROMPT`);
                        }}
                        className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                      >
                        <p className="text-zinc-400 text-[10px] leading-relaxed group-hover:text-white transition-colors italic">"{example}"</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setShowPromptGuide(false)}
                className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HistoryOverlay = () => {
    if (!showHistory) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowHistory(false)} />
        <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] w-full max-w-5xl max-h-[80vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b border-[var(--border-primary)] flex flex-col gap-6 bg-[var(--bg-secondary)]/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <History className="text-amber-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Historial de Generación</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Registro de síntesis visual y parámetros neurales</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportHistory}
                  disabled={history.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} /> Exportar JSON
                </button>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar por prompt o ID..."
                  value={historySearchQuery}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_SEARCH_LENGTH) {
                      setHistorySearchQuery(e.target.value);
                    }
                  }}
                  className={`w-full bg-white/5 border rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all ${historySearchQuery.length >= MAX_SEARCH_LENGTH ? "border-red-500/50" : "border-white/10 focus:border-amber-400/50"}`}
                />
              </div>

              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" size={16} />
                <select 
                  value={historyModeFilter}
                  onChange={(e) => setHistoryModeFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs text-white appearance-none focus:outline-none focus:border-amber-400/50 transition-all"
                >
                  <option value="all">Todos los Modos</option>
                  <option value="generate">Generación</option>
                  <option value="edit">Edición</option>
                  <option value="upscale">Upscale</option>
                  <option value="style-transfer">Style Transfer</option>
                  <option value="asset">Asset Mode</option>
                </select>
              </div>

              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" size={16} />
                <select 
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs text-white appearance-none focus:outline-none focus:border-amber-400/50 transition-all"
                >
                  <option value="all">Cualquier Fecha</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última Semana</option>
                  <option value="month">Último Mes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 py-20">
                <History size={48} strokeWidth={1} />
                <p className="text-xs uppercase tracking-[0.3em] font-bold">
                  {history.length === 0 ? "No hay registros aún" : "No se encontraron resultados"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredHistory.map((item) => {
                  const isActive = item.image === resultImage;
                  return (
                    <div key={item.id} className={`bg-white/5 border rounded-3xl overflow-hidden flex flex-row group hover:border-white/20 transition-all h-40 relative ${isActive ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20' : 'border-white/5'}`}>
                      {isActive && (
                        <div className="absolute top-0 right-0 z-10">
                          <div className="bg-amber-500 text-black text-[7px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
                            Activo
                          </div>
                        </div>
                      )}
                      <div className="w-40 shrink-0 relative overflow-hidden bg-black/40 border-r border-white/5">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">{item.mode}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setResultImage(item.image);
                          setShowHistory(false);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="px-4 py-2 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[9px] transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          Cargar Asset
                        </div>
                      </button>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Prompt Neural</p>
                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed italic">"{item.prompt}"</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex gap-6">
                          <div className="space-y-1">
                            <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">ID Registro</p>
                            <p className="text-[9px] font-mono text-zinc-400">{item.id}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Sincronización</p>
                            <p className="text-[9px] font-mono text-zinc-400">{new Date(item.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => window.open(item.image, '_blank')} className="p-2 bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <Maximize2 size={14} />
                          </button>
                          <button onClick={() => handleQuickUpscale(item.image)} className="p-2 bg-white/5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors">
                            <Zap size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  const VersionHistoryOverlay = () => {
    if (!showVersionHistory) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setShowVersionHistory(false)} />
        <div className="relative bg-zinc-950 border border-white/10 w-full max-w-2xl max-h-[70vh] rounded-[3rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Clock className="text-amber-400" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Línea de Tiempo Neural</h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Historial de estados y transformaciones locales</p>
              </div>
            </div>
            <button 
              onClick={() => setShowVersionHistory(false)}
              className="p-2 text-zinc-500 hover:text-white transition-colors hover:bg-white/5 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scroll">
            {undoStack.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-700 space-y-4">
                <Clock size={40} strokeWidth={1} className="opacity-20" />
                <p className="text-[10px] uppercase tracking-[0.4em] font-black opacity-40">Sin estados previos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...undoStack].reverse().map((state, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      applyState(state);
                      setShowVersionHistory(false);
                      addLog(`RESTORE: REVERTED TO "${state.label.toUpperCase()}"`);
                    }}
                    className="w-full group relative flex items-center gap-6 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {state.thumbnail && (
                      <div className="w-16 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40 group-hover:border-amber-500/30 transition-colors">
                        <img src={state.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                      <div className="w-px h-8 bg-zinc-800" />
                      <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-amber-400 transition-colors">
                          {state.label}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                          {new Date(state.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {state.activePreset && (
                          <span className="text-[7px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 font-black uppercase">
                            {state.activePreset.name}
                          </span>
                        )}
                        {state.lutName && (
                          <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-black uppercase">
                            LUT: {state.lutName} ({Math.round(state.lutIntensity * 100)}%)
                          </span>
                        )}
                        {state.prompt && (
                          <span className="text-[7px] px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded border border-white/10 font-medium truncate max-w-[150px]">
                            {state.prompt.substring(0, 40)}...
                          </span>
                        )}
                        <span className="text-[7px] px-1.5 py-0.5 bg-white/5 text-zinc-500 rounded border border-white/10 font-black uppercase">
                          {Object.keys(state.filters).length} Filters
                        </span>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <RotateCcw size={14} className="text-amber-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-white/5 border-t border-white/5 flex justify-center">
             <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">
               Capacidad máxima: 50 estados neurales en memoria volátil
             </p>
          </div>
        </div>
      </div>
    );
  };

  const TutorialOverlay = () => {
    if (!showTutorial) return null;
    const step = TUTORIAL_STEPS[tutorialStep];

    // Effect to highlight the target element
    useEffect(() => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('tutorial-highlight');
          return () => el.classList.remove('tutorial-highlight');
        }
      }
    }, [tutorialStep, step.targetId]);

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 max-w-lg w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <div 
              className="h-full bg-[var(--text-primary)] transition-all duration-500" 
              style={{ width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
          
          <button 
            onClick={() => setShowTutorial(false)}
            className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                {step.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Tutorial {tutorialStep + 1}/{TUTORIAL_STEPS.length}</span>
                <h3 className="text-2xl font-black tracking-tighter text-white">{step.title}</h3>
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
              {step.description}
            </p>

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowTutorial(false); setTutorialStep(0); }}
                  className="px-4 py-3 text-zinc-600 hover:text-zinc-400 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Skip
                </button>
                <button 
                  onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                  disabled={tutorialStep === 0}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tutorialStep === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                >
                  Previous
                </button>
              </div>
              
              {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                <button 
                  onClick={() => setTutorialStep(prev => prev + 1)}
                  className="px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={() => { setShowTutorial(false); setTutorialStep(0); }}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const checkKeyStatus = async () => {
    try {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (err) { setHasKey(false); }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    stopCamera();
    setResultImage(null);
    if (newMode !== 'style-transfer') setStyleImage(null);
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      setMaskPreview(null);
    }
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onStyleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setStyleImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; setShowCamera(true); }
    } catch (err) { setError({ message: "No se pudo acceder a la cámara.", type: 'critical' }); }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
        ctx.drawImage(videoRef.current, 0, 0);
        setSourceImage(canvas.toDataURL("image/png"));
        stopCamera();
      }
    }
  };

  const handleStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    handleDraw(e);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    } else {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleStopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory("Máscara de Edición");
      if (maskCanvasRef.current) {
        setMaskPreview(maskCanvasRef.current.toDataURL());
      }
    }
  };

  const parseCubeLUT = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      let size = 0;
      const currentData: number[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const upperLine = trimmed.toUpperCase();
        if (upperLine.startsWith('LUT_3D_SIZE')) {
          size = parseInt(trimmed.split(/\s+/)[1]);
          continue;
        }

        if (upperLine.startsWith('TITLE')) {
          const match = trimmed.match(/"([^"]+)"/);
          if (match) setLutName(match[1]);
          continue;
        }

        // Skip other keywords like DOMAIN_MIN/MAX
        if (upperLine.match(/^[A-Z_]+/)) continue;

        const parts = trimmed.split(/\s+/).map(Number);
        if (parts.length >= 3 && !isNaN(parts[0])) {
          currentData.push(parts[0], parts[1], parts[2]);
        }
      }

      if (size > 0 && currentData.length >= size * size * size * 3) {
        setLutSize(size);
        const data: number[][][][] = [];
        
        // .cube format: B changes fastest, then G, then R
        let dataIdx = 0;
        for (let r = 0; r < size; r++) {
          data[r] = [];
          for (let g = 0; g < size; g++) {
            data[r][g] = [];
            for (let b = 0; b < size; b++) {
              data[r][g][b] = [
                currentData[dataIdx],
                currentData[dataIdx + 1],
                currentData[dataIdx + 2]
              ];
              dataIdx += 3;
            }
          }
        }
        setLutData(data);
        addLog(`LUT ENGINE: LOADED ${size}x${size}x${size} MATRIX`);
      } else {
        throw new Error("Invalid LUT dimensions or data");
      }
    } catch (error) {
      addLog("ERROR: FAILED TO PARSE .CUBE FILE");
      setError({ message: "El archivo .cube no es válido o está corrupto.", type: 'warning' });
    }
  };

  const generatePresetLUT = (type: 'teal-orange' | 'vintage' | 'bw' | 'cyberpunk') => {
    const size = 16;
    const data: number[][][][] = [];
    setLutSize(size);
    
    for (let r = 0; r < size; r++) {
      data[r] = [];
      for (let g = 0; g < size; g++) {
        data[r][g] = [];
        for (let b = 0; b < size; b++) {
          let rn = r / (size - 1);
          let gn = g / (size - 1);
          let bn = b / (size - 1);

          if (type === 'teal-orange') {
            // Teal & Orange: Push shadows to teal, highlights to orange
            const luma = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
            if (luma < 0.5) {
              // Shadows -> Teal (0, 0.5, 0.5)
              const factor = (0.5 - luma) * 0.5;
              rn = rn * (1 - factor);
              gn = gn * (1 - factor) + 0.5 * factor;
              bn = bn * (1 - factor) + 0.5 * factor;
            } else {
              // Highlights -> Orange (1, 0.5, 0)
              const factor = (luma - 0.5) * 0.5;
              rn = rn * (1 - factor) + 1 * factor;
              gn = gn * (1 - factor) + 0.5 * factor;
              bn = bn * (1 - factor);
            }
          } else if (type === 'vintage') {
            // Vintage: Faded blacks, warm tint
            rn = rn * 0.9 + 0.1;
            gn = gn * 0.85 + 0.05;
            bn = bn * 0.7 + 0.05;
          } else if (type === 'bw') {
            // B&W High Contrast
            const luma = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
            const contrast = 1.5;
            const val = Math.max(0, Math.min(1, (luma - 0.5) * contrast + 0.5));
            rn = gn = bn = val;
          } else if (type === 'cyberpunk') {
            // Cyberpunk: Pink/Cyan split
            if (rn > 0.5) {
              rn = Math.min(1, rn * 1.2);
              bn = Math.min(1, bn * 1.2);
              gn = gn * 0.5;
            } else {
              bn = Math.min(1, bn * 1.5);
              gn = Math.min(1, gn * 1.2);
              rn = rn * 0.3;
            }
          }

          data[r][g][b] = [rn, gn, bn];
        }
      }
    }
    
    setLutData(data);
    setLutName(type.toUpperCase().replace('-', ' '));
    addLog(`LUT ENGINE: GENERATED ${type.toUpperCase()} PRESET`);
  };

  const onLUTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCubeLUT(text);
      if (!lutName) setLutName(file.name);
    };
    reader.readAsText(file);
  };

  const applyLUTToImage = async (imageSrc: string) => {
    if (!lutData || !lutSize) return imageSrc;
    
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageSrc);
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const intensity = lutIntensity;
        if (intensity === 0) return resolve(imageSrc);
        const sizeMinusOne = lutSize - 1;
        const sizeMinusTwo = lutSize - 2;
        
        for (let i = 0; i < data.length; i += 4) {
          const rOrig = data[i] / 255;
          const gOrig = data[i+1] / 255;
          const bOrig = data[i+2] / 255;
          
          const rPos = rOrig * sizeMinusOne;
          const gPos = gOrig * sizeMinusOne;
          const bPos = bOrig * sizeMinusOne;

          const rIdx = Math.min(Math.floor(rPos), sizeMinusTwo);
          const gIdx = Math.min(Math.floor(gPos), sizeMinusTwo);
          const bIdx = Math.min(Math.floor(bPos), sizeMinusTwo);
          
          const rFrac = rPos - rIdx;
          const gFrac = gPos - gIdx;
          const bFrac = bPos - bIdx;

          const invR = 1 - rFrac;
          const invG = 1 - gFrac;
          const invB = 1 - bFrac;

          const w000 = invR * invG * invB;
          const w100 = rFrac * invG * invB;
          const w010 = invR * gFrac * invB;
          const w001 = invR * invG * bFrac;
          const w110 = rFrac * gFrac * invB;
          const w101 = rFrac * invG * bFrac;
          const w011 = invR * gFrac * bFrac;
          const w111 = rFrac * gFrac * bFrac;
          
          const c000 = lutData[rIdx][gIdx][bIdx];
          const c100 = lutData[rIdx+1][gIdx][bIdx];
          const c010 = lutData[rIdx][gIdx+1][bIdx];
          const c001 = lutData[rIdx][gIdx][bIdx+1];
          const c110 = lutData[rIdx+1][gIdx+1][bIdx];
          const c101 = lutData[rIdx+1][gIdx][bIdx+1];
          const c011 = lutData[rIdx][gIdx+1][bIdx+1];
          const c111 = lutData[rIdx+1][gIdx+1][bIdx+1];

          const resR = c000[0] * w000 + c100[0] * w100 + c010[0] * w010 + c001[0] * w001 + 
                       c110[0] * w110 + c101[0] * w101 + c011[0] * w011 + c111[0] * w111;
          const resG = c000[1] * w000 + c100[1] * w100 + c010[1] * w010 + c001[1] * w001 + 
                       c110[1] * w110 + c101[1] * w101 + c011[1] * w011 + c111[1] * w111;
          const resB = c000[2] * w000 + c100[2] * w100 + c010[2] * w010 + c001[2] * w001 + 
                       c110[2] * w110 + c101[2] * w101 + c011[2] * w011 + c111[2] * w111;

          data[i] = Math.round((rOrig * (1 - intensity) + resR * intensity) * 255);
          data[i+1] = Math.round((gOrig * (1 - intensity) + resG * intensity) * 255);
          data[i+2] = Math.round((bOrig * (1 - intensity) + resB * intensity) * 255);
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageSrc);
    });
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setMaskPreview(null);
  };

  const getBinaryMaskBase64 = (): string => {
    if (!maskCanvasRef.current) return "";
    const canvas = document.createElement('canvas');
    canvas.width = maskCanvasRef.current.width;
    canvas.height = maskCanvasRef.current.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(maskCanvasRef.current, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 0) {
        imgData.data[i] = 255; imgData.data[i+1] = 255; imgData.data[i+2] = 255; imgData.data[i+3] = 255;
      } else {
        imgData.data[i] = 0; imgData.data[i+1] = 0; imgData.data[i+2] = 0; imgData.data[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const resetFilters = () => {
    saveToHistory("Reset de Filtros");
    setFilters({ brightness: 100, contrast: 100, saturation: 100 });
    setGrading({
      hue: 0,
      shadowsR: 0, shadowsG: 0, shadowsB: 0,
      midtonesR: 0, midtonesG: 0, midtonesB: 0,
      highlightsR: 0, highlightsG: 0, highlightsB: 0,
      blacks: 0, shadows: 0, midtones: 0, highlights: 0, whites: 0
    });
    setLutData(null);
    setLutName("");
    setGradedImage(null);
  };
  const resetZoom = () => setZoomLevel(1);

  const visualFilterStyle = useMemo(() => ({
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${grading.hue}deg) url(#advanced-grading)`,
    transition: 'filter 0.3s ease'
  }), [filters, grading]);

  const sourceImageStyle = useMemo(() => ({
    ...visualFilterStyle,
    transform: `translate(${sourceOffset.x}px, ${sourceOffset.y}px) rotate(${rotation + straighten}deg) scale(${sourceZoom})`,
    transition: 'transform 0.3s ease, filter 0.3s ease'
  }), [visualFilterStyle, rotation, straighten, sourceZoom, sourceOffset]);

  const resultDisplayStyle = useMemo(() => ({
    ...visualFilterStyle,
    transform: `scale(${zoomLevel})`,
    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1), filter 0.3s ease'
  }), [visualFilterStyle, zoomLevel]);

  const baseDisplayStyle = useMemo(() => ({
    transform: `scale(${zoomLevel})`,
    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)'
  }), [zoomLevel]);

  const syntheticInstructions = useMemo(() => {
    const mutationKeywords = mutation > 0.5 ? ", surreal glitches, avant-garde distortion" : "";
    
    // Depth-aware modifiers (User suggested: flat + gritty = saturation/clutter, deep + gritty = cine)
    let depthModifiers = "";
    if (sceneDepth < 0.4) {
      depthModifiers = ", minimal grain, smooth gradients, clean surface focus, macro proximity";
    } else {
      depthModifiers = ", atmospheric depth, cinematic haze, distant perspective, voluminous lighting";
    }

    const dnaMod = `, ${mapLambda(syntergicParams.lambda)}, ${mapProtocol(syntergicParams.protocol)}, ${mapEntropy(syntergicParams.entropy)}`;

    return `[Engine: Lux=${luxury}, Real=${realism}, Mut=${mutation}, Depth=${sceneDepth}, Λ=${syntergicParams.lambda}, Π=${syntergicParams.protocol}, Δν=${syntergicParams.entropy}${mutationKeywords}${depthModifiers}${dnaMod}, Seed=${seed}]`;
  }, [luxury, realism, mutation, sceneDepth, seed, syntergicParams, mapLambda, mapProtocol, mapEntropy]);

  const handleOpenKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
    setError(null);
  };

  const startProgressSimulation = (stages: string[], maxProgress: number = 95, persistLogs: boolean = false) => {
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    setProgress(0);
    if (!persistLogs) setStatusLog([]);
    let currentStageIndex = 0;
    setLoadingStage(stages[0]);
    addLog(`INITIALIZING: ${stages[0]}`);

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        const next = prev + (Math.random() * 2.5);
        const stageProgressThreshold = maxProgress / stages.length;
        const newIndex = Math.floor(next / stageProgressThreshold);
        
        if (newIndex !== currentStageIndex && newIndex < stages.length) {
          currentStageIndex = newIndex;
          const nextStage = stages[newIndex];
          setLoadingStage(nextStage);
          addLog(`EXECUTING: ${nextStage}`);
          
          if (Math.random() > 0.5) {
            const techLogs = [
              "Optimizing latent space tensors...",
              "Harmonizing chromatic aberration nodes...",
              "Refining subsurface scattering parameters...",
              "Consolidating micro-texture fidelity...",
              "Applying G-Buffer optical correction...",
              "Calibrating global illumination vectors..."
            ];
            addLog(techLogs[Math.floor(Math.random() * techLogs.length)]);
          }
        }
        return next >= maxProgress ? maxProgress : next;
      });
    }, 120);
  };

  const addLog = (msg: string) => {
    setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${msg.toUpperCase()}`]);
  };

  const stopProgressSimulation = (finalStage: string = "Síntesis Completa") => {
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    setLoadingStage(finalStage);
    addLog(`SUCCESS: ${finalStage}`);
    setProgress(100);
  };

  const handleQuickUpscale = async (img: string, factor: "2x" | "4x" | "8x" = "4x") => {
    if (!img || loading) return;
    setSourceImage(img);
    setMode('upscale');
    setUpscaleFactor(factor);
    setLoading(true);
    setError(null);
    resetZoom();
    
    try {
      startProgressSimulation([
        "Analyzing Pixel Density",
        "Synthesizing Micro-Details",
        "Reconstructing Textures",
        "Enhancing Sharpness",
        "Finalizing High-Res Asset"
      ]);
      const res = await gemini.upscaleImage(img, factor, aspectRatio);
      setResultImage(res);
      addToHistory({ 
        mode: "upscale", 
        prompt: `Quick Upscale ${factor}`, 
        params: { upscaleFactor: factor, aspectRatio }, 
        image: res 
      });
      setGradedImage(null);
      if (ethicalProtocol) {
        setProvenanceData({
          id: `SYN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          mode: 'upscale',
          prompt: `Neural Upscaling ${factor}`,
          model: 'Gemini 3 Pro Image',
          hash: Math.random().toString(36).substr(2, 16)
        });
      }
      stopProgressSimulation("Upscale Neural Completado");
    } catch (err: any) {
      addLog(`UPSCALING ERROR: ${err?.message || "Error motor neural."}`);
      setError({ message: err?.message || "Error motor neural.", type: 'critical' });
    } finally {
      setTimeout(() => { setLoading(false); setLoadingStage(""); setProgress(0); }, 1200);
    }
  };

  const handleSurrealVariation = async () => {
    const target = gradedImage || resultImage || sourceImage;
    if (!target || loading) return;
    
    const surrealPreset = IMAGE_PRESETS.find(p => p.id === "exo-02");
    if (!surrealPreset) return;

    setSourceImage(target);
    setMode('edit');
    setActivePreset(surrealPreset);
    setPrompt("Transform this into a surreal and dreamlike masterpiece with impossible architecture and floating elements.");
    addLog("PROTOCOL: INITIATING SURREAL REFINEMENT VARIATION");
    
    setTimeout(() => {
      const btn = document.getElementById('action-button');
      if (btn) btn.click();
    }, 100);
  };

  const processImage = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Determine if we need to swap dimensions for 90/270 degree rotations
        const is90or270 = Math.abs(rotation % 180) === 90;
        canvas.width = is90or270 ? img.height : img.width;
        canvas.height = is90or270 ? img.width : img.height;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply offset
        ctx.translate(sourceOffset.x, sourceOffset.y);
        
        // Apply rotation
        const angle = (rotation + straighten) * (Math.PI / 180);
        ctx.rotate(angle);
        
        // Apply zoom
        ctx.scale(sourceZoom, sourceZoom);
        
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const handleExecution = async () => {
    // Input Validation
    if ((mode === "generate" || mode === "evolution" || mode === "mockup" || mode === "asset" || mode === "concept" || mode === "dataset" || mode === "worldbuilding" || mode === "texture") && !prompt.trim()) {
      return setError({message: "Por favor ingresa instrucciones detalladas.", type: 'critical'});
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return setError({message: `El prompt excede el límite neural de ${MAX_PROMPT_LENGTH} caracteres.`, type: 'critical'});
    }
    if ((mode === "edit" || mode === "inpaint" || mode === "style-transfer") && (!sourceImage || !prompt.trim())) {
      return setError({message: "Imagen y prompt requeridos para esta operación.", type: 'critical'});
    }
    if (mode === "upscale" && (!sourceImage && !resultImage)) {
      return setError({message: "Se requiere una imagen base para realizar el Upscale.", type: 'critical'});
    }
    if (mode === "style-transfer" && !styleImage) {
      return setError({message: "Imagen de estilo requerida para transferencia.", type: 'critical'});
    }
    if (mode === "vision" && !sourceImage) {
      return setError({message: "Imagen requerida para el análisis óptico.", type: 'critical'});
    }
    if (watermarkText.length > MAX_WATERMARK_LENGTH) {
      return setError({message: `La marca de agua excede el límite de ${MAX_WATERMARK_LENGTH} caracteres.`, type: 'critical'});
    }
    if (isNaN(seed) || seed < 0) {
      return setError({message: "El Seed debe ser un valor numérico positivo.", type: 'critical'});
    }

    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setWorldbuildResults(null);
    setMultiResults(null);
    resetZoom();
    saveToHistory(`Pre-Execution: ${mode.toUpperCase()}`);

    const currentParams = {
      luxury, realism, mutation, seed, highQuality, useSearch,
      activePreset: activePreset?.name,
      syntergicParams, styleIntensity, upscaleFactor, variationCount,
      assetType, assetBackground, aspectRatio
    };

    try {
      let processedSource = sourceImage;
      if (sourceImage && (rotation !== 0 || straighten !== 0)) {
        setLoadingStage("Processing Asset Geometry...");
        processedSource = await processImage(sourceImage);
      }

      if (mode === "generate") {
        startProgressSimulation([
          "Calibrating Neural Pulse",
          "Encoding Aesthetic ADN",
          "Synthesizing Latent Space",
          "Enhancing Micro-Textures",
          "Consolidating Pixels"
        ]);
        
        if (variationCount > 1) {
          const promises = Array.from({ length: variationCount }).map(() => 
            gemini.generateImage(`${prompt} ${syntheticInstructions}`, activePreset?.prompt, highQuality, useSearch, aspectRatio, negativePrompt)
          );
          const results = await Promise.all(promises);
          setMultiResults(results);
          setResultImage(results[0]);
          results.forEach(res => addToHistory({ mode, prompt, params: currentParams, image: res }));
          saveToHistory(`Generación: ${prompt.substring(0, 20)}...`);
        } else {
          const res = await gemini.generateImage(`${prompt} ${syntheticInstructions}`, activePreset?.prompt, highQuality, useSearch, aspectRatio, negativePrompt);
          setResultImage(res);
          addToHistory({ mode, prompt, params: currentParams, image: res });
          saveToHistory(`Generación: ${prompt.substring(0, 20)}...`);
        }
        
        setGradedImage(null);
        if (ethicalProtocol) {
          setProvenanceData({
            id: `GEN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            timestamp: new Date().toISOString(),
            mode: 'generate',
            prompt: prompt,
            model: highQuality ? 'Gemini 3 Pro Image' : 'Gemini 2.5 Flash Image',
            hash: Math.random().toString(36).substr(2, 16)
          });
        }
      } else if (mode === "mockup" || mode === "asset" || mode === "concept" || mode === "dataset") {
        startProgressSimulation([
          "Initializing Syntergic Core",
          "Λ-Coherence Intent Parsing",
          "Π-Protocol Calibration",
          "Δν-Entropy Injection",
          "Synthesizing Final Asset"
        ]);
        
        let finalPrompt = prompt;
        if (mode === "asset") {
          const bgInstruction = assetBackground === "isolated" ? "on a clean, solid white isolated background" : 
                               assetBackground === "gradient" ? "on a smooth, professional gradient background" : 
                               "in a realistic, context-aware scene";
          finalPrompt = `A professional high-fidelity ${assetType} of ${prompt}, ${bgInstruction}. 
            Clean lines, modern aesthetic, high-end UI design, studio lighting, 8k resolution.`;
        }

        const results = await gemini.syntergicGenerate(finalPrompt, mode, syntergicParams, highQuality, variationCount, aspectRatio, negativePrompt);
        if (results.length > 1) {
          setMultiResults(results);
          setResultImage(results[0]);
          results.forEach(img => addToHistory({ mode, prompt: finalPrompt, params: currentParams, image: img }));
          saveToHistory(`Asset: ${prompt.substring(0, 20)}...`);
        } else {
          setResultImage(results[0]);
          addToHistory({ mode, prompt: finalPrompt, params: currentParams, image: results[0] });
          saveToHistory(`Asset: ${prompt.substring(0, 20)}...`);
        }
        setGradedImage(null);
      } else if (mode === "worldbuilding") {
        startProgressSimulation([
          "Initializing Universe Engine",
          "Defining Architectural Axioms",
          "Synthesizing Environmental Assets",
          "Generating Vehicle Schematics",
          "Simulating Character DNA",
          "Finalizing World Coherence"
        ]);
        const results = await gemini.worldbuild(prompt, syntergicParams);
        setWorldbuildResults(results);
        setResultImage(results[0].image);
        results.forEach(res => addToHistory({ mode: `worldbuilding-${res.category}`, prompt: `${prompt} (${res.category})`, params: currentParams, image: res.image }));
        saveToHistory(`Worldbuild: ${prompt.substring(0, 20)}...`);
      } else if (mode === "texture") {
        startProgressSimulation([
          "Analyzing Material DNA",
          "Synthesizing Surface Micro-Detail",
          "Calculating Tiling Vectors",
          "Generating PBR Map Channels",
          "Finalizing Texture Asset"
        ]);
        
        const detailLevel = surfaceDetail > 0.8 ? "hyper-detailed microscopic resolution" : 
                            surfaceDetail > 0.5 ? "ultra-high fidelity detail" :
                            surfaceDetail > 0.2 ? "standard surface detail" : "smooth polished finish";

        const texturePrompt = `A high-resolution professional PBR texture of ${prompt}. 
          Material Type: ${materialType}. 
          Surface Detail Complexity: ${detailLevel} (${surfaceDetail * 100}% density). 
          ${isTiling ? "Seamless tiling, perfectly repeatable pattern." : "Unique non-tiling surface."} 
          Macro photography, flat lighting, neutral exposure, 8k resolution, physically accurate shaders.`;
        
        const res = await gemini.generateImage(texturePrompt, "Material", highQuality, useSearch, aspectRatio);
        setResultImage(res);
        addToHistory({ mode, prompt: texturePrompt, params: { ...currentParams, materialType, surfaceDetail, isTiling }, image: res });
        saveToHistory(`Texture: ${prompt.substring(0, 20)}...`);
        setGradedImage(null);
      } else if (mode === "edit") {
        startProgressSimulation([
          "Mapping Structural Geometry",
          "Injecting Neural Signature",
          "Rerendering Optics",
          "Harmonizing Contrast",
          "Finalizing Asset"
        ]);
        const res = await gemini.editImage(processedSource!, `${prompt} ${syntheticInstructions}`, activePreset?.prompt, highQuality, aspectRatio, negativePrompt);
        setResultImage(res);
        addToHistory({ mode, prompt, params: currentParams, image: res });
        saveToHistory(`Edit: ${prompt.substring(0, 20)}...`);
        setGradedImage(null);
      } else if (mode === "inpaint") {
        startProgressSimulation([
          "Detecting Mask Coordinates",
          "Analyzing Semantic Context",
          "Neural Filling Region",
          "Blending Edge Fidelity",
          "Asset Reconstruction"
        ]);
        const mask = getBinaryMaskBase64();
        const res = await gemini.inpaintImage(processedSource!, mask, `${prompt} ${syntheticInstructions}`, activePreset?.prompt, negativePrompt);
        setResultImage(res);
        addToHistory({ mode, prompt, params: currentParams, image: res });
        saveToHistory(`Inpaint: ${prompt.substring(0, 20)}...`);
        setGradedImage(null);
      } else if (mode === "vision") {
        startProgressSimulation([
          "Scanning Optical Data",
          "Desegregating Patterns",
          "Neural Decoding",
          "Extracting Metadata",
          "Finalizing Report"
        ]);
        const res = await gemini.analyzeImage(processedSource!);
        setAnalysisData(res);
        setShowAnalysis(true);
      } else if (mode === "evolution") {
        let currentIterPrompt = prompt;
        addLog("PROTOCOL: EVOLUTION MODE INITIATED");
        stopEvolutionRef.current = false;
        
        for (let i = 1; i <= evolutionCycles; i++) {
          if (stopEvolutionRef.current) {
            addLog("EVOLUTION PROTOCOL ABORTED BY OPERATOR");
            break;
          }

          startProgressSimulation([
            `Cycle ${i}/${evolutionCycles}: Base Generation`,
            `Cycle ${i}/${evolutionCycles}: Neural Critique`,
            `Cycle ${i}/${evolutionCycles}: Refinement`,
            `Cycle ${i}/${evolutionCycles}: Optimization`
          ], 90, i > 1);

          const res = await gemini.generateImage(`${currentIterPrompt} ${syntheticInstructions}`, activePreset?.prompt, highQuality, false, "1:1", negativePrompt);
          setResultImage(res);
          addToHistory({ mode: `evolution-cycle-${i}`, prompt: currentIterPrompt, params: currentParams, image: res });
          setGradedImage(null);
          
          if (i < evolutionCycles) {
            setLoadingStage(`Cycle ${i}: Crítica Neural...`);
            addLog(`CYCLE ${i} COMPLETE. ANALYZING FOR IMPROVEMENTS...`);
            const refinedPrompt = await gemini.analyzeForRefinement(res, currentIterPrompt);
            addLog(`NEURAL CRITIQUE: ${refinedPrompt.substring(0, 100)}...`);
            saveToHistory(`Evolution Cycle ${i} Refinement`);
            currentIterPrompt = refinedPrompt;
            setPrompt(refinedPrompt);
          }
        }
      } else if (mode === "color-grading") {
        startProgressSimulation([
          "Analyzing Chromatic Balance",
          "Optimizing Neural Curves",
          "Harmonizing HSL Vectors",
          "Refining Color Fidelity",
          "Finalizing Grade"
        ]);
        const target = resultImage || processedSource;
        const suggestions = await gemini.suggestColorGrading(target!);
        
        setFilters(prev => ({
          ...prev,
          brightness: 100 + (suggestions.brightness || 0),
          contrast: 100 + (suggestions.contrast || 0),
          saturation: 100 + (suggestions.saturation || 0)
        }));
        
        setGrading({
          hue: suggestions.hue || 0,
          shadowsR: suggestions.shadowsR || 0,
          shadowsG: suggestions.shadowsG || 0,
          shadowsB: suggestions.shadowsB || 0,
          midtonesR: suggestions.midtonesR || 0,
          midtonesG: suggestions.midtonesG || 0,
          midtonesB: suggestions.midtonesB || 0,
          highlightsR: suggestions.highlightsR || 0,
          highlightsG: suggestions.highlightsG || 0,
          highlightsB: suggestions.highlightsB || 0,
          blacks: suggestions.blacks || 0,
          shadows: suggestions.shadows || 0,
          midtones: suggestions.midtones || 0,
          highlights: suggestions.highlights || 0,
          whites: suggestions.whites || 0
        });
        stopProgressSimulation("Etalonaje Neural Completado");
      } else if (mode === "style-transfer") {
        startProgressSimulation([
          "Analyzing Content Structure",
          "Extracting Style DNA",
          "Neural Style Synthesis",
          "Harmonizing Aesthetics",
          "Finalizing Transfer"
        ]);
        const res = await gemini.styleTransfer(processedSource!, styleImage!, `${prompt} ${syntheticInstructions}`, Math.round(styleIntensity * 100), negativePrompt);
        setResultImage(res);
        addToHistory({ mode, prompt, params: currentParams, image: res });
        saveToHistory(`Style: ${prompt.substring(0, 20)}...`);
        setGradedImage(null);
        stopProgressSimulation("Transferencia de Estilo Completada");
      } else if (mode === "upscale") {
        startProgressSimulation([
          "Analyzing Pixel Density",
          "Synthesizing Micro-Details",
          "Reconstructing Textures",
          "Enhancing Sharpness",
          "Finalizing High-Res Asset"
        ]);
        const target = resultImage || processedSource;
        const res = await gemini.upscaleImage(target!, upscaleFactor, aspectRatio);
        setResultImage(res);
        addToHistory({ mode: `upscale-${upscaleFactor}`, prompt: "AI Upscale", params: currentParams, image: res });
        saveToHistory(`Upscale: ${upscaleFactor}`);
        setGradedImage(null);
        stopProgressSimulation("Upscale Neural Completado");
      }
      stopProgressSimulation();
    } catch (err: any) {
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      const errorStr = (err?.message || JSON.stringify(err)).toLowerCase();
      addLog(`FATAL ERROR: ${errorStr}`);
      if (errorStr.includes("requested entity was not found") || errorStr.includes("key_not_found")) {
        setHasKey(false);
        handleOpenKey();
        return;
      }
      if (errorStr.includes("429")) setError({ message: "Límite excedido. Usa modo estándar.", type: 'quota' });
      else if (errorStr.includes("pro_permission")) setError({ message: "Gemini 3 Pro requiere Billing activo.", type: 'permission' });
      else setError({ message: err?.message || "Error motor neural.", type: 'critical' });
    } finally {
      setTimeout(() => { setLoading(false); setLoadingStage(""); setProgress(0); }, 1200);
    }
  };

  const neuralAutoBalance = async () => {
    if (!resultImage && !sourceImage) return;
    const targetImage = resultImage || sourceImage;
    setLoading(true);
    setLoadingStage("Neural Analysis...");
    try {
      if (mode === "color-grading") {
        addLog("NEURAL COLOR GRADING: ANALYZING CHROMATIC VECTORS");
        const suggestions = await gemini.suggestColorGrading(targetImage!);
        
        // Map suggestions to state
        setFilters(prev => ({
          ...prev,
          brightness: 100 + (suggestions.brightness || 0),
          contrast: 100 + (suggestions.contrast || 0),
          saturation: 100 + (suggestions.saturation || 0)
        }));
        
        setGrading({
          hue: suggestions.hue || 0,
          shadowsR: suggestions.shadowsR || 0,
          shadowsG: suggestions.shadowsG || 0,
          shadowsB: suggestions.shadowsB || 0,
          midtonesR: suggestions.midtonesR || 0,
          midtonesG: suggestions.midtonesG || 0,
          midtonesB: suggestions.midtonesB || 0,
          highlightsR: suggestions.highlightsR || 0,
          highlightsG: suggestions.highlightsG || 0,
          highlightsB: suggestions.highlightsB || 0,
          blacks: suggestions.blacks || 0,
          shadows: suggestions.shadows || 0,
          midtones: suggestions.midtones || 0,
          highlights: suggestions.highlights || 0,
          whites: suggestions.whites || 0
        });
        
        addLog("NEURAL COLOR GRADING: PARAMETERS SYNCHRONIZED");
      } else {
        addLog("NEURAL AUTO-BALANCE: ANALYZING COLOR VECTORS");
        const analysis = await gemini.analyzeImage(targetImage!);
        saveToHistory("Transformación");
        const b = 90 + Math.random() * 20;
        const c = 100 + Math.random() * 25;
        const s = 110 + Math.random() * 20;
        setFilters({ brightness: Math.round(b), contrast: Math.round(c), saturation: Math.round(s) });
        addLog(`AUTO-BALANCE COMPLETE: B:${Math.round(b)}% C:${Math.round(c)}% S:${Math.round(s)}%`);
      }
    } catch (err) {
      addLog("NEURAL ANALYSIS: FAILED");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const downloadImage = (url: string, filename: string = `ia-studio-${Date.now()}.png`) => {
    if (!url) return;
    addLog(`DOWNLOAD: INITIATING TRANSFER [${filename}]`);
    
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        window.location.href = url;
      }
      addLog("DOWNLOAD: OPENED IN NEW TAB - LONG PRESS TO SAVE");
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addLog("DOWNLOAD: ASSET TRANSFERRED SUCCESSFULLY");
    }
  };

  const copyImageToClipboard = async () => {
    const target = gradedImage || resultImage || sourceImage;
    if (!target) return;
    
    addLog("CLIPBOARD: PREPARING BUFFER...");
    try {
      // Create a hidden canvas to apply filters first
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = target;
      });

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${grading.hue}deg) url(#advanced-grading)`;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error("Blob creation failed");
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          addLog("CLIPBOARD: ASSET COPIED SUCCESSFULLY (PNG)");
        }, 'image/png');
      }
    } catch (err) {
      console.error(err);
      addLog("CLIPBOARD: OPERATION FAILED - BROWSER RESTRICTION");
    }
  };

  const downloadBakedAsset = async () => {
    const target = gradedImage || resultImage || sourceImage;
    if (!target) return;

    addLog("DOWNLOAD: INITIATING ULTRA-HIGH FIDELITY BAKE");

    const canvas = document.createElement('canvas');
    const img = new Image();
    
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${grading.hue}deg) url(#advanced-grading)`;
          ctx.drawImage(img, 0, 0);
          
          if (ethicalProtocol && provenanceData) {
            ctx.filter = 'none';
            ctx.font = `${Math.max(12, canvas.width / 60)}px monospace`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'right';
            ctx.fillText(`AI GENERATED | ${provenanceData.id} | ${provenanceData.model}`, canvas.width - 20, canvas.height - 20);
            
            ctx.globalAlpha = 0.05;
            ctx.fillStyle = '#fff';
            for (let i = 0; i < canvas.width; i += 100) {
              for (let j = 0; j < canvas.height; j += 100) {
                ctx.fillText('AI', i, j);
              }
            }
            ctx.globalAlpha = 1.0;
          }

          const mimeType = exportSettings.format === 'jpg' ? 'image/jpeg' : 
                          exportSettings.format === 'webp' ? 'image/webp' : 
                          'image/png';
          
          const quality = exportSettings.quality / 100;
          const ext = exportSettings.format === 'jpg' ? 'jpg' : 
                      exportSettings.format === 'webp' ? 'webp' : 
                      'png';

          canvas.toBlob((blob) => {
            if (!blob) {
              addLog("DOWNLOAD: BAKE FAILED - BLOB ERROR");
              return;
            }
            const url = URL.createObjectURL(blob);
            
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
              // Mobile: Open in new tab for long-press save
              const newWindow = window.open(url, '_blank');
              if (!newWindow) {
                window.location.href = url;
              }
              addLog("DOWNLOAD: OPENED IN NEW TAB - LONG PRESS TO SAVE");
            } else {
              const link = document.createElement('a');
              link.href = url;
              link.download = `ia-studio-${Date.now()}.${ext}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              addLog(`DOWNLOAD: ASSET BAKED SUCCESSFULLY [.${ext.toUpperCase()}]`);
            }
            
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }, mimeType, quality);
        }
      } catch (e) {
        console.error("Canvas bake failed, falling back to direct download", e);
        window.open(target, '_blank');
      }
    };

    img.onerror = () => {
      console.error("Failed to load image for downloading");
      window.open(target, '_blank');
    };

    img.src = target;
  };

  if (hasKey === null) return <div className="min-h-screen bg-black flex items-center justify-center"><Activity className="text-white animate-pulse" size={48} /></div>;

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="bg-zinc-900/50 p-12 rounded-[3rem] border border-white/10 space-y-8 max-w-md backdrop-blur-3xl animate-in zoom-in-95 duration-500">
          <Key size={56} className="text-amber-400 mx-auto" />
          <h1 className="text-4xl font-black uppercase tracking-tighter">ACCESO REQUERIDO</h1>
          <p className="text-zinc-400 text-xs uppercase tracking-widest leading-relaxed">
            Para utilizar los modelos de IA Studio, selecciona una API Key vinculada a un proyecto de Google Cloud con facturación activa.
          </p>
          
          <div className="space-y-4">
            <Tooltip text="Inicia el diálogo para seleccionar o actualizar tu clave de API de Google">
              <button onClick={handleOpenKey} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-2xl active:scale-95">
                Seleccionar API Key
              </button>
            </Tooltip>
            
            <Tooltip text="Consultar los requisitos y niveles de facturación para el uso de modelos Pro">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-[10px] text-amber-400 uppercase tracking-widest font-bold hover:text-amber-300 transition-colors">
                <Info size={12}/> Documentación de Facturación
              </a>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center py-6 sm:py-10 px-4 sm:px-6 md:px-8 font-['Inter'] relative overflow-x-hidden transition-colors duration-300"
    >
      {/* Remote Cursors */}
      {Object.entries(cursors).map(([id, cursor]: [string, any]) => (
        <div 
          key={id}
          className="fixed pointer-events-none z-[1000] transition-all duration-75 ease-out"
          style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        >
          <MousePointer2 size={16} fill={cursor.color} color="white" />
          <div 
            className="ml-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white whitespace-nowrap shadow-xl"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}

      <TutorialOverlay />
      <HistoryOverlay />
      <VersionHistoryOverlay />
      <PromptGuideOverlay />
      
      {/* Presence Sidebar */}
      <AnimatePresence>
        {showPresence && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed left-0 top-0 bottom-0 w-full sm:left-6 sm:top-24 sm:bottom-24 sm:w-72 bg-[var(--bg-secondary)]/95 sm:bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border-r sm:border border-[var(--border-primary)] sm:rounded-3xl z-[100] shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Colaboradores</span>
              </div>
              <button onClick={() => setShowPresence(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black border border-white/10">YO</div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">Tú</span>
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    En línea • {mode.toUpperCase()}
                  </span>
                </div>
              </div>
              {remoteUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors rounded-2xl border border-transparent hover:border-white/5 group">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border border-white/10 shadow-lg"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                        {user.mode ? user.mode.toUpperCase() : 'CONECTADO'}
                      </span>
                      {user.isTyping && (
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                          <MessageSquare size={8} /> Escribiendo...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/5">
              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("room", roomId);
                  navigator.clipboard.writeText(url.toString());
                  addLog("COLLABORATION: INVITE LINK COPIED");
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={12} /> Copiar Link de Invitación
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Sidebar */}
      <AnimatePresence>
        {showCommentsSidebar && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:right-6 sm:top-24 sm:bottom-24 sm:w-80 bg-[var(--bg-secondary)]/95 sm:bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border-l sm:border border-[var(--border-primary)] sm:rounded-3xl z-[100] shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-amber-400" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Comentarios</span>
              </div>
              <button onClick={() => setShowCommentsSidebar(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                    No hay comentarios en este lienzo aún.
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: comment.userColor }}>
                          {comment.userName.charAt(0)}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">{comment.userName}</span>
                      </div>
                      <button 
                        onClick={() => deleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{comment.text}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">
                        {new Date(comment.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">
                        Pos: {Math.round(comment.x)}%, {Math.round(comment.y)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t border-white/5">
              <button 
                onClick={() => setIsCommentMode(!isCommentMode)}
                className={`w-full py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isCommentMode ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300'}`}
              >
                <MessageSquare size={14} /> {isCommentMode ? 'Modo Comentario Activo' : 'Añadir Comentario'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl w-full space-y-8">
        <header className="flex flex-col items-center space-y-4 mb-8">
          <div className="flex items-center gap-4">
            <Tooltip text="Motor de Síntesis Visual IA Studio v2.5/3.0">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full cursor-help hover:bg-white/10 transition-colors">
                <Crown size={14} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">IA Studio Core</span>
              </div>
            </Tooltip>
            <Tooltip text="Iniciar Tutorial de Usuario">
              <button 
                onClick={() => { setShowTutorial(true); setTutorialStep(0); }}
                className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              >
                <HelpCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Guía</span>
              </button>
            </Tooltip>
            <Tooltip text="Consejos para Prompts Efectivos">
              <button 
                onClick={() => setShowPromptGuide(true)}
                className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              >
                <Wand2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tips</span>
              </button>
            </Tooltip>
            <Tooltip text="Ver Historial de Generación">
              <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-all text-zinc-400 hover:text-white hover:scale-105 active:scale-95"
              >
                <History size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Historial</span>
              </button>
            </Tooltip>
            <Tooltip text={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
              <button 
                onClick={toggleTheme}
                className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            </Tooltip>

            {/* Collaborators List */}
            <div id="collaboration-presence" className="flex items-center gap-2 ml-4">
              <button 
                onClick={() => setShowPresence(!showPresence)}
                className="flex -space-x-2 overflow-hidden hover:scale-105 transition-transform"
              >
                {remoteUsers.map((user) => (
                  <Tooltip key={user.id} text={user.name}>
                    <div 
                      className="inline-block h-7 w-7 rounded-full ring-2 ring-black flex items-center justify-center text-[9px] font-black text-white uppercase border border-white/10"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0)}
                    </div>
                  </Tooltip>
                ))}
              </button>
              {remoteUsers.length > 0 && (
                <button 
                  onClick={() => setShowPresence(!showPresence)}
                  className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full ml-2 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{remoteUsers.length} ACTIVOS</span>
                </button>
              )}
            </div>

            <div id="undo-redo-controls" className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
              <Tooltip text="Deshacer (Ctrl+Z)">
                <button 
                  onClick={undo} 
                  disabled={undoStack.length === 0}
                  className={`p-1 transition-all ${undoStack.length === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:scale-110 active:scale-90'}`}
                >
                  <Undo2 size={14} />
                </button>
              </Tooltip>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <Tooltip text="Ver Línea de Tiempo de Versiones">
                <button 
                  onClick={() => setShowVersionHistory(true)}
                  disabled={undoStack.length === 0}
                  className={`p-1 transition-all ${undoStack.length === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:scale-110 active:scale-90'}`}
                >
                  <Clock size={14} />
                </button>
              </Tooltip>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <Tooltip text="Rehacer (Ctrl+Y / Ctrl+Shift+Z)">
                <button 
                  onClick={redo} 
                  disabled={redoStack.length === 0}
                  className={`p-1 transition-all ${redoStack.length === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:scale-110 active:scale-90'}`}
                >
                  <Redo2 size={14} />
                </button>
              </Tooltip>
            </div>

            {/* Collaboration Presence */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
              <Tooltip text="Ver Comentarios">
                <button 
                  onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
                  className={`p-1.5 rounded-lg transition-all ${showCommentsSidebar ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}`}
                >
                  <MessageSquare size={14} />
                </button>
              </Tooltip>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <Tooltip text="Invitar a Colaborar">
                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("room", roomId);
                    navigator.clipboard.writeText(url.toString());
                    addLog("COLLABORATION: INVITE LINK COPIED TO CLIPBOARD");
                  }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{remoteUsers.length + 1}</span>
                </button>
              </Tooltip>
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-700 select-none">MASTER CONTROL</h1>
        </header>

        <nav id="mode-selector" className="flex justify-center">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-xl">
              {[
                { 
                  group: "Creation", 
                  modes: [
                    { id: "generate", icon: <Sparkles size={14}/>, tip: "Creación Neural desde Instrucciones" },
                    { id: "concept", icon: <Palette size={14}/>, tip: "Arte Conceptual y World-building" },
                    { id: "worldbuilding", icon: <Monitor size={14}/>, tip: "Generación de Universos Visuales Coherentes" },
                    { id: "mockup", icon: <Box size={14}/>, tip: "Generación de Mockups Profesionales" },
                    { id: "asset", icon: <Layout size={14}/>, tip: "Creación de Assets y UI" },
                    { id: "texture", icon: <Spline size={14}/>, tip: "Generación de Texturas y Materiales Técnicos" }
                  ] 
                },
                { 
                  group: "Editing", 
                  modes: [
                    { id: "edit", icon: <Brush size={14}/>, tip: "Alteración Estructural de Imágenes" },
                    { id: "inpaint", icon: <Scan size={14}/>, tip: "Regeneración Localizada mediante Máscaras" },
                    { id: "color-grading", icon: <Contrast size={14}/>, tip: "Corrección de Color y Etalonaje Digital" },
                    { id: "style-transfer", icon: <Wand2 size={14}/>, tip: "Transferencia de Estilo Artístico Neural" },
                    { id: "upscale", icon: <Maximize size={14}/>, tip: "Aumento de Resolución y Detalle mediante IA" }
                  ]
                },
                { 
                  group: "Advanced", 
                  modes: [
                    { id: "vision", icon: <Eye size={14}/>, tip: "Descodificación y Análisis de Assets" },
                    { id: "evolution", icon: <Activity size={14}/>, tip: "Refinamiento Iterativo de ADN Visual" },
                    { id: "dataset", icon: <FileCode size={14}/>, tip: "Generación de Datasets Visuales" }
                  ]
                }
              ].map((group, gIdx) => (
                <div key={group.group} className="flex items-center gap-1.5 px-3 border-r last:border-r-0 border-white/5">
                  <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mr-2">{group.group}</span>
                  <div className="flex gap-1">
                    {group.modes.map((m) => (
                      <Tooltip key={m.id} text={m.tip}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleModeChange(m.id as Mode)}
                          className={`p-2.5 rounded-xl transition-all flex items-center gap-2 relative group-btn ${
                            mode === m.id 
                              ? "bg-white text-black shadow-xl" 
                              : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                          }`}
                        >
                          {m.icon}
                          <span className={`text-[8px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${mode === m.id ? 'max-w-xs ml-1' : 'max-w-0'}`}>
                            {m.id.replace('-', ' ')}
                          </span>
                          {mode === m.id && (
                            <motion.div 
                              layoutId="active-mode"
                              className="absolute inset-0 bg-white rounded-xl -z-10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </motion.button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 w-full max-w-7xl">
          <section className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Neural Engine Selector</span>
                <Tooltip text="Información sobre Modelos y Costos">
                  <button onClick={() => setShowModelInfo(!showModelInfo)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                    <Info size={14} className="text-zinc-500" />
                  </button>
                </Tooltip>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Tooltip text="Gemini 2.5 Flash: Rápido, eficiente y optimizado para flujos de trabajo ágiles y gratuitos.">
                  <button
                    onClick={() => setHighQuality(false)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 gap-2 relative overflow-hidden group ${
                      !highQuality 
                        ? "bg-zinc-800/80 border-zinc-600 ring-2 ring-white/10" 
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 opacity-60 grayscale hover:grayscale-0"
                    }`}
                  >
                    {!highQuality && (
                      <motion.div layoutId="model-active" className="absolute inset-0 bg-blue-500/5 -z-10" />
                    )}
                    <Zap size={20} className={!highQuality ? "text-blue-400" : "text-zinc-500"} />
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-tighter text-white">2.5 Flash</div>
                      <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Balanced</div>
                    </div>
                  </button>
                </Tooltip>

                <Tooltip text="Gemini 3 Pro: Máxima fidelidad, texturas micro-detalladas y mayor inteligencia visual. (Requiere Billing/Pro)">
                  <button
                    onClick={() => setHighQuality(true)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 gap-2 relative overflow-hidden group ${
                      highQuality 
                        ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20" 
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 opacity-60 grayscale hover:grayscale-0"
                    }`}
                  >
                    {highQuality && (
                      <motion.div layoutId="model-active" className="absolute inset-0 bg-amber-500/5 -z-10" />
                    )}
                    <Crown size={20} className={highQuality ? "text-amber-400" : "text-zinc-500"} />
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-tighter text-white">3.0 Pro</div>
                      <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Precision</div>
                    </div>
                  </button>
                </Tooltip>
              </div>

              <AnimatePresence>
                {showModelInfo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-zinc-900/80 rounded-2xl border border-white/5 space-y-3 mt-2">
                       <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <Zap size={12} className="text-blue-400" />
                             <span className="text-[10px] font-bold text-white uppercase tracking-widest">Gemini 2.5 Flash</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                            Optimizado para velocidad extrema. Ideal para iteraciones rápidas, prototipado y uso gratuito bajo cuotas generosas. Menor latencia en la síntesis de texturas.
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-zinc-500 bg-black/30 p-2 rounded-lg">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                             <span>Costo: Gratis / Bajo Consumo de Tokens</span>
                          </div>
                       </div>
                       
                       <div className="h-px bg-white/5" />

                       <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <Crown size={12} className="text-amber-400" />
                             <span className="text-[10px] font-bold text-white uppercase tracking-widest">Gemini 3.0 Pro</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                            Nivel editorial de lujo. Reconstruye micro-detalles, simetría perfecta y mayor coherencia en prompts complejos. Requiere suscripción o facturación activa en Google Cloud.
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-zinc-500 bg-black/30 p-2 rounded-lg">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                             <span>Costo: Grado Premium (Pay-as-you-go)</span>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Tooltip text="Search Grounding: Utiliza Google Search para mejorar la precisión y veracidad de la imagen (Solo Pro/Flash Image)">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border-primary)] w-full">
                <div className="flex items-center gap-3">
                  <Search size={18} className={useSearch ? "text-blue-400" : "text-zinc-600"} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest">Search Grounding</span>
                    <span className="text-[8px] text-[var(--text-secondary)] uppercase">Google Search Integration</span>
                  </div>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setUseSearch(!useSearch)} 
                  className={`w-12 h-6 rounded-full transition-all relative ${useSearch ? "bg-blue-500" : "bg-zinc-800"}`}
                >
                  <motion.div 
                    animate={{ x: useSearch ? 24 : 0 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </motion.button>
              </div>
            </Tooltip>

            <Tooltip text="Protocolo de IA Ética: Activa el registro de procedencia y marcas de agua digitales para prevenir desinformación.">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border-primary)] w-full">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className={ethicalProtocol ? "text-emerald-400" : "text-zinc-600"} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest">Protocolo Ético</span>
                    <span className="text-[8px] text-[var(--text-secondary)] uppercase">IA Responsable Activa</span>
                  </div>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEthicalProtocol(!ethicalProtocol)} 
                  className={`w-12 h-6 rounded-full transition-all relative ${ethicalProtocol ? "bg-emerald-500" : "bg-zinc-800"}`}
                >
                  <motion.div 
                    animate={{ x: ethicalProtocol ? 24 : 0 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </motion.button>
              </div>
            </Tooltip>

            <div id="syntergic-engine" className={`glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-amber-900/20 to-black/60 transition-all duration-500 overflow-hidden ${showSyntergicControls ? 'max-h-[1000px]' : 'max-h-24'}`}>
              <div 
                className="flex items-center justify-between text-[10px] font-black text-amber-400 uppercase tracking-widest cursor-pointer group"
                onClick={() => setShowSyntergicControls(!showSyntergicControls)}
              >
                <div className="flex items-center gap-2">
                  <Cpu size={14}/> 
                  Syntergic Engine v4.0
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border border-amber-500/30 transition-all duration-300 ${showSyntergicControls ? 'bg-amber-500 text-black' : 'bg-transparent text-amber-500'}`}>
                    {showSyntergicControls ? 'Active' : 'Standby'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showSyntergicControls ? <ChevronUp size={14} className="text-zinc-500 group-hover:text-white" /> : <ChevronDown size={14} className="text-zinc-500 group-hover:text-white" />}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSyntergicParams({ lambda: 85, protocol: 90, entropy: 15 }); }} 
                    className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"
                  >
                    <RotateCcw size={14}/>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showSyntergicControls && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-6"
                  >
                    {/* Real-time Neural Field Visualization */}
              <div className="relative h-24 w-full bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]" />
                <svg width="100%" height="100%" viewBox="0 0 200 100" className="relative z-10">
                  {/* Λ - Coherence: Central Focus */}
                  <motion.circle 
                    cx="100" cy="50" 
                    animate={{ 
                      r: 15 + (100 - syntergicParams.lambda) / 3,
                      opacity: 0.2 + (syntergicParams.lambda / 200)
                    }}
                    className="fill-blue-500/20 stroke-blue-500/40"
                    strokeWidth="0.5"
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                  
                  {/* Π - Protocol: Geometric Scaffold */}
                  <motion.path
                    d="M 80 30 L 120 30 L 120 70 L 80 70 Z"
                    animate={{ 
                      strokeDasharray: syntergicParams.protocol > 50 ? "0" : "2,2",
                      opacity: syntergicParams.protocol / 100,
                      scale: 0.8 + (syntergicParams.protocol / 500)
                    }}
                    className="fill-none stroke-emerald-500/30"
                    strokeWidth="0.5"
                    transition={{ type: "spring", stiffness: 100 }}
                  />

                  {/* Δν - Entropy: Stochastic Particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.circle 
                      key={i}
                      animate={{ 
                        x: (Math.random() - 0.5) * (syntergicParams.entropy * 1.5),
                        y: (Math.random() - 0.5) * (syntergicParams.entropy * 1.5),
                        opacity: (syntergicParams.entropy / 100) * Math.random(),
                        scale: Math.random() * 1.5
                      }}
                      cx={100 + (Math.cos(i) * 30)} 
                      cy={50 + (Math.sin(i) * 30)} 
                      r="1"
                      className="fill-purple-400"
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2 + Math.random() * 2, 
                        repeatType: "reverse",
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.6em] mb-1">Neural Field Preview</span>
                  <div className="flex gap-1">
                    <div className={`w-1 h-1 rounded-full ${syntergicParams.lambda > 70 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                    <div className={`w-1 h-1 rounded-full ${syntergicParams.protocol > 70 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                    <div className={`w-1 h-1 rounded-full ${syntergicParams.entropy > 30 ? 'bg-purple-500' : 'bg-zinc-800'}`} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-5">
                {[
                  { 
                    label: "Λ - Coherence", 
                    key: "lambda", 
                    desc: "Semantic Alignment", 
                    color: "text-blue-400",
                    tooltip: "Governs latent space convergence. High Λ (90%+) forces strict prompt adherence. Visual Example: 'Blue fire' results in pure blue flames. Low Λ (<40%) allows concept drift. Visual Example: 'Blue fire' may evolve into icy spirits or deep-sea glows."
                  },
                  { 
                    label: "Π - Protocol", 
                    key: "protocol", 
                    desc: "Structural Fidelity", 
                    color: "text-emerald-400",
                    tooltip: "Regulates structural tensor integrity and material physics. High Π (85%+) enforces geometric precision. Visual Example: A 'glass cube' will have perfect 90° angles. Low Π (<30%) relaxes topology. Visual Example: The 'glass cube' may appear melted or liquid."
                  },
                  { 
                    label: "Δν - Entropy", 
                    key: "entropy", 
                    desc: "Stochastic Variance", 
                    color: "text-purple-400",
                    tooltip: "Controls stochastic noise injection into the generation branch. High Δν (25%+) promotes divergent compositions and unique micro-details. Visual Example: A 'forest' might include bioluminescent spores. Low Δν (<5%) ensures deterministic, standard studio framing."
                  }
                ].map(p => (
                  <Tooltip key={p.key} text={p.tooltip}>
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                        <span className={p.color}>{p.label}</span>
                        <span className="text-zinc-500">{p.desc}</span>
                        <span className="text-white">{(syntergicParams as any)[p.key]}%</span>
                      </div>
                      <motion.input 
                        whileHover={{ scale: 1.01 }}
                        type="range" 
                        min="0" max="100" 
                        value={(syntergicParams as any)[p.key]} 
                        onChange={e => setSyntergicParams({...syntergicParams, [p.key]: +e.target.value})} 
                        className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" 
                      />
                    </div>
                  </Tooltip>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[8px] text-zinc-500 font-black uppercase tracking-widest">
                    <Activity size={10} className="animate-pulse text-amber-500" />
                    Neural State: {syntergicParams.lambda > 80 ? 'Stable' : syntergicParams.lambda > 40 ? 'Adaptive' : 'Experimental'}
                  </div>
                  <div className="text-[7px] font-mono text-zinc-600 uppercase tracking-tighter">
                    Entropy Vector: {syntergicParams.entropy > 50 ? 'Divergent' : 'Convergent'}
                  </div>
                </div>
                
                {/* Dynamic Impact Analysis */}
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <p className="text-[8px] text-zinc-400 leading-relaxed italic">
                    <span className="text-amber-400 font-bold">IMPACTO:</span> {
                      syntergicParams.lambda > 80 && syntergicParams.protocol > 80 
                        ? "Sincronización máxima. Generación ultra-fiel con rigor geométrico."
                        : syntergicParams.entropy > 60 
                          ? "Composición divergente detectada. Alta probabilidad de artefactos creativos únicos."
                          : syntergicParams.lambda < 30
                            ? "Deriva conceptual activa. La IA interpretará el prompt de forma abstracta."
                            : "Equilibrio operativo estándar. Resultados balanceados y predecibles."
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

            {mode === "color-grading" && (
              <div className="space-y-6">
                <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-indigo-900/20 to-black/60">
                  <div className="flex items-center justify-between text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Palette size={14}/> Color Balance (Global)</div>
                    <button onClick={() => setGrading(prev => ({...prev, shadowsR: 0, shadowsG: 0, shadowsB: 0}))} className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"><RotateCcw size={14}/></button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Red", key: "shadowsR", color: "text-red-400" },
                      { label: "Green", key: "shadowsG", color: "text-green-400" },
                      { label: "Blue", key: "shadowsB", color: "text-blue-400" }
                    ].map(s => (
                      <div key={s.key} className="space-y-2">
                        <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                          <span className={s.color}>{s.label}</span>
                          <span>{(grading as any)[s.key]}</span>
                        </div>
                        <motion.input 
                          whileHover={{ scale: 1.01 }}
                          type="range" min="-100" max="100" value={(grading as any)[s.key]} onChange={e => setGrading({...grading, [s.key]: +e.target.value})} onMouseUp={() => saveToHistory(`Color: ${s.label}`)} onTouchEnd={() => saveToHistory(`Color: ${s.label}`)} className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-amber-900/20 to-black/60">
                  <div className="flex items-center justify-between text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Spline size={14}/> Neural Curves (Simplified)</div>
                    <button onClick={() => setGrading(prev => ({...prev, blacks: 0, shadows: 0, midtones: 0, highlights: 0, whites: 0}))} className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"><RotateCcw size={14}/></button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Blacks", key: "blacks" },
                      { label: "Midtones", key: "midtones" },
                      { label: "Whites", key: "whites" }
                    ].map(s => (
                      <div key={s.key} className="space-y-2">
                        <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                          <span>{s.label}</span>
                          <span>{(grading as any)[s.key]}</span>
                        </div>
                        <motion.input 
                          whileHover={{ scale: 1.01 }}
                          type="range" min="-100" max="100" value={(grading as any)[s.key]} onChange={e => setGrading({...grading, [s.key]: +e.target.value})} onMouseUp={() => saveToHistory(`Curvas: ${s.label}`)} onTouchEnd={() => saveToHistory(`Curvas: ${s.label}`)} className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-zinc-900/60 to-black/60">
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Sun size={14}/> HSL Fine Tuning</div>
                    <button onClick={() => setGrading(prev => ({...prev, hue: 0}))} className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"><RotateCcw size={14}/></button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                        <span>Hue Rotate</span>
                        <span>{grading.hue}°</span>
                      </div>
                      <motion.input 
                        whileHover={{ scale: 1.01 }}
                        type="range" min="0" max="360" value={grading.hue} onChange={e => setGrading({...grading, hue: +e.target.value})} onMouseUp={() => saveToHistory("Ajuste de Tono")} onTouchEnd={() => saveToHistory("Ajuste de Tono")} className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" />
                    </div>
                  </div>
                </div>

                <div id="lut-engine" className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-emerald-900/20 to-black/60 relative overflow-hidden">
                  {isApplyingLut && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-emerald-400" size={24} />
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em]">Procesando LUT</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <Grid3X3 size={14}/> 3D LUT Engine
                    </div>
                    <div className="flex items-center gap-3">
                      {lutData && (
                        <div className="flex items-center gap-2 mr-2 pr-2 border-r border-white/10">
                          <Tooltip text="Guardar Snapshot de LUT">
                            <button 
                              onClick={() => {
                                saveToHistory(`LUT: ${lutName} (${Math.round(lutIntensity * 100)}%)`);
                                addLog(`PROTOCOL: SAVED LUT SNAPSHOT - ${lutName.toUpperCase()}`);
                              }} 
                              className="text-zinc-500 hover:text-emerald-400 transition-colors"
                            >
                              <History size={12}/>
                            </button>
                          </Tooltip>
                          <Tooltip text="Eliminar LUT actual">
                            <button onClick={() => { setLutData(null); setLutName(""); setGradedImage(null); }} className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={12}/></button>
                          </Tooltip>
                        </div>
                      )}
                      <button 
                        onClick={() => lutInputRef.current?.click()} 
                        className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
                      >
                        <Upload size={12} className="text-zinc-400 group-hover:text-white" />
                        <span className="text-[8px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest">Importar .cube</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {!lutData && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                          { id: 'teal-orange', name: 'Teal & Orange', color: 'bg-orange-500/20 text-orange-400' },
                          { id: 'vintage', name: 'Vintage Film', color: 'bg-amber-500/20 text-amber-400' },
                          { id: 'bw', name: 'B&W Contrast', color: 'bg-zinc-500/20 text-zinc-400' },
                          { id: 'cyberpunk', name: 'Cyberpunk', color: 'bg-pink-500/20 text-pink-400' }
                        ].map(p => (
                          <button 
                            key={p.id}
                            onClick={() => generatePresetLUT(p.id as any)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-white/5 hover:border-white/20 transition-all group ${p.color}`}
                          >
                            <span className="text-[8px] font-black uppercase tracking-widest">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {lutData ? (
                      <div className="space-y-5">
                        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <FileCode size={20} className="text-emerald-400" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">{lutName || "Neural LUT"}</span>
                            <span className="text-[8px] text-zinc-500 font-mono uppercase">{lutSize}x{lutSize}x{lutSize} Precision Matrix</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                              <Sliders size={12} className="text-emerald-400" />
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Intensidad del Perfil LUT (Mezcla)</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tooltip text="Vista Dividida (Side-by-Side)">
                                <button 
                                  onClick={() => setIsSplitView(!isSplitView)}
                                  className={`p-1.5 rounded-lg transition-all border ${isSplitView ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-zinc-500 border-white/10 hover:text-white'}`}
                                >
                                  <Columns size={12} />
                                </button>
                              </Tooltip>
                              <button 
                                onMouseDown={() => setIsComparing(true)}
                                onMouseUp={() => setIsComparing(false)}
                                onMouseLeave={() => setIsComparing(false)}
                                onTouchStart={() => setIsComparing(true)}
                                onTouchEnd={() => setIsComparing(false)}
                                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${isComparing ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 text-zinc-500 border-white/10 hover:text-white'}`}
                              >
                                {isComparing ? 'Original' : 'Comparar'}
                              </button>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">{Math.round(lutIntensity * 100)}%</span>
                            </div>
                          </div>
                          <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                              style={{ width: `${lutIntensity * 100}%` }}
                            />
                            <input 
                              type="range" min="0" max="1" step="0.01" 
                              value={lutIntensity} 
                              onChange={e => setLutIntensity(+e.target.value)} 
                              onMouseUp={() => saveToHistory("Ajuste de Filtro")}
                              onTouchEnd={() => saveToHistory("Ajuste de Filtro")}
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            />
                          </div>
                          <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase tracking-tighter px-1">
                            <span>Original</span>
                            <span>Neural Blend</span>
                            <span>Full Grade</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => setLutIntensity(0)}
                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-all"
                          >
                            0% (Original)
                          </button>
                          <button 
                            onClick={() => setLutIntensity(0.5)}
                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-all"
                          >
                            50% Blend
                          </button>
                          <button 
                            onClick={() => setLutIntensity(1)}
                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-all"
                          >
                            100% Impact
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => lutInputRef.current?.click()}
                        className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-[2rem] cursor-pointer hover:bg-white/5 transition-all group bg-zinc-900/20"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                          <FileCode size={32} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 group-hover:text-white uppercase tracking-[0.3em] transition-colors">Cargar Perfil .cube</span>
                        <span className="text-[8px] text-zinc-700 uppercase mt-2">Soporta matrices 3D hasta 64x64x64</span>
                      </div>
                    )}
                    <input ref={lutInputRef} type="file" hidden accept=".cube" onChange={onLUTUpload} />
                  </div>
                </div>
              </div>
            )}

            {mode === "upscale" && (
              <div className="space-y-6">
                <div className="space-y-3 px-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Upscale Factor</label>
                    <span className="text-[10px] font-mono text-zinc-400">{upscaleFactor}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["2x", "4x", "8x"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setUpscaleFactor(f)}
                        className={`py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest border ${
                          upscaleFactor === f 
                            ? "bg-white text-black border-white" 
                            : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/20"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <div className="flex gap-3">
                      <Info size={14} className="text-amber-400 shrink-0" />
                      <p className="text-[8px] text-amber-400/80 uppercase font-bold leading-relaxed">
                        El modo Upscale utiliza el motor Gemini 3.1 para reconstruir texturas y detalles a resoluciones de hasta 4K. 
                        Ideal para assets finales de alta fidelidad.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(mode === "edit" || mode === "vision" || mode === "inpaint" || mode === "color-grading" || mode === "upscale") && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">
                  <span>Input Asset Source</span>
                  <Tooltip text={showCamera ? "Cerrar conexión con el sensor óptico" : "Conectar cámara local para captura de assets"}>
                    <button onClick={() => showCamera ? stopCamera() : startCamera()} className="flex items-center gap-2 hover:text-white transition-colors">
                      <Camera size={14} /> {showCamera ? "Desactivar" : "Cámara"}
                    </button>
                  </Tooltip>
                </div>
                <div className="relative aspect-video glass rounded-[2.5rem] overflow-hidden flex items-center justify-center border border-white/5 group shadow-inner">
                  {showCamera ? (
                    <div className="relative w-full h-full">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" style={visualFilterStyle} />
                      <Tooltip text="Congelar fotograma actual para síntesis neural">
                        <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-black/20">
                          <Camera size={22}/>
                        </button>
                      </Tooltip>
                    </div>
                  ) : sourceImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden">
                      <img src={sourceImage} className="max-w-full max-h-full object-contain" style={sourceImageStyle} />
                      
                      {mode === "inpaint" && (
                        <canvas
                          ref={maskCanvasRef}
                          width={1024}
                          height={576}
                          onMouseDown={handleStartDrawing}
                          onMouseMove={handleDraw}
                          onMouseUp={handleStopDrawing}
                          onMouseLeave={handleStopDrawing}
                          onTouchStart={handleStartDrawing}
                          onTouchMove={handleDraw}
                          onTouchEnd={handleStopDrawing}
                          className={`absolute inset-0 w-full h-full cursor-crosshair touch-none transition-opacity duration-300 ${showMaskPreview ? 'opacity-100' : 'opacity-0'}`}
                        />
                      )}

                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex flex-col gap-3">
                          <Tooltip text="Rotar 90° a la derecha">
                            <button 
                              onClick={() => setRotation(prev => (prev + 90) % 360)}
                              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                              <RefreshCcw size={16} />
                            </button>
                          </Tooltip>
                          
                          <div className="h-px bg-white/5 mx-2" />
                          
                          <Tooltip text="Ajuste fino de nivelación (Straighten)">
                            <div className="flex flex-col items-center gap-1 px-1">
                              <span className="text-[7px] font-black text-zinc-500 uppercase">Level</span>
                              <input 
                                type="range" min="-45" max="45" step="0.5"
                                value={straighten}
                                onChange={(e) => setStraighten(+e.target.value)}
                                onMouseUp={() => saveToHistory("Nivelación")}
                                onTouchEnd={() => saveToHistory("Nivelación")}
                                className="w-24 h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none"
                              />
                              <span className="text-[8px] font-mono text-zinc-400">{straighten}°</span>
                            </div>
                          </Tooltip>

                          <div className="h-px bg-white/5 mx-2" />

                          <Tooltip text="Zoom / Recorte (Crop)">
                            <div className="flex flex-col items-center gap-1 px-1">
                              <span className="text-[7px] font-black text-zinc-500 uppercase">Zoom</span>
                              <input 
                                type="range" min="1" max="3" step="0.1"
                                value={sourceZoom}
                                onChange={(e) => setSourceZoom(+e.target.value)}
                                onMouseUp={() => saveToHistory("Zoom / Recorte")}
                                onTouchEnd={() => saveToHistory("Zoom / Recorte")}
                                className="w-24 h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none"
                              />
                              <span className="text-[8px] font-mono text-zinc-400">{sourceZoom.toFixed(1)}x</span>
                            </div>
                          </Tooltip>

                          <div className="h-px bg-white/5 mx-2" />

                          <Tooltip text="Desplazamiento (Pan)">
                            <div className="flex flex-col gap-2 px-1">
                              <span className="text-[7px] font-black text-zinc-500 uppercase text-center">Pan</span>
                              <div className="flex flex-col gap-1">
                                <input 
                                  type="range" min="-200" max="200" step="1"
                                  value={sourceOffset.x}
                                  onChange={(e) => setSourceOffset(prev => ({ ...prev, x: +e.target.value }))}
                                  onMouseUp={() => saveToHistory("Desplazamiento X")}
                                  onTouchEnd={() => saveToHistory("Desplazamiento X")}
                                  className="w-24 h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none"
                                />
                                <input 
                                  type="range" min="-200" max="200" step="1"
                                  value={sourceOffset.y}
                                  onChange={(e) => setSourceOffset(prev => ({ ...prev, y: +e.target.value }))}
                                  onMouseUp={() => saveToHistory("Desplazamiento Y")}
                                  onTouchEnd={() => saveToHistory("Desplazamiento Y")}
                                  className="w-24 h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none"
                                />
                              </div>
                            </div>
                          </Tooltip>

                          <div className="h-px bg-white/5 mx-2" />

                          <button 
                            onClick={async () => {
                              if (sourceImage) {
                                setLoadingStage("Baking Asset Geometry...");
                                const baked = await processImage(sourceImage);
                                setSourceImage(baked);
                                setRotation(0);
                                setStraighten(0);
                                setSourceZoom(1);
                                setSourceOffset({ x: 0, y: 0 });
                                setLoadingStage("");
                              }
                            }}
                            className="bg-white text-black px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all hover:scale-110 active:scale-90"
                          >
                            Bake
                          </button>

                          <div className="h-px bg-white/5 mx-2" />

                          <button 
                            onClick={() => {
                              setRotation(0);
                              setStraighten(0);
                              setSourceZoom(1);
                              setSourceOffset({ x: 0, y: 0 });
                            }}
                            className="text-[7px] text-zinc-600 hover:text-zinc-400 uppercase font-bold py-1"
                          >
                            Reset All
                          </button>
                        </div>
                      </div>

                      <div className="absolute top-4 right-4 flex gap-2">
                         {mode === "inpaint" && (
                           <Tooltip text="Borrar la máscara de selección actual para re-mapear">
                             <button onClick={clearMask} className="bg-black/60 backdrop-blur-md p-2 rounded-lg text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"><RotateCcw size={16}/></button>
                           </Tooltip>
                         )}
                         <Tooltip text="Eliminar asset actual y limpiar el buffer de memoria">
                            <button onClick={() => setSourceImage(null)} className="bg-black/60 backdrop-blur-md p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95"><Trash2 size={16}/></button>
                         </Tooltip>
                      </div>

                      {mode === "inpaint" && (
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-4">
                          <Tooltip text="Modulador de grosor para el trazado de máscara neural">
                            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                              <Brush size={14} className="text-zinc-500" />
                              <input 
                                type="range" min="5" max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(+e.target.value)} 
                                className="w-20 h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize" 
                              />
                              <span className="text-[9px] font-mono text-zinc-500 w-8">{brushSize}px</span>
                            </div>
                          </Tooltip>
                          <Tooltip text={showMaskPreview ? "Ocultar previsualización de máscara roja" : "Mostrar previsualización de máscara roja"}>
                            <button 
                              onClick={() => setShowMaskPreview(!showMaskPreview)}
                              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${showMaskPreview ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-500'}`}
                            >
                              {showMaskPreview ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Tooltip text="Abrir explorador de archivos para cargar imagen (PNG/JPG)">
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer text-zinc-600 hover:text-zinc-400 transition-all hover:scale-105 active:scale-95">
                        <Upload size={36} strokeWidth={1.5} />
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase">Importar Asset</p>
                      </div>
                    </Tooltip>
                  )}
                  <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={onFileUpload} />
                </div>
              </div>
            )}

            {mode === "style-transfer" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Style Reference Asset</label>
                    {styleImage && (
                      <button 
                        onClick={() => setStyleImage(null)}
                        className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Clear Style
                      </button>
                    )}
                  </div>
                  
                  <div className="glass rounded-[2rem] p-4 border border-white/5 bg-zinc-900/40 relative overflow-hidden group">
                    {styleImage ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
                        <img src={styleImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        
                        {/* Style DNA Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">DNA Locked</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-4 h-0.5 bg-white/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-white/60" style={{ width: `${Math.random() * 100}%` }} />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-[7px] font-mono text-white/40 uppercase tracking-tighter">
                            Ref: {Math.random().toString(16).substring(2, 8).toUpperCase()}
                          </div>
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => styleFileInputRef.current?.click()}
                            className="bg-white text-black px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
                          >
                            <RefreshCcw size={12} /> Replace Style
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => styleFileInputRef.current?.click()}
                        className="aspect-video border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all group hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/40 transition-all" />
                          <Palette size={32} className="text-zinc-500 group-hover:text-white transition-colors relative" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white transition-colors">Import Style DNA</span>
                          <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Drop image or click to browse</span>
                        </div>
                      </div>
                    )}
                    <input ref={styleFileInputRef} type="file" hidden accept="image/*" onChange={onStyleFileUpload} />
                  </div>

                  {styleImage && (
                    <div className="space-y-4 px-2 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Blend Intensity</label>
                          <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Original vs Style Reference</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                            <span className="text-[10px] font-black text-white">{(styleIntensity * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden group">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                          style={{ width: `${styleIntensity * 100}%` }}
                        />
                        <input 
                          type="range" min="0" max="1" step="0.01"
                          value={styleIntensity}
                          onChange={(e) => setStyleIntensity(parseFloat(e.target.value))}
                          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        
                        {/* Tick Marks */}
                        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none items-center opacity-20">
                          {[0, 25, 50, 75, 100].map(tick => (
                            <div key={tick} className="w-0.5 h-1 bg-white rounded-full" />
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase tracking-tighter px-1">
                        <span>Fidelity</span>
                        <span>Balanced</span>
                        <span>Full Transfer</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Presets */}
                  {!styleImage && (
                    <div className="grid grid-cols-4 gap-2 px-2">
                      {[
                        { name: "Cyber", url: "https://picsum.photos/seed/cyber/400/225" },
                        { name: "Oil", url: "https://picsum.photos/seed/oil/400/225" },
                        { name: "Vogue", url: "https://picsum.photos/seed/vogue/400/225" },
                        { name: "Sketch", url: "https://picsum.photos/seed/sketch/400/225" }
                      ].map(preset => (
                        <button 
                          key={preset.name}
                          onClick={() => setStyleImage(preset.url)}
                          className="aspect-video rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all relative group"
                        >
                          <img src={preset.url} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[7px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 px-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap size={12} className="text-amber-400" />
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Influence</label>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{styleIntensity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={styleIntensity}
                    onChange={(e) => setStyleIntensity(+e.target.value)}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">
                    <span>Structural</span>
                    <span>Balanced</span>
                    <span>Abstract</span>
                  </div>
                </div>
              </div>
            )}

            {mode === "asset" && (
              <div className="space-y-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Asset Type</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "icon", icon: <Grid3X3 size={12}/> },
                        { id: "component", icon: <Layout size={12}/> },
                        { id: "illustration", icon: <ImageIcon size={12}/> }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setAssetType(t.id as any)}
                          className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${assetType === t.id ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/20"}`}
                        >
                          {t.icon}
                          <span className="text-[7px] font-black uppercase tracking-tighter">{t.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Background Protocol</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "isolated", icon: <Box size={12}/> },
                        { id: "gradient", icon: <Droplets size={12}/> },
                        { id: "scene", icon: <ImageIcon size={12}/> }
                      ].map(b => (
                        <button
                          key={b.id}
                          onClick={() => setAssetBackground(b.id as any)}
                          className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${assetBackground === b.id ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/20"}`}
                        >
                          {b.icon}
                          <span className="text-[7px] font-black uppercase tracking-tighter">{b.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === "texture" && (
              <div className="space-y-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Material Type</label>
                    <select 
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/40 border border-[var(--border-primary)] rounded-2xl p-3 text-[10px] font-black text-[var(--text-primary)] uppercase tracking-tight outline-none focus:border-[var(--border-primary)] transition-all"
                    >
                      {["Metal", "Stone", "Wood", "Fabric", "Glass", "Organic", "Synthetic", "Liquid"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Tiling Protocol</label>
                    <button 
                      onClick={() => setIsTiling(!isTiling)}
                      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 ${isTiling ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900/40 border-white/5 text-zinc-500"}`}
                    >
                      <Grid3X3 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{isTiling ? "Seamless Active" : "Seamless Disabled"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-zinc-900/40 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest">Surface Detail Density</label>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-tighter">Lambda Micro-Texturing</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[12px] font-black text-indigo-400">{(surfaceDetail * 100).toFixed(0)}%</span>
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">
                        {surfaceDetail > 0.8 ? "Hyper" : surfaceDetail > 0.5 ? "High" : surfaceDetail > 0.2 ? "Std" : "Smooth"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative pt-2 pb-1">
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={false}
                        animate={{ width: `${surfaceDetail * 100}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                      />
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01"
                      value={surfaceDetail}
                      onChange={(e) => setSurfaceDetail(parseFloat(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {/* Tick Marks */}
                    <div className="flex justify-between mt-2 px-1">
                      {[0, 25, 50, 75, 100].map(tick => (
                        <div key={tick} className="flex flex-col items-center gap-1">
                          <div className={`w-0.5 h-1 rounded-full ${surfaceDetail * 100 >= tick ? "bg-indigo-400" : "bg-zinc-700"}`} />
                          <span className="text-[8px] font-bold text-zinc-700">{tick}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === "worldbuilding" && (
              <div className="space-y-4 mb-6">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Worldbuilding Axioms (Templates)</label>
                <div className="grid grid-cols-2 gap-3">
                  {WORLDBUILDING_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPrompt(t.prompt);
                        setSyntergicParams(t.params);
                        addLog(`PROTOCOL: APPLIED ${t.name.toUpperCase()} TEMPLATE`);
                      }}
                      className="flex items-center gap-3 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-all group text-left hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                        {t.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-tight">{t.name}</span>
                        <span className="text-[8px] text-zinc-500 uppercase">Load Axioms</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "upscale" && (
              <div className="space-y-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                      <Zap size={12} className="text-amber-400" />
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Upscale Factor</label>
                    </div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{upscaleFactor}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["2x", "4x", "8x"].map(factor => (
                      <button
                        key={factor}
                        onClick={() => setUpscaleFactor(factor as any)}
                        className={`py-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${upscaleFactor === factor ? "bg-white text-black border-white shadow-lg scale-105" : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/20"}`}
                      >
                        <span className="text-[12px] font-black">{factor}</span>
                        <span className="text-[7px] font-bold uppercase tracking-tighter">
                          {factor === "2x" ? "1K Res" : factor === "4x" ? "2K Res" : "4K Res"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest px-2 leading-relaxed italic">
                    El escalado neural utiliza Gemini 3 Pro para reconstruir micro-texturas y aumentar la densidad de píxeles manteniendo la fidelidad original.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Intent Prompt</label>
                  <button 
                    onClick={() => {
                      setNeuralMode(!neuralMode);
                      addLog(`NEURAL MODE: ${!neuralMode ? "ACTIVATED" : "DEACTIVATED"}`);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${neuralMode ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-white/5 border-white/10 text-zinc-500"}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${neuralMode ? "bg-amber-400 animate-pulse" : "bg-zinc-600"}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Neural Mode</span>
                  </button>
                </div>
                <button 
                  onClick={handleSuggestEnhancements}
                  disabled={isSuggesting || !prompt || prompt.length < 5}
                  className="flex items-center gap-2 text-[9px] font-black text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-30 uppercase tracking-widest"
                >
                  {isSuggesting ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                  Sugerir Mejoras
                </button>
              </div>
              <div className="flex gap-4">
                {mode === 'inpaint' && maskPreview && (
                  <div className="relative group shrink-0">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border border-white/10 bg-black/40 relative">
                      <img src={maskPreview} className="w-full h-full object-contain" alt="Mask Preview" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-2">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Mascara</span>
                      </div>
                    </div>
                    <button 
                      onClick={clearMask}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                  <div className="relative group">
                    <Tooltip text="Describe la visión final: iluminación, materiales, composición y estética">
                      <textarea
                        id="prompt-area"
                        value={prompt}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                            setPrompt(e.target.value);
                            if (promptSuggestions) setPromptSuggestions(null);
                          }
                        }}
                        className={`w-full h-32 bg-[var(--bg-secondary)]/60 rounded-3xl p-6 text-sm font-light text-[var(--text-primary)] border outline-none resize-none transition-all shadow-inner placeholder:text-[var(--text-secondary)] ${prompt.length >= MAX_PROMPT_LENGTH ? "border-red-500/50" : "border-[var(--border-primary)] focus:border-[var(--border-primary)]"}`}
                        placeholder={mode === 'inpaint' ? "Describe el objeto o textura a sintetizar en el área marcada..." : "Especifique el núcleo creativo..."}
                      />
                    </Tooltip>
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                       <Tooltip text="AI Suggest: Mejora tu prompt con terminología técnica y keywords (Neural Engine)">
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleSuggestEnhancements}
                          disabled={isSuggesting || prompt.length < 5}
                          className={`p-2 rounded-xl border transition-all shadow-xl ${isSuggesting ? 'bg-amber-500 text-black border-amber-400 animate-pulse' : 'bg-black/80 text-amber-400 border-white/10 hover:border-amber-400/50 hover:bg-black'}`}
                        >
                          {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        </motion.button>
                      </Tooltip>
                    </div>

                    <div className={`absolute bottom-4 right-6 text-[8px] font-black uppercase tracking-widest ${prompt.length >= MAX_PROMPT_LENGTH ? "text-red-500" : "text-zinc-600"}`}>
                      {prompt.length} / ∞
                    </div>
                  </div>

                <div className="relative">
                  <Tooltip text="Describe lo que NO quieres ver: objetos, estilos, colores o defectos">
                    <textarea
                      id="negative-prompt-area"
                      value={negativePrompt}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                          setNegativePrompt(e.target.value);
                        }
                      }}
                      className={`w-full h-20 bg-red-500/5 rounded-3xl p-6 text-sm font-light text-[var(--text-primary)] border outline-none resize-none transition-all shadow-inner placeholder:text-zinc-600 ${negativePrompt.length >= MAX_PROMPT_LENGTH ? "border-red-500/50" : "border-red-500/10 focus:border-red-500/30"}`}
                      placeholder="Elementos a evitar (Negative Prompt)..."
                    />
                  </Tooltip>
                  <div className={`absolute bottom-4 right-6 text-[8px] font-black uppercase tracking-widest ${negativePrompt.length >= MAX_PROMPT_LENGTH ? "text-red-500" : "text-zinc-600"}`}>
                    {negativePrompt.length} / ∞
                  </div>
                </div>
              </div>
              
              {promptSuggestions && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="p-4 bg-amber-400/5 border border-amber-400/10 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Sugerencia Neural</p>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">"{promptSuggestions.enhanced}"</p>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          saveToHistory("Neural Suggestion Applied");
                          setPrompt(promptSuggestions.enhanced);
                          setPromptSuggestions(null);
                          addLog("NEURAL PROTOCOL: APPLIED ENHANCED PROMPT");
                        }}
                        className="text-[9px] font-black text-white bg-amber-500 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 shrink-0"
                      >
                        Aplicar
                      </motion.button>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2">Keywords Sugeridos</p>
                      <div className="flex flex-wrap gap-2">
                        {promptSuggestions.keywords.map((kw, i) => (
                          <motion.button 
                            key={i}
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              saveToHistory(`Keyword Added: ${kw}`);
                              const newPrompt = prompt.includes(kw) ? prompt : `${prompt}, ${kw}`;
                              setPrompt(newPrompt);
                              addLog(`NEURAL PROTOCOL: ADDED KEYWORD "${kw.toUpperCase()}"`);
                            }}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                          >
                            + {kw}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {mode === "evolution" && (
              <div className="glass rounded-[2rem] p-6 space-y-4 border border-white/5 shadow-lg">
                <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Repeat size={14}/> Iteraciones de Refinamiento</div>
                  <span>{evolutionCycles}</span>
                </div>
                <Tooltip text="Define la cantidad de ciclos de auto-análisis y regeneración">
                  <motion.input 
                    whileHover={{ scale: 1.01 }}
                    type="range" min="1" max="5" step="1" value={evolutionCycles} onChange={e => setEvolutionCycles(+e.target.value)} className="w-full h-1 bg-zinc-800 rounded-lg accent-indigo-500 cursor-ew-resize appearance-none hover:accent-indigo-400" />
                </Tooltip>
              </div>
            )}

            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-blue-900/10 to-black/60">
              <div className="flex items-center justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Maximize size={14}/> Frame Configuration</div>
                <span className="text-zinc-500">{aspectRatio}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "1:1", icon: <Square size={14}/>, tip: "Square (Instagram/Profile)" },
                  { label: "16:9", icon: <RectangleHorizontal size={14}/>, tip: "Widescreen (Cinematic/YouTube)" },
                  { label: "9:16", icon: <RectangleVertical size={14}/>, tip: "Portrait (TikTok/Stories)" },
                  { label: "4:3", icon: <Monitor size={14}/>, tip: "Standard (Classic TV/Photography)" },
                  { label: "3:4", icon: <Smartphone size={14}/>, tip: "Portrait (Classic Photography)" }
                ].map(ratio => (
                  <Tooltip key={ratio.label} text={ratio.tip}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAspectRatio(ratio.label)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${aspectRatio === ratio.label ? "bg-blue-500/20 border-blue-400 text-white shadow-lg shadow-blue-500/10" : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-white hover:border-white/10"}`}
                    >
                      {ratio.icon}
                      <span className="text-[8px] font-black uppercase tracking-tighter">{ratio.label}</span>
                    </motion.button>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl">
              <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Sliders size={14}/> Engine DNA Tuning</div>
                <Tooltip text="Restablecer los parámetros de síntesis a su configuración editorial base">
                  <motion.button 
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.7 }}
                    onClick={() => { setLuxury(0.8); setRealism(0.9); setSceneDepth(0.8); setMutation(0.2); setSeed(Math.floor(Math.random()*999999)); }} 
                    className="p-1 text-zinc-500 hover:text-white"
                  >
                    <RotateCcw size={14}/>
                  </motion.button>
                </Tooltip>
              </div>
              <div className="space-y-5">
                {[
                  { label: "Lujo", val: luxury, set: setLuxury, tip: "Modulador de estética editorial: aumenta el contraste de color y la sofisticación" },
                  { label: "Realismo", val: realism, set: setRealism, tip: "Ancla de fidelidad: controla la coherencia física y la microtextura orgánica" },
                  { label: "Profundidad", val: sceneDepth, set: setSceneDepth, tip: "Escala espacial: 0% para macros/planos, 100% para paisajes/cine volumétrico" },
                  { label: "Mutación", val: mutation, set: setMutation, tip: "Factor de emergencia: introduce variaciones creative y caos controlado" }
                ].map(s => (
                  <Tooltip key={s.label} text={s.tip}>
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-tighter"><span>{s.label}</span><span>{Math.round(s.val * 100)}%</span></div>
                      <motion.input 
                        whileHover={{ scale: 1.01 }}
                        type="range" min="0" max="1" step="0.01" value={s.val} onChange={e => s.set(+e.target.value)} className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" />
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* IP Protection & Watermarking Panel */}
            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-emerald-900/10 to-black/60">
              <div className="flex items-center justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Copyright size={14}/> IP Protection & Watermark</div>
                <Tooltip text="Limpiar configuración de marca de agua">
                  <button onClick={() => { setWatermarkText(""); setWatermarkLogo(null); }} className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"><RotateCcw size={14}/></button>
                </Tooltip>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Texto de Marca</label>
                  <div className="relative">
                    <TypeIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      type="text" 
                      value={watermarkText}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_WATERMARK_LENGTH) {
                          setWatermarkText(e.target.value);
                        }
                      }}
                      placeholder="© 2026 IA Studio..."
                      className={`w-full bg-zinc-900/60 border rounded-xl py-2 pl-8 pr-4 text-[10px] text-zinc-300 outline-none transition-all ${watermarkText.length >= MAX_WATERMARK_LENGTH ? "border-red-500/50" : "border-white/5 focus:border-emerald-500/30"}`}
                    />
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[6px] font-black ${watermarkText.length >= MAX_WATERMARK_LENGTH ? "text-red-500" : "text-zinc-600"}`}>
                      {watermarkText.length}/{MAX_WATERMARK_LENGTH}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Logo / Firma</label>
                    <button 
                      onClick={() => watermarkLogoInputRef.current?.click()}
                      className={`w-full aspect-video rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${watermarkLogo ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}
                    >
                      {watermarkLogo ? (
                        <img src={watermarkLogo} className="h-8 object-contain opacity-60" referrerPolicy="no-referrer" />
                      ) : (
                        <>
                          <Upload size={14} className="text-zinc-600" />
                          <span className="text-[7px] text-zinc-600 uppercase">Subir Logo</span>
                        </>
                      )}
                    </button>
                    <input ref={watermarkLogoInputRef} type="file" hidden accept="image/*" onChange={onWatermarkLogoUpload} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Posición</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'].map(pos => (
                        <button 
                          key={pos}
                          onClick={() => setWatermarkPosition(pos as any)}
                          className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${watermarkPosition === pos ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900/60 border-white/5 text-zinc-600 hover:border-white/20'}`}
                        >
                          <Layout size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                    <span>Opacidad</span>
                    <span>{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="1" step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(+e.target.value)}
                    className="w-full h-1 bg-zinc-800 rounded-lg accent-emerald-500 cursor-ew-resize appearance-none"
                  />
                </div>

                <button 
                  onClick={handleApplyWatermark}
                  disabled={isWatermarking || (!watermarkText && !watermarkLogo) || (!resultImage && !sourceImage)}
                  className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {isWatermarking ? <Loader2 className="animate-spin" size={12}/> : <ShieldCheck size={12}/>}
                  Incrustar Marca de Agua
                </button>
              </div>
            </div>

            {/* Advanced Post-Output Grading Panel */}
            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5 shadow-2xl bg-gradient-to-br from-zinc-900/60 to-black/60">
              <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Settings size={14}/> Advanced Studio Grading</div>
                <div className="flex items-center gap-3">
                  <Tooltip text="Neural Auto-Balance: Optimiza parámetros basado en análisis visual">
                    <button onClick={neuralAutoBalance} className="text-amber-400/60 hover:text-amber-400 transition-colors flex items-center gap-1.5 p-1 rounded hover:bg-white/5">
                      <Wand2 size={12}/>
                      <span className="text-[8px]">Auto</span>
                    </button>
                  </Tooltip>
                  <Tooltip text="Limpiar correcciones de color y restaurar salida neural original">
                    <button onClick={resetFilters} className="hover:rotate-180 transition-transform duration-700 p-1 text-zinc-500 hover:text-white"><RotateCcw size={14}/></button>
                  </Tooltip>
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { label: "Luminancia", key: "brightness", icon: Sun, tip: "Ajuste fino de la exposición global de la imagen", min: 0, max: 200 },
                  { label: "Contraste", key: "contrast", icon: Contrast, tip: "Acentuación de la diferencia entre luces y sombras", min: 0, max: 200 },
                  { label: "Croma", key: "saturation", icon: Droplets, tip: "Intensidad y pureza de los canales de color", min: 0, max: 300 }
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="space-y-2 group/slider">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-2">
                          <Icon size={12} className="text-zinc-600 group-hover/slider:text-zinc-200 transition-colors" />
                          <span>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-zinc-500">{(filters as any)[s.key]}%</span>
                           <button onClick={() => setFilters({...filters, [s.key]: 100})} className="opacity-0 group-hover/slider:opacity-100 transition-opacity p-0.5 hover:text-white">
                             <RotateCcw size={10} />
                           </button>
                        </div>
                      </div>
                      <Tooltip text={s.tip}>
                        <input 
                          type="range" 
                          min={s.min} 
                          max={s.max} 
                          value={(filters as any)[s.key]} 
                          onChange={e => setFilters({...filters, [s.key]: +e.target.value})} 
                          onMouseUp={() => saveToHistory("Intensidad de LUT")}
                          onTouchEnd={() => saveToHistory("Intensidad de LUT")}
                          className="w-full h-1 bg-zinc-800 rounded-lg accent-white cursor-ew-resize appearance-none hover:accent-zinc-300" 
                        />
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>

            <div id="signature-dna" className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-2 custom-scroll">
              {IMAGE_PRESETS.map(p => (
                <Tooltip key={p.id} text={p.prompt} wide title={p.category}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { 
                      saveToHistory(`Preset: ${p.name}`); 
                      setActivePreset(p); 
                      if (p.baseDNA) runAdaptivePass(p.baseDNA);
                    }} 
                    className={`w-full relative px-4 py-3 rounded-xl text-left border transition-all ${activePreset?.id === p.id ? "bg-white text-black border-white shadow-xl" : "bg-zinc-900/40 text-zinc-500 border-white/5 hover:border-white/20"}`}
                  >
                    <div className="text-[7px] font-black uppercase opacity-60 mb-1">{p.category}</div>
                    <div className="text-[10px] font-bold truncate">{p.name}</div>
                  </motion.button>
                </Tooltip>
              ))}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full space-y-3 px-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Variaciones Neurales</label>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Multi-Synthesis</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map(count => (
                    <motion.button
                      key={count}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVariationCount(count as any)}
                      className={`py-2 rounded-xl text-[10px] font-black transition-all border ${variationCount === count ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900/60 text-zinc-500 border-white/5 hover:border-white/20"}`}
                    >
                      {count}x
                    </motion.button>
                  ))}
                </div>
              </div>

              {loading && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    stopEvolutionRef.current = true;
                    setLoading(false);
                    setLoadingStage("");
                    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
                    addLog("EMERGENCY STOP: PROTOCOL TERMINATED");
                  }}
                  className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-all animate-pulse"
                >
                  Abort Protocol
                </motion.button>
              )}
              <Tooltip text="Inicia el procesamiento de síntesis. El tiempo varía según la complejidad del prompt">
                <motion.button 
                  id="action-button" 
                  whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 30px rgba(255,255,255,0.2)" } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  onClick={handleExecution} 
                  disabled={loading} 
                  className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-4 transition-all shadow-[0_30px_60px_-15px_rgba(255,255,255,0.1)] ${loading ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200"}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18} fill="currentColor"/>}
                  {loading ? "SINTETIZANDO" : mode === "color-grading" ? "OPTIMIZAR COLOR" : "DISPARAR PULSO"}
                </motion.button>
              </Tooltip>
            </div>
          </section>

          <section className="lg:col-span-7 space-y-6 w-full">
            <div className="relative glass aspect-square rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex items-center justify-center bg-zinc-950 group hover:scale-[1.01] transition-transform duration-500">
              {(resultImage || sourceImage || worldbuildResults || multiResults) ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto custom-scroll">
                  {worldbuildResults ? (
                    <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                      {worldbuildResults.map((res, idx) => (
                        <div key={idx} className="space-y-3 group/item">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{res.category}</span>
                            <div className="flex gap-1">
                              <div className="w-1 h-1 bg-white/20 rounded-full" />
                              <div className="w-1 h-1 bg-white/20 rounded-full" />
                            </div>
                          </div>
                          <div className="aspect-square rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl relative group/img">
                            <img src={res.image} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                               <button onClick={() => window.open(res.image, '_blank')} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all"><Maximize2 size={16}/></button>
                               <Tooltip text="Descargar Imagen (Alta Calidad)">
                                 <button 
                                   onClick={() => downloadImage(res.image, `ia-studio-${res.category}-${Date.now()}.png`)} 
                                   className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all text-white"
                                 >
                                   <Download size={16}/>
                                 </button>
                               </Tooltip>
                               <Tooltip text="Upscale Neural 4K (4x)">
                                 <button onClick={() => handleQuickUpscale(res.image)} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all text-amber-400"><Zap size={16}/></button>
                               </Tooltip>
                               <button onClick={() => setResultImage(res.image)} className="p-3 bg-white text-black rounded-2xl hover:scale-105 transition-all"><Zap size={16}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : multiResults ? (
                    <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                      {multiResults.map((img, idx) => (
                        <div key={idx} className="space-y-3 group/item">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Variation {idx + 1}</span>
                            <span className="text-[8px] font-mono text-zinc-600">Δν-Entropy: {syntergicParams.entropy}%</span>
                          </div>
                          <div className="aspect-square rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl relative group/img">
                            <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                               <button onClick={() => window.open(img, '_blank')} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all"><Maximize2 size={16}/></button>
                               <Tooltip text="Descargar Imagen (Alta Calidad)">
                                 <button 
                                   onClick={() => downloadImage(img, `ia-studio-variation-${idx + 1}-${Date.now()}.png`)} 
                                   className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all text-white"
                                 >
                                   <Download size={16}/>
                                 </button>
                               </Tooltip>
                               <Tooltip text="Upscale Neural 4K (4x)">
                                 <button onClick={() => handleQuickUpscale(img)} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all text-amber-400"><Zap size={16}/></button>
                               </Tooltip>
                               <button onClick={() => setResultImage(img)} className="p-3 bg-white text-black rounded-2xl hover:scale-105 transition-all"><Zap size={16}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                      <div 
                        className={`relative w-full h-full flex items-center justify-center ${isCommentMode ? 'cursor-crosshair' : ''}`}
                        onClick={(e) => {
                          if (!isCommentMode) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          
                          const text = window.prompt("Ingrese su comentario:");
                          if (text) {
                            addComment(text, x, y);
                          }
                        }}
                      >
                        {isSplitView ? (
                          <div className="flex w-full h-full gap-4 p-8">
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Original</span>
                              <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50">
                                <img 
                                  src={(resultImage || sourceImage) || ""} 
                                  style={baseDisplayStyle} 
                                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-300 pointer-events-none" 
                                  loading="lazy"
                                />
                              </div>
                            </div>
                            <div className="w-px h-full bg-white/10 self-center" />
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Resultado</span>
                              <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50">
                                <div className="relative flex items-center justify-center max-w-full max-h-full">
                                  <img 
                                    src={(gradedImage || resultImage || sourceImage) || ""} 
                                    style={resultDisplayStyle} 
                                    className="max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-300 pointer-events-none" 
                                    loading="lazy"
                                  />
                                  {/* Bounding Boxes in Split View */}
                                  {allDetectedObjects.map((obj: any, idx: number) => {
                                    const [ymin, xmin, ymax, xmax] = obj.box_2d;
                                    const colorClass = obj.isAuto ? "border-emerald-500 bg-emerald-500/10" : "border-indigo-500 bg-indigo-500/10";
                                    const labelClass = obj.isAuto ? "bg-emerald-500" : "bg-indigo-500";
                                    
                                    return (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={`split-box-${idx}`}
                                        className={`absolute border-2 pointer-events-none z-40 ${colorClass}`}
                                        style={{
                                          top: `${ymin / 10}%`,
                                          left: `${xmin / 10}%`,
                                          width: `${(xmax - xmin) / 10}%`,
                                          height: `${(ymax - ymin) / 10}%`,
                                        }}
                                      >
                                        <div className={`absolute -top-5 left-0 text-white text-[7px] font-black px-1.5 py-0.5 rounded-t-md whitespace-nowrap uppercase tracking-widest flex items-center gap-1 ${labelClass}`}>
                                          <Scan size={7} />
                                          {obj.name}
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-center max-w-full max-h-full">
                            <img 
                              src={(isComparing ? (resultImage || sourceImage) : (gradedImage || resultImage || sourceImage)) || ""} 
                              style={resultDisplayStyle} 
                              className="max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-300 pointer-events-none" 
                            />
                            
                            {/* Bounding Boxes */}
                            {allDetectedObjects.map((obj: any, idx: number) => {
                              const [ymin, xmin, ymax, xmax] = obj.box_2d;
                              const colorClass = obj.isAuto ? "border-emerald-500 bg-emerald-500/10" : "border-indigo-500 bg-indigo-500/10";
                              const labelClass = obj.isAuto ? "bg-emerald-500" : "bg-indigo-500";

                              return (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={`box-${idx}`}
                                  className={`absolute border-2 pointer-events-none z-40 ${colorClass}`}
                                  style={{
                                    top: `${ymin / 10}%`,
                                    left: `${xmin / 10}%`,
                                    width: `${(xmax - xmin) / 10}%`,
                                    height: `${(ymax - ymin) / 10}%`,
                                  }}
                                >
                                  <div className={`absolute -top-5 left-0 text-white text-[8px] font-black px-1.5 py-0.5 rounded-t-md whitespace-nowrap uppercase tracking-widest flex items-center gap-1 ${labelClass}`}>
                                    <Scan size={8} />
                                    {obj.name}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {/* Comments Pins */}
                        {comments.map(comment => (
                          <div 
                            key={comment.id}
                            className="absolute z-50 group/pin"
                            style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                          >
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-help transition-transform hover:scale-125"
                              style={{ backgroundColor: comment.userColor }}
                            />
                            <div className="absolute left-6 top-0 w-48 p-3 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comment.userColor }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">{comment.userName}</span>
                              </div>
                              <p className="text-[11px] text-zinc-300 leading-relaxed">{comment.text}</p>
                              <div className="mt-2 text-[8px] text-zinc-600 uppercase font-bold">
                                {new Date(comment.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex bg-black/80 backdrop-blur-xl rounded-2xl p-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-3 group-hover:translate-y-0 border border-white/10 shadow-2xl">
                          <Tooltip text="Reducir escala del visor óptico">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleZoomOut} 
                              className="p-2.5 text-zinc-400 hover:text-white transition-colors"
                            >
                              <ZoomOut size={18}/>
                            </motion.button>
                          </Tooltip>
                          <Tooltip text="Restaurar visualización al 100%">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={resetZoom} 
                              className="px-5 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors tracking-tighter"
                            >
                              {Math.round(zoomLevel * 100)}%
                            </motion.button>
                          </Tooltip>
                          <Tooltip text="Aumentar escala del visor óptico">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleZoomIn} 
                              className="p-2.5 text-zinc-400 hover:text-white transition-colors"
                            >
                              <ZoomIn size={18}/>
                            </motion.button>
                          </Tooltip>
                          <div className="w-px h-4 bg-white/10 mx-1 self-center" />
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-2">Upscale Neural:</span>
                            {["2x", "4x", "8x"].map(factor => (
                              <Tooltip key={factor} text={`Aumentar resolución y detalle ${factor}`}>
                                <motion.button 
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleQuickUpscale(gradedImage || resultImage || sourceImage || "", factor as any)} 
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${upscaleFactor === factor ? "bg-amber-400 text-black shadow-lg" : "text-amber-400 hover:bg-white/5"}`}
                                >
                                  {factor}
                                </motion.button>
                              </Tooltip>
                            ))}
                          </div>
                      </div>
                      <div className="absolute top-10 right-10 flex gap-4 opacity-100 transition-all transform translate-y-0">
                        <Tooltip text={isSplitView ? "Desactivar Vista Dividida" : "Activar Vista Dividida"}>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsSplitView(!isSplitView)} 
                            className={`flex flex-col items-center gap-1 p-4 backdrop-blur-xl rounded-2xl border transition-all shadow-2xl ${isSplitView ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-black/80 text-white border-white/10 hover:bg-white/10'}`}
                          >
                            <Columns size={22} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Split</span>
                          </motion.button>
                        </Tooltip>
                        <Tooltip text={isCommentMode ? "Desactivar Modo Comentario" : "Activar Modo Comentario"}>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCommentMode(!isCommentMode)} 
                            className={`p-5 backdrop-blur-xl rounded-2xl border transition-all shadow-2xl ${isCommentMode ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/80 text-white border-white/10 hover:bg-white/10'}`}
                          >
                            <MessageSquare size={22} fill={isCommentMode ? "currentColor" : "none"} />
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Upscale Neural 4K (Aumentar resolución y detalle 4x)">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleQuickUpscale(gradedImage || resultImage || sourceImage || "")} 
                            className="p-5 bg-black/80 backdrop-blur-xl text-amber-400 rounded-2xl border border-white/10 hover:bg-white/10 transition-all shadow-2xl"
                          >
                            <Zap size={22}/>
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Variación Surrealista (Surreal Refined Preset)">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSurrealVariation} 
                            className="p-5 bg-black/80 backdrop-blur-xl text-pink-400 rounded-2xl border border-white/10 hover:bg-white/10 transition-all shadow-2xl"
                          >
                            <Sparkles size={22}/>
                          </motion.button>
                        </Tooltip>
                        <Tooltip text="Maximizar asset en ventana de resolución nativa (Alta Calidad)">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const url = gradedImage || resultImage || sourceImage || "";
                              if (url) {
                                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                                  window.open(url, '_blank');
                                } else {
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.target = "_blank";
                                  link.rel = "noopener noreferrer";
                                  link.click();
                                }
                              }
                            }} 
                            className="p-5 bg-black/80 backdrop-blur-xl text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all shadow-2xl"
                          >
                            <Maximize2 size={22}/>
                          </motion.button>
                        </Tooltip>
                        <div className="relative">
                          <Tooltip text="Ajustes de Exportación (Formato y Calidad)">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowExportPanel(!showExportPanel)} 
                              className={`p-5 backdrop-blur-xl rounded-2xl border transition-all shadow-2xl ${showExportPanel ? 'bg-zinc-800 text-white border-white/30' : 'bg-black/80 text-zinc-400 border-white/10 hover:bg-white/10'}`}
                            >
                              <Settings size={22}/>
                            </motion.button>
                          </Tooltip>

                          <AnimatePresence>
                            {showExportPanel && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full mb-4 right-0 w-64 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[200]"
                              >
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <ImageIcon size={14} className="text-zinc-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Formato de Exportación</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-2">
                                    {['png', 'jpg', 'webp'].map(fmt => (
                                      <button
                                        key={fmt}
                                        onClick={() => setExportSettings({ ...exportSettings, format: fmt })}
                                        className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${exportSettings.format === fmt ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10'}`}
                                      >
                                        {fmt}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase">
                                      <span>Calidad de Compresión</span>
                                      <span className="font-mono text-zinc-300">{exportSettings.quality}%</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="10"
                                      max="100"
                                      value={exportSettings.quality}
                                      onChange={e => setExportSettings({ ...exportSettings, quality: +e.target.value })}
                                      className="w-full h-1 bg-zinc-800 rounded-lg accent-white appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[7px] text-zinc-600 font-bold uppercase">
                                      <span>Ligero</span>
                                      <span>Lossless</span>
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Zap size={10} className="text-amber-400" />
                                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Acciones Rápidas</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button 
                                        onClick={() => {
                                          setExportSettings({ ...exportSettings, format: 'jpg', quality: 80 });
                                          setTimeout(downloadBakedAsset, 100);
                                        }}
                                        className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group"
                                      >
                                        <span className="text-[9px] font-bold text-zinc-300 uppercase">Save JPG</span>
                                      </button>
                                      <button 
                                        onClick={copyImageToClipboard}
                                        className="flex items-center justify-center gap-2 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl border border-indigo-500/20 transition-all"
                                      >
                                        <span className="text-[9px] font-bold text-indigo-300 uppercase">Copy IMG</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <p className="text-[8px] text-indigo-300/80 leading-relaxed italic">
                                      * PNG es ideal para gráficos limpios. JPG/WebP reducen drásticamente el peso del archivo para uso web.
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <Tooltip text={`Descargar Asset Final (.${exportSettings.format.toUpperCase()})`}>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={downloadBakedAsset} 
                            className="p-5 bg-white text-black rounded-2xl hover:bg-zinc-200 transition-all shadow-2xl"
                          >
                            <Download size={22}/>
                          </motion.button>
                        </Tooltip>
                      </div>

                      {ethicalProtocol && provenanceData && (
                        <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-3 group-hover:translate-y-0">
                          <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl max-w-[240px] animate-in slide-in-from-right-5 duration-500">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                              <ShieldCheck size={14} className="text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Registro de Procedencia</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                                <span className="text-zinc-500">ID SÍNTESIS</span>
                                <span className="text-zinc-300 font-mono">{provenanceData.id}</span>
                              </div>
                              <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                                <span className="text-zinc-500">TIMESTAMP</span>
                                <span className="text-zinc-300 font-mono">{new Date(provenanceData.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                                <span className="text-zinc-500">MOTOR NEURAL</span>
                                <span className="text-zinc-300 font-mono">{provenanceData.model}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-white/5">
                                <p className="text-[7px] text-zinc-500 leading-tight italic">Este asset ha sido generado bajo el Protocolo de IA Responsable. Contiene metadatos de procedencia y marcas de agua digitales.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-10 p-20 text-center opacity-30 select-none">
                  <div className="relative">
                    <ImageIcon size={100} strokeWidth={0.5} className="text-zinc-500"/>
                    <Activity size={24} className="absolute -bottom-2 -right-2 text-zinc-600 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-600 uppercase tracking-[0.5em] leading-tight">Neural Engine<br/>Standby</h3>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/98 flex flex-col items-center justify-center gap-8 z-50 px-8 py-10 overflow-hidden backdrop-blur-3xl animate-in fade-in duration-700">
                  {/* Branding Background Element */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-white/[0.02] select-none pointer-events-none tracking-tighter uppercase italic">
                    IA Studio
                  </div>

                  <div className="flex flex-col lg:flex-row items-center justify-center gap-10 w-full max-w-5xl h-full relative z-10">
                    
                    <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                      <div className="relative flex items-center justify-center">
                        {/* Sophisticated Glow */}
                        <div className="absolute inset-0 bg-white/5 blur-[150px] rounded-full animate-pulse scale-150" />
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full animate-pulse delay-700" />
                        
                        {mode === 'vision' ? <Scan size={140} className="text-white animate-pulse" /> : 
                          mode === 'evolution' ? <Workflow size={140} className="text-white animate-spin-slow" /> :
                          mode === 'inpaint' ? <Brush size={140} className="text-white animate-pulse" /> :
                          <div className="relative flex items-center justify-center">
                            {/* Rotating Branding Ring */}
                            <div className="absolute inset-0 -m-20 border border-white/5 rounded-full animate-spin-slow" />
                            <div className="absolute inset-0 -m-20 flex items-start justify-center">
                              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_15px_white]" />
                            </div>

                            <Loader2 className="animate-spin text-white/5" size={320} strokeWidth={0.05} />
                            
                            <div className="absolute inset-0 m-auto flex items-center justify-center flex-col space-y-6">
                              <div className="relative">
                                <Activity size={64} className="text-white animate-pulse" />
                                <div className="absolute -inset-4 border border-white/20 rounded-full animate-ping opacity-20" />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black tracking-[0.6em] text-white animate-pulse uppercase mb-1">IA Studio</span>
                                <span className="text-[8px] font-bold tracking-[0.4em] text-zinc-500 uppercase">Neural Engine v3.1</span>
                              </div>
                            </div>

                            {/* Circular Progress */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.15]" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="46" 
                                fill="none" 
                                stroke="white" 
                                strokeWidth="1.5" 
                                strokeDasharray="289" 
                                strokeDashoffset={289 - (289 * progress) / 100} 
                                strokeLinecap="round" 
                                className="transition-all duration-700 ease-in-out shadow-[0_0_20px_white]" 
                              />
                            </svg>
                          </div>}
                      </div>

                      <div className="w-full max-w-sm space-y-8">
                        <div className="space-y-6">
                          <div className="flex justify-between items-end border-b border-white/10 pb-6">
                            <div className="space-y-2 text-left">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.6em]">Procesando Fase</p>
                              </div>
                              <p className="text-2xl font-black text-white uppercase tracking-[0.15em] animate-pulse drop-shadow-2xl">{loadingStage}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-5xl font-black font-mono text-white leading-none tabular-nums tracking-tighter">{Math.round(progress)}%</p>
                            </div>
                          </div>
                          
                          <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-zinc-800 via-white to-zinc-800 bg-[length:200%_100%] animate-shimmer transition-all duration-700 ease-in-out shadow-[0_0_30px_rgba(255,255,255,0.6)]" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col gap-1">
                            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Model Pipeline</span>
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Cpu size={10} className="text-amber-400"/> {highQuality ? "Gemini 3 Pro" : "Gemini 2.5 Flash"}
                            </span>
                          </div>
                          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col gap-1">
                            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Synthesis Mode</span>
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Layers size={10} className="text-indigo-400"/> Latent Diffusion
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div id="provenance-logs" className="hidden lg:flex w-80 h-[400px] flex-col bg-black/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                          <Terminal size={12} className="text-zinc-400" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Neural Status Log</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                        </div>
                      </div>
                      <div ref={logContainerRef} className="flex-1 p-6 font-mono text-[9px] text-zinc-500 space-y-3 overflow-y-auto custom-scroll">
                        {statusLog.length === 0 && (
                          <div className="flex items-center gap-2 animate-pulse">
                            <ChevronRight size={10}/> Waiting for neural handshake...
                          </div>
                        )}
                        {statusLog.map((log, idx) => (
                          <div key={idx} className="flex gap-3 leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-zinc-700 whitespace-nowrap shrink-0">{log.split(' ')[0]}</span>
                            <span className={log.includes('SUCCESS') ? 'text-green-400 font-bold' : log.includes('ERROR') ? 'text-red-400' : 'text-zinc-400'}>
                              {log.split(' ').slice(1).join(' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showAnalysis && analysisData && (
              <div className="glass rounded-[3.5rem] p-10 space-y-8 animate-in slide-in-from-bottom-12 duration-700 shadow-2xl relative border border-white/10 overflow-hidden">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <div className="flex items-center gap-5 text-zinc-100">
                    <Eye size={28} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"/>
                    <h4 className="text-sm font-black uppercase tracking-[0.4em]">Reporte de Análisis Óptico Detallado</h4>
                  </div>
                  <Tooltip text="Cerrar el informe y volver al visor principal">
                    <button onClick={() => setShowAnalysis(false)} className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"><Trash2 size={20}/></button>
                  </Tooltip>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-4 custom-scroll">
                  {/* Scene Understanding */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-amber-400">
                      <Scan size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Scene Understanding</span>
                    </div>
                    <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                      <div>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Description</span>
                        <p className="text-xs text-zinc-300 leading-relaxed italic">"{analysisData.scene?.description}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Mood</span>
                          <p className="text-[10px] text-zinc-400">{analysisData.scene?.mood}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Lighting</span>
                          <p className="text-[10px] text-zinc-400">{analysisData.scene?.lighting}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Composition</span>
                        <p className="text-[10px] text-zinc-400">{analysisData.scene?.composition}</p>
                      </div>
                    </div>
                  </div>

                  {/* Object Detection */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <Layers size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Object Detection</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Specific Object Search */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input 
                            type="text"
                            value={objectSearchQuery}
                            onChange={(e) => setObjectSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleObjectSearch()}
                            placeholder="Buscar objetos específicos..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] text-zinc-300 outline-none focus:border-indigo-500/30 transition-all"
                          />
                        </div>
                        <button 
                          onClick={handleObjectSearch}
                          disabled={isSearchingObjects || !objectSearchQuery}
                          className="px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                        >
                          {isSearchingObjects ? <Loader2 size={12} className="animate-spin" /> : "Buscar"}
                        </button>
                      </div>

                      {objectSearchResults.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-1">Resultados de Búsqueda</p>
                          {objectSearchResults.map((obj: any, idx: number) => (
                            <div key={`search-${idx}`} className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/20 flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">{obj.name}</span>
                                {obj.box_2d && <Scan size={10} className="text-indigo-400" />}
                              </div>
                              <p className="text-[9px] text-zinc-400 leading-tight">{obj.details}</p>
                            </div>
                          ))}
                          <button 
                            onClick={() => setObjectSearchResults([])}
                            className="text-[8px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest px-1"
                          >
                            Limpiar Resultados
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Objetos Detectados (Auto)</p>
                          <button 
                            onClick={() => setShowAutoBoxes(!showAutoBoxes)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${showAutoBoxes ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'}`}
                          >
                            <Eye size={10} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{showAutoBoxes ? "Ocultar" : "Mostrar"}</span>
                          </button>
                        </div>
                        {analysisData.objects?.map((obj: any, idx: number) => (
                          <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-white uppercase tracking-wider">{obj.name}</span>
                              {obj.box_2d && <Scan size={10} className="text-emerald-400" />}
                            </div>
                            <p className="text-[9px] text-zinc-400 leading-tight">{obj.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Content Moderation */}
                  <div className="space-y-6 md:col-span-2">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <ShieldCheck size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Content Moderation & Safety</span>
                    </div>
                    <div className={`p-6 rounded-3xl border flex flex-col md:flex-row gap-6 items-center ${
                      analysisData.moderation?.safety_status === 'Safe' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                      analysisData.moderation?.safety_status === 'Caution' ? 'bg-amber-500/5 border-amber-500/20' : 
                      'bg-red-500/5 border-red-500/20'
                    }`}>
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className={`p-4 rounded-full ${
                          analysisData.moderation?.safety_status === 'Safe' ? 'bg-emerald-500/20 text-emerald-400' : 
                          analysisData.moderation?.safety_status === 'Caution' ? 'bg-amber-500/20 text-amber-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {analysisData.moderation?.safety_status === 'Safe' ? <ShieldCheck size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{analysisData.moderation?.safety_status}</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {analysisData.moderation?.flags?.map((flag: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-400 border border-white/5">{flag}</span>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic">"{analysisData.moderation?.reasoning}"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <Tooltip text="Inyectar el análisis técnico en el motor para generar una variante de mayor fidelidad">
                    <button onClick={() => { setPrompt(analysisData.technical_prompt || ""); setMode('generate'); setShowAnalysis(false); }} className="w-full py-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-[11px] font-black uppercase tracking-[0.5em] flex items-center justify-center gap-5 transition-all hover:scale-[1.01] active:scale-95 shadow-lg group">
                      <Sparkles size={18} className="group-hover:text-amber-400 transition-colors"/> RECONSTRUIR VISIÓN NEURAL DESDE ANÁLISIS
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
      <style>{`
        .tutorial-highlight {
          outline: 4px solid #fbbf24 !important;
          outline-offset: 4px;
          box-shadow: 0 0 50px rgba(251, 191, 36, 0.4) !important;
          z-index: 150 !important;
          position: relative !important;
          transition: all 0.5s ease;
          animation: tutorial-pulse 2s infinite ease-in-out;
        }

        @keyframes tutorial-pulse {
          0% { outline-color: rgba(251, 191, 36, 1); outline-offset: 4px; box-shadow: 0 0 50px rgba(251, 191, 36, 0.4); }
          50% { outline-color: rgba(251, 191, 36, 0.5); outline-offset: 8px; box-shadow: 0 0 80px rgba(251, 191, 36, 0.6); }
          100% { outline-color: rgba(251, 191, 36, 1); outline-offset: 4px; box-shadow: 0 0 50px rgba(251, 191, 36, 0.4); }
        }
        
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; transition: background 0.3s; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
      `}</style>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="advanced-grading">
          <feColorMatrix type="matrix" values={`
            1 0 0 0 ${grading.shadowsR / 255}
            0 1 0 0 ${grading.shadowsG / 255}
            0 0 1 0 ${grading.shadowsB / 255}
            0 0 0 1 0
          `} />
          <feComponentTransfer>
            <feFuncR type="gamma" exponent={1 - grading.midtones / 200} amplitude={1 + grading.whites / 200} offset={grading.blacks / 200} />
            <feFuncG type="gamma" exponent={1 - grading.midtones / 200} amplitude={1 + grading.whites / 200} offset={grading.blacks / 200} />
            <feFuncB type="gamma" exponent={1 - grading.midtones / 200} amplitude={1 + grading.whites / 200} offset={grading.blacks / 200} />
          </feComponentTransfer>
        </filter>
      </svg>
    </div>
  );
}
