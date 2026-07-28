import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutTemplate,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Search,
  Sliders,
  X,
  Bookmark,
  Download,
  Upload,
  Play,
  Wand2,
  Tag,
  ChevronRight,
  Info,
  CornerDownLeft,
  RefreshCw,
  FolderPlus,
  Layers,
  ArrowRight
} from "lucide-react";

export interface PromptTemplate {
  id: string;
  title: string;
  structure: string; // e.g. "A [subject] in [style] with [lighting]"
  description: string;
  category: "Retratos" | "Cinematográfico" | "Sci-Fi & Cyberpunk" | "Fotografía Producto" | "Arquitectura" | "Abstracto Neural" | "Personalizados";
  tags: string[];
  isCustom?: boolean;
  shortcutKey?: string;
  favorite?: boolean;
  createdDate?: string;
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "tpl-portrait-01",
    title: "Retrato Fotográfico de Estudio",
    structure: "A hyper-detailed portrait of [subject], shot in [style], illuminated by [lighting], [lens_type] f/1.4, cinematic color grading, razor-sharp focus, 8k resolution",
    description: "Ideal para fotos de rostros, personajes y retratos de alta definición.",
    category: "Retratos",
    tags: ["Retrato", "Estudio", "Bokeh", "Fotografía"],
    favorite: true,
  },
  {
    id: "tpl-cinematic-01",
    title: "Escena Fotográfica Cinemática",
    structure: "Cinematic wide-angle shot of [subject] at [location], featuring [atmospheric_effect], dramatic [lighting_style], 35mm film grain, directed by [director_style] style, anamorphic lens flair",
    description: "Captura tomas de película con iluminación dramática y grano analógico.",
    category: "Cinematográfico",
    tags: ["Cine", "Película", "Drama", "Atmósfera"],
    favorite: true,
  },
  {
    id: "tpl-scifi-01",
    title: "Entorno Cyberpunk / Sci-Fi",
    structure: "Futuristic [setting] with towering neon billboards, [weather_condition], holographic displays reflecting off wet pavement, [color_scheme] color palette, ultra-detailed cyberpunk aesthetics",
    description: "Estructura para paisajes urbanos futuristas, sci-fi y ciberpunk.",
    category: "Sci-Fi & Cyberpunk",
    tags: ["Cyberpunk", "Neón", "Futuro", "Sci-Fi"],
    favorite: true,
  },
  {
    id: "tpl-product-01",
    title: "Fotografía Comercial de Producto",
    structure: "Commercial studio product render of [product], resting on [surface_material], illuminated by softbox [lighting_setup], shallow depth of field, pristine reflections, [vibe] aesthetic",
    description: "Render limpio y profesional para productos, envases y mockups.",
    category: "Fotografía Producto",
    tags: ["Producto", "Comercial", "Estudio", "Render"],
  },
  {
    id: "tpl-arch-01",
    title: "Arquitectura & Diseño Interior",
    structure: "Modern architectural interior design of a [room_or_building], constructed with [materials], flooded with natural [lighting_time], minimalist luxury aesthetic, archdaily photography, [camera_angle]",
    description: "Muestra espacios arquitectónicos modernos y vanguardistas.",
    category: "Arquitectura",
    tags: ["Arquitectura", "Diseño", "Lujo", "Espacios"],
  },
  {
    id: "tpl-neural-01",
    title: "Síntesis Neural & Arte Abstracto",
    structure: "Vibrant abstract neural flow representing [concept], interwoven with [texture_element], glowing [color_palette] energy threads, microscopic fluid dynamics, 3D Octane render, 8k",
    description: "Generación de texturas complejas, flujos energéticos y arte abstracto.",
    category: "Abstracto Neural",
    tags: ["Neural", "Abstracto", "Flujo", "3D"],
    favorite: true,
  },
  {
    id: "tpl-character-01",
    title: "Concept Art de Personaje Fantasy",
    structure: "Full-body concept art of [character_type] equipped with [armor_weapon], dynamic battle pose, standing in [environment], artstation trend, detailed digital painting by [artist_style]",
    description: "Diseño de personajes de fantasía, juegos y novelas gráficas.",
    category: "Retratos",
    tags: ["Personaje", "Concept Art", "Fantasía", "Digital Art"],
  },
  {
    id: "tpl-macro-01",
    title: "Fotografía Macro de Naturaleza",
    structure: "Extreme macro photograph of [subject], showing intricate micro-textures of [texture_details], illuminated by rim lighting, water droplets reflecting [background_reflection], f/2.8 macro lens",
    description: "Enfoque extremo en micro-detalles, insectos, flora o materiales.",
    category: "Fotografía Producto",
    tags: ["Macro", "Naturaleza", "Textura", "Detalle"],
  }
];

