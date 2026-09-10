import {
  Atom,
  Award,
  Backpack,
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  ClipboardList,
  FlaskConical,
  Globe,
  GraduationCap,
  Library,
  Microscope,
  Notebook,
  Pencil,
  Presentation,
  Ruler,
} from "lucide-react";

// Education vocabulary that reads for both a school and a university audience.
const PANEL_ICON_KINDS = [
  GraduationCap,
  BookOpen,
  Notebook,
  Pencil,
  Ruler,
  Backpack,
  Calendar,
  ClipboardList,
  BarChart3,
  Microscope,
  Atom,
  FlaskConical,
  Calculator,
  Globe,
  Library,
  Award,
  Presentation,
] as const;

// One cell per icon, not a shared row/column list: every (top, left) pair below is
// unique, which is what actually guarantees no two icons land on the same spot.
const PANEL_ICON_ROWS = [7, 21, 35, 50, 64, 78, 92];
const PANEL_ICON_COLUMNS = [12.5, 37.5, 62.5, 87.5];

// The heading and paragraph sit left-of-center, vertically centered: an icon landing there
// is forced to the background tier instead of skipped, so the panel reads as a field.
const TEXT_ZONE = { minLeft: 4, maxLeft: 55, minTop: 34, maxTop: 66 };

// Three depth tiers instead of one flat layer: a few bold foreground icons, a moderate
// middle layer, and a large low-opacity background layer that reads as texture.
const PANEL_ICON_TIERS = [
  { name: "foreground", minSize: 36, sizeRange: 10, minOpacity: 0.22, opacityRange: 0.064, strokeWidth: 2.5 },
  { name: "middle", minSize: 26, sizeRange: 8, minOpacity: 0.12, opacityRange: 0.048, strokeWidth: 2 },
  { name: "background", minSize: 42, sizeRange: 12, minOpacity: 0.04, opacityRange: 0.016, strokeWidth: 1.25 },
] as const;

// Row pitch ~14% of panel height (~102px at the 1280x720 desktop breakpoint the E2E
// suite captures), column pitch 25% (~164px). The largest tier tops out at 53px, so even
// worst-case jitter plus the 6px drift leaves >25px of clear space between neighbours —
// verified by hand, not assumed, because a bold field is worthless if icons touch.
interface PanelIcon {
  readonly id: string;
  readonly Icon: (typeof PANEL_ICON_KINDS)[number];
  readonly top: number;
  readonly left: number;
  readonly size: number;
  readonly rotation: number;
  readonly opacity: number;
  readonly strokeWidth: number;
  readonly delay: string;
}

const PANEL_ICONS: readonly PanelIcon[] = PANEL_ICON_ROWS.flatMap((row, rowIndex) =>
  PANEL_ICON_COLUMNS.map((column, columnIndex) => {
    const index = rowIndex * PANEL_ICON_COLUMNS.length + columnIndex;

    // Small deterministic jitter so the grid doesn't read as a lattice, kept well inside
    // the per-cell margin computed above.
    const top = row + ((((index * 29) % 5) - 2) * 0.6);
    const left = column + ((((index * 13) % 7) - 3) * 0.7);

    const inTextZone =
      left >= TEXT_ZONE.minLeft &&
      left <= TEXT_ZONE.maxLeft &&
      top >= TEXT_ZONE.minTop &&
      top <= TEXT_ZONE.maxTop;

    // Only foreground/middle icons outside the text zone compete for the eye;
    // anything over the wordmark or paragraph is forced into the quiet background tier.
    const tier = inTextZone ? PANEL_ICON_TIERS[2] : PANEL_ICON_TIERS[index % 3];

    return {
      id: `panel-icon-${index}`,
      Icon: PANEL_ICON_KINDS[index % PANEL_ICON_KINDS.length],
      top,
      left,
      size: tier.minSize + ((index * 7) % tier.sizeRange),
      rotation: (((index * 47) % 7) - 3) * 12,
      opacity: tier.minOpacity + ((index * 3) % 5) * (tier.opacityRange / 5),
      strokeWidth: tier.strokeWidth,
      delay: `${(index % 6) * 1.4}s`,
    };
  }),
);

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1">
      <aside className="relative isolate flex h-44 flex-col justify-end overflow-hidden bg-brand-950 px-6 pb-7 sm:h-52 sm:px-10 lg:h-auto lg:justify-center lg:px-16 lg:py-20">
        <style>{`
          @keyframes auth-panel-drift {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-24 size-[26rem] sm:size-[32rem] lg:-top-20 lg:-right-40 lg:size-[46rem]"
        >
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[13%] rounded-full border border-white/10" />
          <div className="absolute inset-[27%] rounded-full border border-white/[0.07]" />
          <div className="absolute inset-[41%] rounded-full border border-white/[0.05]" />
          <div className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_240deg,var(--color-brand-500)_360deg)] opacity-25 [animation-duration:9s] motion-reduce:animate-none" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-500/20 blur-3xl"
        />

        {/* Hidden below lg: the panel itself already renders at mobile widths, but these icons cost nothing there. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {PANEL_ICONS.map(({ id, Icon, top, left, size, rotation, opacity, strokeWidth, delay }) => (
            <div
              key={id}
              className="absolute"
              style={{ top: `${top}%`, left: `${left}%`, transform: `rotate(${rotation}deg)` }}
            >
              <Icon
                size={size}
                strokeWidth={strokeWidth}
                className="animate-[auth-panel-drift_10s_ease-in-out_infinite] text-white motion-reduce:animate-none"
                style={{ opacity, animationDelay: delay }}
              />
            </div>
          ))}
        </div>

        <div className="relative max-w-md">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Radarge</span>
          <p className="mt-1 text-sm font-medium text-brand-200">Gestão Escolar</p>
          <p className="mt-5 hidden text-sm leading-relaxed text-white/60 lg:block">
            Chamada rápida no celular para os professores. Frequência, absenteísmo e desempenho em
            painéis para a coordenação.
          </p>
        </div>
      </aside>

      <main className="flex items-start justify-center px-6 pt-12 pb-16 sm:px-10 lg:items-center lg:py-20">
        {children}
      </main>
    </div>
  );
}
