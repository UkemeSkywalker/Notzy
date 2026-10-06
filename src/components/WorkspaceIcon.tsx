import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  ChartLine,
  Code,
  Coffee,
  DollarSign,
  Dumbbell,
  Film,
  Flame,
  Folder,
  FolderOpen,
  Gamepad2,
  Globe,
  GraduationCap,
  Hash,
  Heart,
  House,
  Leaf,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Mic,
  Music,
  Palette,
  PenTool,
  Plane,
  Presentation,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Tv,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Workspace } from "../types";

/** Pickable workspace icons, keyed by the value stored in `Workspace.icon`. */
export const WORKSPACE_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  hash: Hash,
  briefcase: Briefcase,
  rocket: Rocket,
  code: Code,
  lightbulb: Lightbulb,
  target: Target,
  chart: ChartLine,
  dollar: DollarSign,
  megaphone: Megaphone,
  presentation: Presentation,
  mic: Mic,
  message: MessageSquare,
  users: Users,
  calendar: Calendar,
  book: BookOpen,
  school: GraduationCap,
  pen: PenTool,
  palette: Palette,
  camera: Camera,
  film: Film,
  tv: Tv,
  music: Music,
  gamepad: Gamepad2,
  globe: Globe,
  plane: Plane,
  home: House,
  shopping: ShoppingBag,
  leaf: Leaf,
  coffee: Coffee,
  fitness: Dumbbell,
  heart: Heart,
  star: Star,
  flame: Flame,
  sparkles: Sparkles,
};

/** Tile colors, keyed by the value stored in `Workspace.color`. */
export const WORKSPACE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  slate: "bg-slate-500",
};

const ROTATION = ["emerald", "orange", "amber", "violet", "sky", "rose"];

/** Color a new workspace gets until the user picks one. */
export function defaultWorkspaceColor(index: number): string {
  return ROTATION[index % ROTATION.length];
}

type Visual = { tile: string } & ({ Icon: LucideIcon; emoji?: undefined } | { Icon?: undefined; emoji: string });

/**
 * Resolve how a workspace looks. Workspaces created before the icon picker
 * stored "#", an emoji, or nothing meaningful, and got a color from their
 * position — those keep their old look until the user picks something.
 */
export function workspaceVisual(ws: Workspace, index: number): Visual {
  const legacyColor = WORKSPACE_COLORS[defaultWorkspaceColor(index)];
  const tile = (ws.color && WORKSPACE_COLORS[ws.color]) || undefined;
  if (WORKSPACE_ICONS[ws.icon]) return { Icon: WORKSPACE_ICONS[ws.icon], tile: tile ?? legacyColor };
  // A stored color means the user picked through the picker: their emoji wins
  // over the name-based guesses below, which exist only for older workspaces.
  if (ws.color && ws.icon) return { emoji: ws.icon, tile: "bg-black/[0.06]" };

  const name = ws.name.toLowerCase();
  if (ws.icon === "#" || name.includes("cansaas")) return { Icon: Hash, tile: tile ?? "bg-emerald-500" };
  if (ws.icon === "📣" || name.includes("marketing")) return { Icon: Megaphone, tile: tile ?? "bg-orange-500" };
  if (ws.icon === "🌱" || name.includes("garden")) return { Icon: Leaf, tile: tile ?? "bg-amber-500" };
  if (ws.icon === "💬" || name.includes("social")) return { Icon: MessageSquare, tile: tile ?? "bg-violet-500" };
  if (ws.icon && ws.icon !== "📁") return { emoji: ws.icon, tile: "bg-black/[0.06]" };
  return { Icon: FolderOpen, tile: tile ?? legacyColor };
}

/** The small rounded icon tile used in the sidebar and settings. */
export function WorkspaceTile({ ws, index, className = "" }: { ws: Workspace; index: number; className?: string }) {
  const v = workspaceVisual(ws, index);
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] ${v.tile} ${className}`}>
      {v.Icon ? (
        <v.Icon size={12} className="text-white" strokeWidth={2.5} />
      ) : (
        <span className="text-[12px] leading-none">{v.emoji}</span>
      )}
    </span>
  );
}

function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  // Grapheme-aware so multi-codepoint emoji (flags, skin tones, 👩‍💻) stay whole.
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (locale: undefined, opts: { granularity: "grapheme" }) => {
        segment: (s: string) => Iterable<{ segment: string }>;
      };
    }
  ).Segmenter;
  if (Segmenter) {
    for (const { segment } of new Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)) return segment;
  }
  return Array.from(trimmed)[0] ?? "";
}

/**
 * Icon + color picker. Every click is applied right away through `onChange`.
 * Mouse-downs on buttons don't steal focus, so it can sit next to a text
 * input (the new-workspace name) without blurring it.
 */
export function WorkspaceIconPicker({
  icon,
  color,
  onChange,
  onClose,
}: {
  icon: string;
  color: string;
  onChange: (next: { icon: string; color: string }) => void;
  /** When set, clicks outside the picker and Escape call it. */
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [emojiDraft, setEmojiDraft] = useState(WORKSPACE_ICONS[icon] ? "" : icon);
  const tile = WORKSPACE_COLORS[color] ?? WORKSPACE_COLORS.emerald;

  useEffect(() => {
    if (!onClose) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl border border-black/[0.06] bg-white p-2 shadow-lg"
    >
      <div className="grid grid-cols-7 gap-1">
        {Object.entries(WORKSPACE_ICONS).map(([key, Icon]) => {
          const selected = key === icon;
          return (
            <button
              key={key}
              type="button"
              title={key}
              aria-label={`Icon: ${key}`}
              aria-pressed={selected}
              onClick={() => {
                setEmojiDraft("");
                onChange({ icon: key, color });
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                selected ? `${tile} text-white` : "text-slate-500 hover:bg-black/[0.06] hover:text-slate-800"
              }`}
            >
              <Icon size={14} strokeWidth={2.25} />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/[0.06] pt-2">
        {Object.entries(WORKSPACE_COLORS).map(([key, cls]) => (
          <button
            key={key}
            type="button"
            title={key}
            aria-label={`Color: ${key}`}
            aria-pressed={key === color}
            onClick={() => onChange({ icon, color: key })}
            className={`h-4 w-4 rounded-full ${cls} transition hover:scale-110 ${
              key === color ? "ring-2 ring-slate-400 ring-offset-1" : ""
            }`}
          />
        ))}
      </div>

      <label className="mt-2 flex items-center gap-2 border-t border-black/[0.06] pt-2 text-[11.5px] text-slate-400">
        Or an emoji
        <input
          value={emojiDraft}
          placeholder="🚀"
          onChange={(e) => {
            const emoji = firstGrapheme(e.target.value);
            setEmojiDraft(emoji);
            if (emoji) onChange({ icon: emoji, color });
          }}
          className="w-12 rounded-md border border-black/10 px-1.5 py-0.5 text-center text-[14px] text-slate-700 outline-none focus:border-slate-400"
        />
      </label>
    </div>
  );
}