const LOCAL_STORAGE_KEY = "syntergic_custom_prompt_templates_v1";

// Helper to extract bracketed tokens like [subject], [lighting] from a template string
export function parseTemplateTokens(structure: string): string[] {
  const matches = structure.match(/\[([a-zA-Z0-9_\-\s]+)\]/g);
  if (!matches) return [];
  // Return unique cleaned token names without brackets
  const tokens = matches.map((m) => m.slice(1, -1).trim());
  return Array.from(new Set(tokens));
}

// Helper to fill tokens into structure
export function fillTemplateTokens(
  structure: string,
  values: Record<string, string>
): string {
  let result = structure;
  Object.entries(values).forEach(([token, val]) => {
    const replacement = val.trim() || `[${token}]`;
    const regex = new RegExp(`\\[${token}\\]`, "g");
    result = result.replace(regex, replacement);
  });
  return result;
}

interface PromptShortcutsBarProps {
  currentPrompt: string;
  onInjectPrompt: (text: string, mode: "replace" | "append") => void;
  onOpenManager: () => void;
}

export const PromptShortcutsBar: React.FC<PromptShortcutsBarProps> = ({
  currentPrompt,
  onInjectPrompt,
  onOpenManager,
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  // Load custom + default templates
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const customTemplates: PromptTemplate[] = saved ? JSON.parse(saved) : [];
      setTemplates([...DEFAULT_PROMPT_TEMPLATES, ...customTemplates]);
    } catch {
      setTemplates(DEFAULT_PROMPT_TEMPLATES);
    }
  }, []);

  const handleTemplateClick = (tpl: PromptTemplate) => {
    const tokens = parseTemplateTokens(tpl.structure);
    if (tokens.length === 0) {
      // Direct inject
      onInjectPrompt(tpl.structure, "append");
    } else {
      // Open variable filling popover/modal
      setSelectedTemplate(tpl);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-white/10">
          <button
            onClick={onOpenManager}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm shrink-0"
            title="Gestor de Plantillas e Inyección de Prompt"
          >
            <LayoutTemplate size={13} className="text-amber-400" />
            <span>Plantillas</span>
          </button>
        </div>

        {/* Template shortcut pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {templates.slice(0, 7).map((tpl) => {
            const hasTokens = parseTemplateTokens(tpl.structure).length > 0;
            return (
              <button
                key={tpl.id}
                onClick={() => handleTemplateClick(tpl)}
                className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-zinc-300 hover:text-white rounded-xl text-[10px] font-mono whitespace-nowrap transition-all shrink-0"
              >
                <Sparkles size={11} className="text-amber-400/70 group-hover:text-amber-400 transition-colors" />
                <span>{tpl.title}</span>
                {hasTokens && (
                  <span className="px-1 text-[8px] font-bold bg-amber-400/20 text-amber-300 rounded font-mono">
                    [...]
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={onOpenManager}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-dashed border-white/20 rounded-xl text-[10px] font-mono flex items-center gap-1 shrink-0 transition-colors"
          >
            <Plus size={12} />
            <span>Ver más...</span>
          </button>
        </div>
      </div>

      {/* Variable Fill Modal when clicked from shortcut */}
      {selectedTemplate && (
        <PromptTemplateFillModal
          template={selectedTemplate}
          currentPrompt={currentPrompt}
          onClose={() => setSelectedTemplate(null)}
          onInject={(text, mode) => {
            onInjectPrompt(text, mode);
            setSelectedTemplate(null);
          }}
        />
      )}
    </>
  );
};

interface PromptTemplateFillModalProps {
  template: PromptTemplate;
  currentPrompt: string;
  onClose: () => void;
  onInject: (finalPrompt: string, mode: "replace" | "append") => void;
}

