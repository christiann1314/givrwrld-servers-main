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
  const parents = React.useMemo(() => getTwitchEmbedParents(), []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const existing = document.getElementById("twitch-embed-api");
    const load = () => {
      container.innerHTML = "";
      // @ts-expect-error Twitch global
      if (typeof window.Twitch?.Embed !== "function") return;
      // @ts-expect-error Twitch global
      new window.Twitch.Embed(container, {
        channel,
        width: "100%",
        height: "100%",
        layout: "video-with-chat",
        autoplay: true,
        muted: true,
        parent: parents,
      });
    };

    if (existing) {
      load();
    } else {
      const script = document.createElement("script");
      script.id = "twitch-embed-api";
      script.src = "https://embed.twitch.tv/embed/v1.js";
      script.onload = load;
      document.head.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [channel, parents]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/60 bg-black shadow-lg">
      <div ref={containerRef} className="aspect-video bg-black" />
    </div>
  );
};

export default TwitchEmbedPlayer;
