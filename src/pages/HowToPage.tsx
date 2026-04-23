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
} from "lucide-react";

const featureCards = [
  {
    icon: Gamepad2,
    title: "Game server hosting",
    body: "Deploy supported games, choose a plan, and manage your server from the GIVRwrld dashboard.",
  },
  {
    icon: Radio,
    title: "Streamer pages",
    body: "Turn on a public page for your server, connect Twitch or Kick, and share a branded page for your community. Others can browse you from /streamers.",
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
  "Visit /streamers to browse the public directory of creators with a GIVRwrld-hosted server page.",
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
            id="streamers-directory"
            className="rounded-2xl border border-emerald-500/30 bg-gray-900/92 p-6 sm:p-8 shadow-xl mb-8 scroll-mt-24"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-3">
                  <Radio size={14} />
                  Streamers
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">The /streamers discovery page</h2>
                <p className="text-sm sm:text-base text-gray-200 max-w-3xl leading-relaxed">
                  <span className="text-white font-medium">/streamers</span> lists everyone who turned on a public
                  streamer page and linked Twitch or Kick. Each card shows live-ish status, game, player counts, and
                  links to <span className="text-white font-medium">watch on Twitch or Kick</span> and{' '}
                  <span className="text-white font-medium">view the public server page</span> on GIVRwrld. Full viewing
                  stays on the stream platform; GIVRwrld is the discovery layer for your community server.
                </p>
              </div>
              <Link
                to="/streamers"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Open /streamers
                <ExternalLink size={16} />
              </Link>
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
