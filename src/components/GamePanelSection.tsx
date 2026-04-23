import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Terminal, FolderOpen, Activity } from 'lucide-react';

/**
 * Home-page block highlighting the customer game panel (console, files, metrics).
 * Visual is an abstract mockup aligned with site emerald accents — not a third-party screenshot.
 */
const GamePanelSection = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <div className="rounded-3xl border border-gray-800/90 bg-[#070714]/85 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center p-8 sm:p-10 lg:p-14">
          {/* Panel mockup — left on large screens */}
          <div className="order-2 lg:order-1 relative flex justify-center lg:justify-start perspective-[1400px]">
            <div
              className="absolute -left-8 top-1/4 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"
              aria-hidden
            />
            <div
              className="absolute right-0 bottom-8 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
              aria-hidden
            />

            <div
              className="relative w-full max-w-md transition-transform duration-500 ease-out will-change-transform max-lg:hover:scale-[1.01] lg:[transform:perspective(1200px)_rotateY(-7deg)_rotateX(3deg)] lg:hover:[transform:perspective(1200px)_rotateY(-4deg)_rotateX(2deg)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="rounded-xl border border-gray-700/80 bg-gray-950 shadow-2xl shadow-emerald-950/20 overflow-hidden ring-1 ring-white/5">
                {/* Top bar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/90 bg-gray-900/95">
                  <span className="text-xs font-bold tracking-wide text-white">
                    GIVR<span className="text-emerald-400">wrld</span>
                  </span>
                  <div className="flex-1 h-7 rounded-md bg-gray-800/80 border border-gray-700/50 flex items-center px-3 text-[10px] text-gray-500">
                    Search servers…
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div className="flex min-h-[220px] sm:min-h-[260px]">
                  {/* Sidebar */}
                  <div className="w-14 sm:w-16 shrink-0 border-r border-gray-800/90 bg-gray-900/80 py-4 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-800/60 border border-transparent flex items-center justify-center text-gray-500">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-800/60 flex items-center justify-center text-gray-500">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Main */}
                  <div className="flex-1 p-4 sm:p-5 space-y-4 bg-gradient-to-b from-gray-950 to-gray-900/95">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Overview</p>
                        <p className="text-sm font-semibold text-white mt-0.5">Your game server</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Online
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {['CPU', 'Memory'].map((label) => (
                        <div
                          key={label}
                          className="rounded-lg border border-gray-800/80 bg-gray-900/60 p-3"
                        >
                          <p className="text-[10px] text-gray-500 mb-2">{label}</p>
                          <div className="flex items-end gap-0.5 h-10">
                            {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-sm bg-emerald-500/40 min-w-[3px]"
                                style={{ height: `${h}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-dashed border-gray-700/60 bg-gray-900/40 p-3 text-[11px] text-gray-500 font-mono leading-relaxed">
                      <span className="text-emerald-500/90">$</span> Server ready — console and file manager one click away
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Our panel
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed max-w-xl mx-auto lg:mx-0">
              We run infrastructure close to players worldwide so your server stays responsive. The same care goes into
              how you actually manage the machine day to day.
            </p>
            <div>
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">Game server control</h3>
              <p className="text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Your panel is built around real workflows: start and stop cleanly, open a live console, browse files,
                and handle power users and first-time hosts alike — without living in SSH.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Link
                to="/deploy"
                className="inline-flex justify-center items-center bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-emerald-500/20"
              >
                See hosting plans
              </Link>
              <Link
                to="/dashboard/services"
                className="inline-flex justify-center items-center border border-gray-600/70 hover:border-emerald-500/50 bg-gray-900/60 hover:bg-gray-800/80 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Open panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GamePanelSection;
