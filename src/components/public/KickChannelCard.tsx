import * as React from "react";
import { ExternalLink } from "lucide-react";

interface KickChannelCardProps {
  channel: string | null;
  url: string | null;
  streamerName?: string | null;
}

const KickChannelCard: React.FC<KickChannelCardProps> = ({ channel, url, streamerName }) => {
  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">Kick Stream</div>
          <h3 className="text-xl font-semibold text-white mb-2">{streamerName || channel || "Kick channel"}</h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
            Kick support is available in v1 with public channel metadata and a direct watch link. Inline embed behavior is intentionally gated until platform support is verified.
          </p>
          {channel && <div className="mt-3 text-sm text-emerald-300">Channel: {channel}</div>}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            Watch on Kick
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
};

export default KickChannelCard;
