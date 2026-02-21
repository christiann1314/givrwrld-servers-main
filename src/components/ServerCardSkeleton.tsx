import React from 'react';

const ServerCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-6 border-b border-gray-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-700 rounded-xl"></div>
            <div>
              <div className="h-6 bg-gray-700 rounded-md w-48 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded-md w-32 mb-2"></div>
              <div className="flex items-center space-x-4">
                <div className="h-6 bg-gray-700 rounded-full w-20"></div>
                <div className="h-4 bg-gray-700 rounded-md w-16"></div>
                <div className="h-6 bg-gray-700 rounded-full w-24"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-gray-600/30">
        <div className="h-5 bg-gray-700 rounded-md w-32 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-4 bg-gray-700 rounded-md w-4 mx-auto mb-2"></div>
              <div className="h-6 bg-gray-700 rounded-md w-12 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-700 rounded-md w-8 mx-auto"></div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className="h-3 bg-gray-700 rounded-md w-20"></div>
                <div className="h-3 bg-gray-700 rounded-md w-8"></div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Info & Actions */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-700 rounded-md w-20"></div>
                <div className="h-4 bg-gray-700 rounded-md w-24"></div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-700 rounded-md w-20"></div>
                <div className="h-4 bg-gray-700 rounded-md w-24"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded-lg w-28"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServerCardSkeleton;