import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { starterMonthlyPriceUsd } from '@/config/gamePlanStarters';

const HERO_FEATURED_GAMES = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    tagline: 'Build, explore, survive',
    image:
      'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg',
    href: '/configure/minecraft',
  },
  {
    id: 'rust',
    name: 'Rust',
    tagline: 'Survival multiplayer',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
    href: '/configure/rust',
  },
  {
    id: 'palworld',
    name: 'Palworld',
    tagline: 'Creature survival',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg',
    href: '/configure/palworld',
  },
] as const;

function heroPriceLabel(gameId: string): string {
  const p = starterMonthlyPriceUsd(gameId);
  return p != null ? `From $${p.toFixed(2)}/mo` : 'Plans on Deploy';
}

const HeroSection = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-14 items-center">
        {/* Left Column - Hero Content */}
          <div className="space-y-8">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="bg-gray-900/95 text-emerald-400 px-4 py-2 rounded-full text-base font-medium border border-emerald-500/30">
                Game Server Hosting
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent">
                High-Performance Game Servers On Demand
              </span>
            </h1>
            
            <p className="inline-block text-xl text-gray-100 leading-relaxed max-w-xl px-4 py-3 rounded-2xl border border-gray-800/80 bg-black/55 backdrop-blur-sm">
              Deploy your custom game server in seconds. Premium hardware, instant setup, and 24/7 support for the ultimate gaming experience.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/deploy"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl text-center"
            >
              Deploy Your Server
            </Link>
            <Link
              to="/about"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 border border-gray-600/50 hover:border-emerald-500/50 text-center"
            >
              Learn More
            </Link>
          </div>

          {/* Server Stats */}
          <div className="flex items-center space-x-4 pt-4">
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <div className="flex space-x-1">
                {[1,2,3,4].map((dot) => (
                  <div key={dot} className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                ))}
              </div>
              <span className="text-white font-medium">+2,000 active servers</span>
            </div>
            <span className="text-gray-200 text-base">—</span>
            <span className="text-white font-medium">Excellent</span>
          </div>

          <Link
            to="/how-to#streamers-directory"
            className="block rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-r from-emerald-600/20 via-gray-900/90 to-blue-900/30 px-6 py-6 shadow-xl hover:border-emerald-300/60 hover:from-emerald-500/25 hover:to-blue-800/35 transition-all"
          >
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit items-center rounded-full border border-emerald-400/35 bg-black/35 px-3 py-1 text-sm font-semibold text-emerald-300">
                Start Here
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                New to GIVRwrld? Read the full user guide before you deploy.
              </h2>
              <p className="text-base sm:text-lg text-gray-100 leading-relaxed max-w-2xl">
                Learn every major feature we offer, how the dashboard works, how to manage servers, and how
                streamer pages fit together with <span className="text-white font-medium">Stream Station</span> and
                the <span className="text-white font-medium">/streamers</span> discovery directory.
              </p>
              <div className="inline-flex items-center text-emerald-300 font-semibold text-base">
                Open the guide
              </div>
            </div>
          </Link>
        </div>

        {/* Right column: three featured games (larger for visibility) */}
        <div className="flex items-center justify-center lg:justify-end w-full">
          <div className="relative w-full max-w-xl lg:max-w-2xl xl:max-w-[42rem] rounded-2xl border border-gray-700/60 bg-gradient-to-br from-emerald-900/20 via-gray-900/92 to-gray-950 p-6 sm:p-8 lg:p-9 shadow-xl shadow-black/30 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" aria-hidden />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" aria-hidden />
            <div className="relative space-y-5">
              <div className="text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400/90">Featured titles</p>
                <p className="text-base text-gray-400 mt-1.5 max-w-xl">
                  Jump straight into configure — full catalog and pricing on Deploy.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {HERO_FEATURED_GAMES.map((game) => (
                  <Link
                    key={game.id}
                    to={game.href}
                    className="group flex flex-col rounded-xl border border-gray-700/70 bg-black/40 overflow-hidden hover:border-emerald-500/45 hover:shadow-lg hover:shadow-emerald-900/20 transition-all duration-300 min-w-0"
                  >
                    <div className="relative h-32 sm:h-40 lg:h-44 overflow-hidden">
                      <img
                        src={game.image}
                        alt=""
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                    </div>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                      <p className="text-base sm:text-lg font-bold text-white leading-tight truncate">{game.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{game.tagline}</p>
                      <p className="text-xs sm:text-sm font-medium text-emerald-400/95 mt-auto pt-2">
                        {heroPriceLabel(game.id)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex justify-center lg:justify-start pt-1">
                <Link
                  to="/deploy"
                  className="inline-flex items-center justify-center bg-emerald-600/90 hover:bg-emerald-500 text-white text-base font-semibold px-6 py-3 rounded-lg border border-emerald-500/40 transition-colors"
                >
                  Browse all games
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
