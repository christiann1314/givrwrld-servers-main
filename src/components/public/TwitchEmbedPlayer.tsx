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
  const parents = React.useMemo(() => getTwitchEmbedParents(), []);

  const src = React.useMemo(() => {
    const params = new URLSearchParams({
      channel,
      autoplay: "false",
      muted: "false",
    });
    parents.forEach((parent) => params.append("parent", parent));
    return `https://player.twitch.tv/?${params.toString()}`;
  }, [channel, parents]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/60 bg-black shadow-lg">
      <div className="aspect-video bg-black">
        <iframe
          src={src}
          title={title}
          allowFullScreen
          scrolling="no"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default TwitchEmbedPlayer;
