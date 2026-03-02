import React, { useState } from 'react';
import {
  Zap,
  Layers,
  MousePointer,
  Server,
  Shield,
  Headphones,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  getGameTransparencyContent,
  type TransparencyFeature,
} from '@/config/gameTransparencyContent';

const PANEL_BLURB =
  'Our game panel gives you full control: start/stop/restart, file manager, console, and one-click installs where available. Manage your server from anywhere with a simple, fast interface.';

const ICON_MAP = {
  plugin: Zap,
  version: Layers,
  mod: MousePointer,
  panel: Server,
  backup: Shield,
  support: Headphones,
};

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  accentClass: string;
};

function AccordionItem({ title, children, open, onToggle, accentClass }: AccordionItemProps) {
  return (
    <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/95 shadow-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left font-semibold text-white text-base hover:bg-gray-700/60 transition-colors"
      >
        <span className="text-base">{title}</span>
        <ChevronDown
          className={`w-6 h-6 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${accentClass}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 bg-gray-800/95">
          <div className="text-gray-100 text-base leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
}

const ACCENT_CLASSES: Record<string, { text: string; border: string; bg: string }> = {
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
  orange: { text: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10' },
  blue: { text: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10' },
  cyan: { text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/10' },
  amber: { text: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/10' },
  violet: { text: 'text-violet-400', border: 'border-violet-500/50', bg: 'bg-violet-500/10' },
  rose: { text: 'text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-500/10' },
  lime: { text: 'text-lime-400', border: 'border-lime-500/50', bg: 'bg-lime-500/10' },
  sky: { text: 'text-sky-400', border: 'border-sky-500/50', bg: 'bg-sky-500/10' },
  stone: { text: 'text-stone-400', border: 'border-stone-500/50', bg: 'bg-stone-500/10' },
};

type GameTransparencySectionProps = {
  gameSlug: string;
  accentColor?: keyof typeof ACCENT_CLASSES;
};

export function GameTransparencySection({
  gameSlug,
  accentColor = 'emerald',
}: GameTransparencySectionProps) {
  const content = getGameTransparencyContent(gameSlug);
  const [openStep, setOpenStep] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number>(0);

  if (!content) return null;

  const accent = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.emerald;

  return (
    <section className="mt-16 pt-12 border-t border-gray-600/50">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 drop-shadow-sm">
        What you get with {content.gameName} hosting
      </h2>

      {/* Key features */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        {content.features.map((f: TransparencyFeature, i: number) => {
          const Icon = ICON_MAP[f.icon] || Server;
          return (
            <div
              key={i}
              className={`rounded-xl p-6 border ${accent.border} bg-gray-800/95 backdrop-blur-md shadow-lg`}
            >
              <Icon className={`w-8 h-8 mb-3 ${accent.text}`} />
              <h3 className="font-semibold text-white mb-2 text-lg">{f.title}</h3>
              <p className="text-gray-100 text-base leading-relaxed">{f.description}</p>
            </div>
          );
        })}
      </div>

      {/* Our panel */}
      <div className={`rounded-xl p-6 border ${accent.border} bg-gray-800/95 backdrop-blur-md shadow-lg mb-12`}>
        <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-lg">
          <Server className={`w-5 h-5 ${accent.text}`} />
          Our panel
        </h3>
        <p className="text-gray-100 text-base leading-relaxed">{PANEL_BLURB}</p>
      </div>

      {/* Supported software / modpacks */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">{content.supportedTitle}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {content.supportedItems.map((item, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${accent.border} bg-gray-800/95 text-base text-gray-100 font-medium`}
            >
              <Check className={`w-4 h-4 shrink-0 ${accent.text}`} />
              {item}
            </span>
          ))}
        </div>
        <div className="rounded-lg bg-gray-800/95 px-4 py-3 border border-gray-600/60">
          <p className="text-gray-100 text-base leading-relaxed">{content.supportedBlurb}</p>
        </div>
      </div>

      {/* How to set up */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">
          How to set up a {content.gameName} server
        </h3>
        <div className="space-y-2">
          {content.setupSteps.map((step, i) => (
            <AccordionItem
              key={i}
              title={`Step ${i + 1}: ${step.title}`}
              open={openStep === i}
              onToggle={() => setOpenStep(openStep === i ? -1 : i)}
              accentClass={accent.text}
            >
              {step.body}
            </AccordionItem>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Frequently asked questions</h3>
        <div className="space-y-2">
          {content.faq.map((item, i) => (
            <AccordionItem
              key={i}
              title={item.question}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              accentClass={accent.text}
            >
              {item.answer}
            </AccordionItem>
          ))}
        </div>
      </div>

      {/* What is X hosting? */}
      <div className={`rounded-xl p-6 border ${accent.border} bg-gray-800/95 backdrop-blur-md shadow-lg`}>
        <h3 className="font-semibold text-white mb-4 text-lg">
          What is {content.gameName} hosting?
        </h3>
        <div className="space-y-3 text-gray-100 text-base leading-relaxed">
          {content.whatIsHosting.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GameTransparencySection;
