import * as React from "react";

interface TwitchEmbedPlayerProps {
  channel: string;
  title?: string;
}

function getTwitchEmbedParents(): string[] {
  const configured = String(import.meta.env.VITE_TWITCH_EMBED_PARENTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const runtime = typeof window !== "undefined" ? [window.location.hostname].filter(Boolean) : [];
  const devHosts = import.meta.env.DEV ? ["localhost", "127.0.0.1"] : [];

  return Array.from(new Set([...configured, ...runtime, ...devHosts]));
}

const TwitchEmbedPlayer: React.FC<TwitchEmbedPlayerProps> = ({ channel, title = "Twitch stream" }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const parents = React.useMemo(() => getTwitchEmbedParents(), []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setError(null);

    const existing = document.getElementById("twitch-embed-api");
    const load = () => {
      container.innerHTML = "";
      // @ts-expect-error Twitch global
      if (typeof window.Twitch?.Embed !== "function") {
        setError("Twitch embed failed to load. It may be blocked by an ad blocker or browser extension.");
        return;
      }
      try {
        // @ts-expect-error Twitch global
        new window.Twitch.Embed(container, {
          channel,
          width: "100%",
          height: "100%",
          layout: "video",
          autoplay: true,
          muted: true,
          parent: parents,
        });
      } catch (e) {
        setError("Failed to initialize Twitch player.");
      }
    };

    if (existing) {
      load();
    } else {
      const script = document.createElement("script");
      script.id = "twitch-embed-api";
      script.src = "https://embed.twitch.tv/embed/v1.js";
      script.onload = load;
      script.onerror = () => setError("Could not load Twitch embed script. Check your connection or ad blocker.");
      document.head.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [channel, parents]);

  if (error) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900/90 shadow-lg">
        <div className="aspect-video flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-300 text-sm mb-3">{error}</p>
          <a
            href={`https://twitch.tv/${channel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            Watch on Twitch
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/60 bg-black shadow-lg">
      <div ref={containerRef} className="aspect-video bg-black" />
    </div>
  );
};

export default TwitchEmbedPlayer;
