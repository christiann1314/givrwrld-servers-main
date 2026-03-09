import * as React from "react";
import TwitchEmbedPlayer from "./TwitchEmbedPlayer";
import KickChannelCard from "./KickChannelCard";

export interface PublicStreamData {
  platform: "twitch" | "kick";
  channel: string | null;
  url: string | null;
  embed_enabled: boolean;
}

interface PublicStreamSectionProps {
  streamerName?: string | null;
  stream: PublicStreamData | null;
}

const PublicStreamSection: React.FC<PublicStreamSectionProps> = ({ streamerName, stream }) => {
  if (!stream) {
    return (
      <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
        <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">Stream</div>
        <h3 className="text-xl font-semibold text-white mb-2">No livestream linked yet</h3>
        <p className="text-sm text-gray-300">
          This server owner has not added a livestream channel to the public page yet.
        </p>
      </div>
    );
  }

  if (stream.platform === "twitch" && stream.channel) {
    return <TwitchEmbedPlayer channel={stream.channel} title={`${streamerName || stream.channel} Twitch stream`} />;
  }

  return (
    <KickChannelCard
      channel={stream.channel}
      url={stream.url}
      streamerName={streamerName}
    />
  );
};

export default PublicStreamSection;
