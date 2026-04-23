import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Smartphone, Sparkles, CalendarClock, Mic } from 'lucide-react';

/**
 * Home-page block for Stream Station (clips, vertical edits, publishing) —
 * styled like GamePanelSection; abstract UI mockup (not a live screenshot).
 */
const StreamStationSection = () => {
  const tiles = [
    { icon: Film, label: 'AI highlights', sub: 'Moments from long VODs' },
    { icon: Smartphone, label: 'Vertical', sub: 'Shorts · Reels · TikTok' },
    { icon: Sparkles, label: 'Polish', sub: 'Captions & pacing' },
    { icon: CalendarClock, label: 'Publish', sub: 'Schedule drops' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <div className="rounded-3xl border border-gray-800/90 bg-[#05050f]/90 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center p-8 sm:p-10 lg:p-14">
          {/* Copy — left on desktop */}
          <div className="space-y-6 text-center lg:text-left order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Creators</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">Stream Station</h2>
            <p className="text-lg text-gray-200 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Clip long sessions, polish for short-form, and publish to every channel you care about — in one workspace
              built for GIVRwrld creators.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto lg:mx-0 text-left">
              {tiles.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-800/80 bg-gray-950/60 px-4 py-3 flex gap-3 items-start hover:border-emerald-500/35 transition-colors"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-400" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Link
                to="/streamers"
                className="inline-flex justify-center items-center bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-emerald-500/20"
              >
                Explore Stream Station
              </Link>
              <Link
                to="/how-to"
                className="inline-flex justify-center items-center border border-gray-600/70 hover:border-emerald-500/50 bg-gray-900/60 hover:bg-gray-800/80 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Creator how-to
              </Link>
            </div>
          </div>

          {/* Mockup — right on desktop */}
          <div className="order-2 relative flex justify-center lg:justify-end perspective-[1400px]">
            <div className="absolute -right-4 top-0 w-44 h-44 rounded-full bg-emerald-500/12 blur-3xl pointer-events-none" aria-hidden />
            <div className="absolute left-0 bottom-6 w-36 h-36 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" aria-hidden />

            <div
              className="relative w-full max-w-md transition-transform duration-500 ease-out will-change-transform max-lg:hover:scale-[1.01] lg:[transform:perspective(1200px)_rotateY(7deg)_rotateX(3deg)] lg:hover:[transform:perspective(1200px)_rotateY(4deg)_rotateX(2deg)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="rounded-xl border border-gray-700/80 bg-gray-950 shadow-2xl shadow-emerald-950/15 overflow-hidden ring-1 ring-white/5">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-800/90 bg-gray-900/95">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold tracking-wide text-white truncate">
                      GIVR<span className="text-emerald-400">wrld</span>
                    </span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 whitespace-nowrap">
                      Stream
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500 hidden sm:inline">Library · Edits · Publisher</span>
                </div>

                <div className="flex min-h-[240px] sm:min-h-[280px]">
                  <div className="w-12 shrink-0 border-r border-gray-800/90 bg-gray-900/85 py-3 flex flex-col items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/25 border border-emerald-500/50" title="Home" />
                    <div className="w-7 h-7 rounded-md bg-gray-800/50" />
                    <div className="w-7 h-7 rounded-md bg-gray-800/50" />
                    <div className="w-7 h-7 rounded-md bg-gray-800/50" />
                  </div>

                  <div className="flex-1 p-3 sm:p-4 space-y-3 bg-gradient-to-b from-gray-950 to-gray-900/95">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white">Live feed</p>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        Offline
                      </span>
                    </div>

                    <div className="rounded-lg border border-gray-800/90 bg-gray-900/50 overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-gray-800/80 to-gray-900 flex flex-col items-center justify-center gap-2 p-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-emerald-400/90" aria-hidden />
                        </div>
                        <p className="text-[10px] text-gray-500">Link Twitch, YouTube, Kick, and more</p>
                        <span className="text-[10px] font-medium text-emerald-400/90 hover:underline cursor-default">
                          Watch latest VOD
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-gray-800/80 bg-gray-900/40 px-3 py-2">
                      <div className="w-11 h-11 shrink-0 rounded-full border-2 border-gray-700 border-t-emerald-400 border-r-emerald-400/70 bg-gray-950 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                        39%
                      </div>
                      <p className="text-[10px] text-gray-400 leading-snug">
                        Prep your workspace — link a platform for VODs or import a file to start clipping.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StreamStationSection;
