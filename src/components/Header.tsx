
 import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
 import { Home, Users, HelpCircle, MessageCircle, User, LogIn, UserPlus, ChevronDown, Settings, LogOut } from 'lucide-react';
 import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    // Close menus when auth state or route changes to prevent stale dropdown UI.
    setIsAccountOpen(false);
  }, [user?.id, location.pathname]);
 
   const handleLogout = async () => {
     setIsAccountOpen(false);
     setIsLoggingOut(true);
     
     try {
       await signOut();
       // Smooth redirect to home
       window.location.href = '/';
     } catch (error) {
       console.error('Logout error:', error);
       window.location.href = '/';
     } finally {
       setIsLoggingOut(false);
     }
   };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/70 border-b border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              <img 
                src="/images/9dd7d65a-1866-4205-bcbb-df3788eea144.png"
                alt="GIVRwrld"
                className="w-14 h-14 object-cover object-[50%_38%] mix-blend-screen saturate-150 brightness-125 contrast-125"
              />
            </div>
            <span className="text-2xl font-bold text-white whitespace-nowrap">GIVRwrld</span>
            <span className="bg-emerald-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
              Servers
            </span>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-1 text-white hover:text-emerald-400 transition-colors">
              <Home size={16} />
              <span>Home</span>
            </Link>
            
            <Link to="/discord" className="flex items-center space-x-1 text-gray-300 hover:text-emerald-400 transition-colors">
              <MessageCircle size={16} />
              <span>Discord</span>
            </Link>
            <Link to="/faq" className="flex items-center space-x-1 text-gray-300 hover:text-emerald-400 transition-colors">
              <HelpCircle size={16} />
              <span>FAQ</span>
            </Link>
            <Link to="/support" className="flex items-center space-x-1 text-gray-300 hover:text-emerald-400 transition-colors">
              <Users size={16} />
              <span>Support</span>
            </Link>
            <Link to="/dashboard" className="flex items-center space-x-1 text-gray-300 hover:text-emerald-400 transition-colors">
              <Settings size={16} />
              <span>User Dashboard</span>
            </Link>
          </nav>

          {/* Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <User size={16} />
              <span>Account</span>
              <ChevronDown size={14} />
            </button>
            
            {isAccountOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-md rounded-lg border border-emerald-500/20 shadow-xl z-50">
                <div className="py-2">
                  {user ? (
                    <>
                      <div className="px-4 py-2 text-gray-300 border-b border-gray-600/50">
                        <div className="text-sm font-medium text-white">
                           {user.display_name || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-400">Signed in</div>
                      </div>
                      <Link to="/dashboard" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-emerald-500/10 transition-colors">
                        <Settings size={16} />
                        <span>Dashboard</span>
                      </Link>
                      <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                      >
                        {isLoggingOut && (
                          <div className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-300 rounded-full animate-spin"></div>
                        )}
                        <LogOut size={16} />
                        <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-emerald-500/10 transition-colors"
                      >
                        <LogIn size={16} />
                        <span>Sign In</span>
                      </Link>
                      <Link
                        to="/auth"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-emerald-500/10 transition-colors"
                      >
                        <UserPlus size={16} />
                        <span>Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
