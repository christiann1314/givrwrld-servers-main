
import React from 'react';
import { Link } from 'react-router-dom';

interface ServerCardProps {
  game: string;
  image: string;
  subtitle: string;
  price: string;
}

const ServerCard: React.FC<ServerCardProps> = ({ 
  game, 
  image,
  subtitle, 
  price
}) => {
  const getConfigPath = (game: string) => {
    switch (game.toLowerCase()) {
      case 'minecraft':
        return '/configure/minecraft';
      case 'rust':
        return '/configure/rust';
      case 'palworld':
        return '/configure/palworld';
      default:
        return '/deploy';
    }
  };

  return (
    <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
      <div className="h-48 relative overflow-hidden">
        <img
          src={image}
          alt={`${game} card`}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white drop-shadow-md">{game}</h3>
          <p className="text-gray-200 text-xs drop-shadow-md">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 text-sm">
          <div className="text-emerald-300">Starting at {price}<span className="text-gray-400">/month</span></div>
          <div className="text-gray-400">Instant setup • Premium hardware</div>
        </div>
        <Link
          to={getConfigPath(game)}
          className="block w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.01] shadow-lg hover:shadow-xl text-center"
        >
          Deploy {game} Server
        </Link>
      </div>
    </div>
  );
};

export default ServerCard;
