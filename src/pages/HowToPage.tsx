import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Rocket,
  Gamepad2,
  CreditCard,
  MessageCircle,
  Radio,
  Shield,
  Users,
  ExternalLink,
  CheckCircle2,
  Clapperboard,
  Sparkles,
} from "lucide-react";

const featureCards = [
  {
    icon: Gamepad2,
    title: "Game server hosting",
    body: "Deploy supported games, choose a plan, and manage your server from the GIVRwrld dashboard.",
  },
  {
    icon: Radio,
    title: "Streamer pages & Stream Station",
    body: "Enable a public server page, connect Twitch or Kick, then use /streamers (Stream Station) for the creator workspace and the discovery grid below it.",
  },
  {
    icon: CreditCard,
    title: "Billing and orders",
    body: "Review purchased services, billing information, and order history from your account area.",
  },
  {
    icon: MessageCircle,
    title: "Support and community",
    body: "Use support tools, Discord, and FAQ resources when you need help or want to stay connected.",
  },
  {
    icon: Users,
    title: "Affiliate tools",
    body: "Track referral activity and review your affiliate area if you are using GIVRwrld to promote sales.",
  },
  {
    icon: Shield,
    title: "Admin controls",
    body: "Admins can access metrics and ticket tools from the dedicated admin area.",
  },
];

const quickSteps = [
  "Create your account and sign in.",
  "Open Deploy and choose the game you want to host.",
  "Select a plan, term, and complete checkout.",
  "Go to your dashboard and open Game Panel to manage the server.",
  "Use the server settings tab to enable a public streamer page if you want to promote it.",
  "Open /streamers for Stream Station: use the left nav and onboarding card for workflows, then scroll to Discover streamers for the public directory.",
];

const dashboardSections = [
  {
    title: "Overview",
    body: "Your main account landing page with account stats and shortcuts into the platform.",
  },
  {
    title: "Game Panel",
    body: "Where you manage purchased game servers, open server details, and control the server lifecycle.",
  },
  {
    title: "Billing",
    body: "Your account billing area for plans, invoices, and order-related payment information.",
  },
  {
    title: "Support",
    body: "The place to review support-related account activity and get help when something goes wrong.",
  },
  {
    title: "Affiliate",
    body: "Your referral-focused area for partnership and affiliate tracking.",
  },
  {
    title: "Settings",
    body: "Your account settings and profile-level controls.",
  },
  {
    title: "Admin",
    body: "Visible only to admin users for metrics and support operations.",
  },
];

const serverFeatures = [
  "Power controls to start, stop, kill, or restart your server.",
  "Live status, player counts, and metrics visibility.",
  "Console and management tabs inside the Game Panel.",
  "Public Page settings for streamer name, slug, platform, stream channel, and Discord link.",
  "Public server page at `/server/:slug` for sharing your community and stream.",
  "Streamer discovery page at `/streamers` so people can browse creators using GIVRwrld servers.",
];

const HowToPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/78 via-gray-900/62 to-gray-900/82" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/15 via-transparent to-blue-900/10" />
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
          </div>

          <section className="rounded-2xl border border-emerald-500/25 bg-gray-900/92 p-6 sm:p-8 shadow-xl mb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black/40 px-4 py-2 text-sm font-medium text-emerald-300 mb-4">
                  <BookOpen size={16} />
                  GIVRwrld User Guide
                </div>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  Learn how to use GIVRwrld from signup to server management
                </h1>
                <p className="mt-4 text-base sm:text-lg text-gray-200 leading-relaxed">
                  This page explains what GIVRwrld offers, how the app is laid out, and how to use each major
                  feature without guessing where anything lives.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/deploy"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Start Deploying
                  <Rocket size={16} />
                </Link>
                <Link
                  to="/streamers"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 bg-black/35 px-5 py-3 text-sm font-semibold text-gray-100 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Browse Streamers
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2 mb-8">
            <div className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-white mb-4">Quick Start</h2>
              <div className="space-y-4">
                {quickSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300 border border-emerald-500/30">
                      {index + 1}
                    </div>
                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-white mb-4">What GIVRwrld Offers</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureCards.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-xl border border-gray-700/70 bg-black/25 p-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 mb-3">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="stream-station"
            className="rounded-2xl border border-emerald-500/30 bg-gray-900/92 p-6 sm:p-8 shadow-xl mb-8 scroll-mt-24"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-3">
                  <Clapperboard size={14} />
                  Stream Station
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  How the /streamers page is laid out
                </h2>
                <p className="text-sm sm:text-base text-gray-200 max-w-3xl leading-relaxed">
                  The top of <span className="text-white font-medium">/streamers</span> is the Stream Station
                  workspace — the same structure you see after signing in: status chips, quick actions, live feed
                  preview, signal summary, and the &quot;Tell us what you&apos;re here for&quot; onboarding block.
                  The <span className="text-white font-medium">Discover streamers</span> section on that same page
                  is the public directory of GIVRwrld-hosted creators.
                </p>
              </div>
              <Link
                to="/streamers"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Open Stream Station
                <ExternalLink size={16} />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-gray-700/70 bg-black/30 p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-300" />
                  Left navigation
                </h3>
                <ul className="space-y-2 text-sm text-gray-200 leading-relaxed list-disc pl-5">
                  <li>
                    <span className="text-white font-medium">Home</span> — workspace overview, feed, and onboarding
                    status.
                  </li>
                  <li>
                    <span className="text-white font-medium">Library</span> — where long sessions and imported VODs
                    will land once linked accounts sync.
                  </li>
                  <li>
                    <span className="text-white font-medium">Edits</span> — vertical layouts, captions, and short-form
                    polish (planned tooling hooks here).
                  </li>
                  <li>
                    <span className="text-white font-medium">Publisher</span> — schedule and push clips to the
                    channels you care about.
                  </li>
                  <li>
                    <span className="text-white font-medium">Connections</span> — link Twitch, YouTube, Kick, or
                    TikTok; mirrors what you set on your server&apos;s public page for discovery.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-700/70 bg-black/30 p-5">
                <h3 className="text-lg font-semibold text-white mb-3">Top bar &amp; main panels</h3>
                <ul className="space-y-2 text-sm text-gray-200 leading-relaxed list-disc pl-5">
                  <li>
                    <span className="text-white font-medium">FREE / GO PRO</span> — plan tier for future clip and
                    publish limits (workspace loads even on the free tier).
                  </li>
                  <li>
                    <span className="text-white font-medium">Linked</span> — shows which platforms are connected;
                    connect at least one to drive the live feed and Today&apos;s signal widgets.
                  </li>
                  <li>
                    <span className="text-white font-medium">Live feed</span> — preview the primary linked channel;
                    full viewing stays on Twitch or Kick.
                  </li>
                  <li>
                    <span className="text-white font-medium">Today&apos;s signal</span> — lightweight analytics from
                    your linked accounts once data is flowing.
                  </li>
                  <li>
                    Scroll past Stream Station for <span className="text-white font-medium">Discover streamers</span>{' '}
                    — cards for every public GIVRwrld server page with watch links.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">How the App Is Laid Out</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboardSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-gray-700/70 bg-black/25 p-4">
                  <h3 className="text-base font-semibold text-white mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-white mb-4">Server Features You Can Use</h2>
              <div className="space-y-3">
                {serverFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/25 bg-gray-900/92 p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-white mb-4">Best Way To Use It</h2>
              <div className="space-y-4 text-sm sm:text-base text-gray-200 leading-relaxed">
                <p>
                  Use GIVRwrld to discover servers, deploy hosting, manage your account, and promote your game
                  server community.
                </p>
                <p>
                  Use your server details page to control the server and configure its public streamer page.
                </p>
                <p>
                  Use the public streamer page as your branded landing page, and use Twitch or Kick as the main
                  place viewers actually watch the stream.
                </p>
                <p>
                  When in doubt, start in the dashboard, then open Game Panel for anything server-specific.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Open Dashboard
                </Link>
                <Link
                  to="/faq"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 bg-black/35 px-5 py-3 text-sm font-semibold text-gray-100 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Read FAQ
                </Link>
                <Link
                  to="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 bg-black/35 px-5 py-3 text-sm font-semibold text-gray-100 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HowToPage;