export const PromptTemplateFillModal: React.FC<PromptTemplateFillModalProps> = ({
  template,
  currentPrompt,
  onClose,
  onInject,
}) => {
  const tokens = useMemo(() => parseTemplateTokens(template.structure), [template.structure]);
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({});
  const [insertMode, setInsertMode] = useState<"replace" | "append">(
    currentPrompt.trim() ? "append" : "replace"
  );
  const [copied, setCopied] = useState(false);

  // Quick preset keyword chips for common tokens
  const tokenSuggestions: Record<string, string[]> = {
    subject: ["Cybernetic Android", "Ancient Mythological Titan", "Neon Metropole", "Futuristic Hypercar", "Luminous Flora"],
    style: ["Cinematic Photorealism", "Dark Fantasy Digital Oil", "Anamorphic 35mm", "Minimalist Bauhaus", "Isometric Cyberpunk"],
    lighting: ["Volumetric Rim Light", "Golden Hour Sunbeams", "Chiaroscuro Neon", "Softbox Studio Glow", "Bioluminescent Dark"],
    lens_type: ["85mm Portrait Prime", "24mm Wide Anamorphic", "100mm Macro Lens", "Fish-eye Ultra-wide"],
    product: ["Luxury Perfume Bottle", "Quantum Smartwatch", "Ceramic Coffee Mug", "Matte Black Headphones"],
    surface_material: ["Polished Dark Obsidian", "Brushed Aluminum", "Satin Silk Fabric", "Wet Asphalt Concrete"],
    location: ["Tokyo Alleyway", "Nebula Station Alpha", "Rainforest Canopy", "Deep Ocean Abyss"],
    atmospheric_effect: ["Thick Fog & Dust Particles", "Rain Streak Reflections", "Floating Ash Embers", "Prismatic Rays"],
    color_scheme: ["Emerald & Gold", "Neon Cyan & Magenta", "Monochromatic Obsidian", "Warm Pastel Sunset"],
    concept: ["Synaptic Neural Network", "Quantum Superposition", "Fluid Entropy", "Cosmic Singularity"]
  };

  const finalGeneratedText = useMemo(
    () => fillTemplateTokens(template.structure, tokenValues),
    [template.structure, tokenValues]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(finalGeneratedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold rounded-full uppercase">
                {template.category}
              </span>
              <span className="text-zinc-500 text-[10px] font-mono">
                {tokens.length} variables detectadas
              </span>
            </div>
            <h3 className="text-lg font-black text-white">{template.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Variable Inputs */}
        <div className="mt-5 space-y-4 max-h-[340px] overflow-y-auto pr-1">
          {tokens.length === 0 ? (
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-zinc-300 font-mono">
              Esta plantilla no requiere variables adicionales. Puedes inyectarla directamente.
            </div>
          ) : (
            tokens.map((token) => {
              const suggestions = tokenSuggestions[token.toLowerCase()] || [];
              return (
                <div key={token} className="space-y-1.5 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-mono font-bold text-amber-400 uppercase tracking-wide">
                      [{token.replace(/_/g, " ")}]
                    </label>
                  </div>
                  <input
                    type="text"
                    value={tokenValues[token] || ""}
                    onChange={(e) =>
                      setTokenValues({ ...tokenValues, [token]: e.target.value })
                    }
                    placeholder={`Ingresa valor para [${token}]...`}
                    className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                  />

                  {/* Suggestion Chips */}
                  {suggestions.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">
                        Sugerencias:
                      </span>
                      {suggestions.map((sug) => (
                        <button
                          key={sug}
                          onClick={() =>
                            setTokenValues({ ...tokenValues, [token]: sug })
                          }
                          className="px-2 py-0.5 bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/40 text-zinc-300 hover:text-amber-300 text-[9px] font-mono rounded-lg transition-all shrink-0"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center justify-between">
              <span>Vista Previa del Prompt Final</span>
              <button
                onClick={handleCopy}
                className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 font-mono"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado!" : "Copiar Texto"}
              </button>
            </span>
            <div className="p-4 bg-black border border-amber-400/30 rounded-2xl font-mono text-xs text-amber-200/90 leading-relaxed shadow-inner">
              {finalGeneratedText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
            <button
              onClick={() => setInsertMode("append")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                insertMode === "append"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Anexar al Prompt
            </button>
            <button
              onClick={() => setInsertMode("replace")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                insertMode === "replace"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Reemplazar Todo
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={() => onInject(finalGeneratedText, insertMode)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all"
            >
              <Wand2 size={14} />
              Inyectar Prompt
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface PromptTemplateManagerModalProps {
  currentPrompt: string;
  onClose: () => void;
  onInjectPrompt: (text: string, mode: "replace" | "append") => void;
}

export const PromptTemplateManagerModal: React.FC<PromptTemplateManagerModalProps> = ({
  currentPrompt,
  onClose,
  onInjectPrompt,
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [activeTab, setActiveTab] = useState<"library" | "create">("library");

  // Filling modal target
  const [fillTemplate, setFillTemplate] = useState<PromptTemplate | null>(null);

  // Edit / Create Form State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formStructure, setFormStructure] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<PromptTemplate["category"]>("Personalizados");
  const [formTags, setFormTags] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const customTemplates: PromptTemplate[] = saved ? JSON.parse(saved) : [];
      setTemplates([...DEFAULT_PROMPT_TEMPLATES, ...customTemplates]);
    } catch {
      setTemplates(DEFAULT_PROMPT_TEMPLATES);
    }
  }, []);

  const saveCustomTemplatesToStorage = (updatedList: PromptTemplate[]) => {
    const customOnly = updatedList.filter((t) => t.isCustom);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOnly));
  };

  const categories = [
    "Todas",
    "Retratos",
    "Cinematográfico",
    "Sci-Fi & Cyberpunk",
    "Fotografía Producto",
    "Arquitectura",
    "Abstracto Neural",
    "Personalizados",
  ];

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        selectedCategory === "Todas" || tpl.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.structure.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStructure.trim()) return;

    const parsedTags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingTemplateId) {
      const nextList = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              title: formTitle,
              structure: formStructure,
              description: formDescription,
              category: formCategory,
              tags: parsedTags.length > 0 ? parsedTags : t.tags,
            }
          : t
      );
      setTemplates(nextList);
      saveCustomTemplatesToStorage(nextList);
    } else {
      const newTpl: PromptTemplate = {
        id: `custom-${Date.now()}`,
        title: formTitle,
        structure: formStructure,
        description: formDescription || "Plantilla personalizada del usuario",
        category: formCategory,
        tags: parsedTags.length > 0 ? parsedTags : ["Personalizado"],
        isCustom: true,
        createdDate: new Date().toLocaleDateString(),
      };
      const nextList = [newTpl, ...templates];
      setTemplates(nextList);
      saveCustomTemplatesToStorage(nextList);
    }

    // Reset Form
    setEditingTemplateId(null);
    setFormTitle("");
    setFormStructure("");
    setFormDescription("");
    setFormCategory("Personalizados");
    setFormTags("");
    setActiveTab("library");
  };

  const handleDeleteCustom = (id: string) => {
    const nextList = templates.filter((t) => t.id !== id);
    setTemplates(nextList);
    saveCustomTemplatesToStorage(nextList);
  };

  const handleEditClick = (tpl: PromptTemplate) => {
    setEditingTemplateId(tpl.id);
    setFormTitle(tpl.title);
    setFormStructure(tpl.structure);
    setFormDescription(tpl.description);
    setFormCategory(tpl.category);
    setFormTags(tpl.tags.join(", "));
    setActiveTab("create");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `syntergic_prompt_templates_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported: PromptTemplate[] = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Merge custom templates avoiding duplicates
          const existingIds = new Set(templates.map((t) => t.id));
          const newCustoms = imported
            .filter((t) => !existingIds.has(t.id))
            .map((t) => ({ ...t, isCustom: true }));
          const nextList = [...templates, ...newCustoms];
          setTemplates(nextList);
          saveCustomTemplatesToStorage(nextList);
        }
      } catch (err) {
        alert("Error al importar archivo JSON de plantillas.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <LayoutTemplate size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 font-mono">
                  SISTEMA DE PLANTILLAS Y SHORTCUTS
                </span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-400 text-[8px] font-mono rounded-full">
                  {templates.length} Plantillas
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Gestor Avanzado de Estructuras de Prompt
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
              title="Exportar Plantillas JSON"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <label className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all">
              <Upload size={14} />
              <span className="hidden sm:inline">Importar</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between mt-5 border-b border-white/10 pb-3 relative z-10">
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "library"
                  ? "bg-amber-400 text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers size={14} />
              Biblioteca de Plantillas
            </button>
            <button
              onClick={() => {
                setEditingTemplateId(null);
                setFormTitle("");
                setFormStructure("");
                setFormDescription("");
                setFormCategory("Personalizados");
                setFormTags("");
                setActiveTab("create");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "create"
                  ? "bg-amber-400 text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Plus size={14} />
              {editingTemplateId ? "Editar Plantilla" : "Crear Nueva Plantilla"}
            </button>
          </div>

          {activeTab === "library" && (
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por palabra, etiqueta..."
                className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
              />
            </div>
          )}
        </div>

        {/* TAB 1: LIBRARY BROWSER */}
        {activeTab === "library" && (
          <div className="mt-5 space-y-5 relative z-10">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-amber-400/20 border border-amber-400 text-amber-300 shadow"
                      : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid of Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
                  No se encontraron plantillas coincidentes.
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const tokens = parseTemplateTokens(tpl.structure);
                  return (
                    <div
                      key={tpl.id}
                      className="group relative bg-white/5 hover:bg-white/[0.07] border border-white/10 hover:border-amber-400/40 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold rounded-full uppercase">
                            {tpl.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {tpl.isCustom && (
                              <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-mono rounded-full uppercase">
                                Personalizada
                              </span>
                            )}
                            {tpl.isCustom && (
                              <>
                                <button
                                  onClick={() => handleEditClick(tpl)}
                                  className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                                  title="Editar"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustom(tpl.id)}
                                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {tpl.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>

                        {/* Structure Box */}
                        <div className="mt-3 p-3 bg-black/80 border border-white/10 rounded-2xl font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto no-scrollbar">
                          {tpl.structure}
                        </div>

                        {/* Tags & Variables */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {tokens.map((tok) => (
                            <span
                              key={tok}
                              className="px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-300 font-mono text-[9px] rounded-lg"
                            >
                              [{tok}]
                            </span>
                          ))}
                          {tpl.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-400 font-mono text-[9px] rounded-lg"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono text-zinc-500">
                          {tokens.length > 0 ? `${tokens.length} variables` : "Sin variables"}
                        </span>
                        <button
                          onClick={() => setFillTemplate(tpl)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow transition-all"
                        >
                          <span>Usar Plantilla</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREATE / EDIT TEMPLATE */}
        {activeTab === "create" && (
          <form
            onSubmit={handleCreateOrUpdate}
            className="mt-5 space-y-4 max-h-[500px] overflow-y-auto pr-1 relative z-10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Título de la Plantilla *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Retrato Editorial de Alta Moda"
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Categoría
                </label>
                <select
                  value={formCategory}
                  onChange={(e) =>
                    setFormCategory(e.target.value as PromptTemplate["category"])
                  }
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                >
                  <option value="Retratos">Retratos</option>
                  <option value="Cinematográfico">Cinematográfico</option>
                  <option value="Sci-Fi & Cyberpunk">Sci-Fi & Cyberpunk</option>
                  <option value="Fotografía Producto">Fotografía Producto</option>
                  <option value="Arquitectura">Arquitectura</option>
                  <option value="Abstracto Neural">Abstracto Neural</option>
                  <option value="Personalizados">Personalizados</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Estructura del Prompt (Usa variables como [sujeto], [iluminación], [estilo]) *
                </label>
              </div>
              <textarea
                required
                rows={4}
                value={formStructure}
                onChange={(e) => setFormStructure(e.target.value)}
                placeholder="A high fashion photograph of [subject], wearing [outfit], illuminated by [lighting], shot on 35mm film, [color_tone]"
                className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-2xl p-4 text-xs text-amber-200 placeholder-zinc-600 outline-none font-mono resize-none"
              />
              <span className="text-[9px] font-mono text-zinc-500">
                Tip: Todo lo encerrado en corchetes ej: <code className="text-amber-400">[variable]</code> se convertirá automáticamente en un campo interactivo para el usuario.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                Descripción Corta
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe brevemente el uso o estilo de esta estructura..."
                className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                Etiquetas (Separadas por comas)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="Moda, Retrato, Editorial, Cine"
                className="w-full bg-black/60 border border-white/10 focus:border-amber-400/50 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
              />
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <Check size={14} />
                <span>{editingTemplateId ? "Guardar Cambios" : "Crear Plantilla"}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Fill Modal if selected from manager */}
      {fillTemplate && (
        <PromptTemplateFillModal
          template={fillTemplate}
          currentPrompt={currentPrompt}
          onClose={() => setFillTemplate(null)}
          onInject={(text, mode) => {
            onInjectPrompt(text, mode);
            setFillTemplate(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
