
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// Header and Footer are included in App.tsx
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Admin2FAManager } from '../components/Admin2FAManager';
import { InitialAdminSetup } from '../components/InitialAdminSetup';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Server,
  Copy
} from 'lucide-react';
import { usePterodactylCredentials } from '../hooks/usePterodactylCredentials';
import { ServerIntegrationStatus } from '../components/ServerIntegrationStatus';

const DashboardSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showPterodactylPassword, setShowPterodactylPassword] = useState(false);
  const { 
    credentials: pterodactylCredentials, 
    loading: credentialsLoading, 
    error: credentialsError, 
    needsSetup,
    setupPterodactylAccount,
    fixPterodactylCredentials
  } = usePterodactylCredentials();
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    maintenance: true,
    billing: true,
    security: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationChange = (key: string) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-blue-900/10"></div>
      </div>
      
      <div className="relative z-10">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Account Settings
              </span>
            </h1>
            <p className="text-gray-300">Manage your account preferences and security settings</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <User size={20} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'security'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <Shield size={20} />
                    <span>Security</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'notifications'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <Bell size={20} />
                    <span>Notifications</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pterodactyl')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'pterodactyl'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <Server size={20} />
                    <span>Pterodactyl Access</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
                    <form className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-300 mb-2">First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2">Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors">
                        Save Changes
                      </button>
                    </form>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
                    
                    {/* Initial Admin Setup */}
                    <InitialAdminSetup />
                    
                    {/* Change Password */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                      <form className="space-y-4">
                        <div>
                          <label className="block text-gray-300 mb-2">Current Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="currentPassword"
                              value={formData.currentPassword}
                              onChange={handleInputChange}
                              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 pr-12 text-white focus:border-emerald-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2">New Password</label>
                          <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors">
                          Update Password
                        </button>
                      </form>
                    </div>

                    {/* Admin 2FA Management */}
                    <div className="mb-8">
                      <Admin2FAManager />
                    </div>

                    {/* Two-Factor Authentication */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
                      <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="text-emerald-400" size={24} />
                            <div>
                              <div className="text-white font-medium">Authenticator App</div>
                              <div className="text-gray-400 text-sm">Not configured</div>
                            </div>
                          </div>
                          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
                            Enable
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                   )}

                   {/* Pterodactyl Access Tab */}
                   {activeTab === 'pterodactyl' && (
                     <div className="space-y-6">
                       <h2 className="text-xl font-bold text-white mb-6">Pterodactyl Panel Access</h2>
                       
                       {/* Integration Status */}
                       <ServerIntegrationStatus />
                       
                       {/* Credentials Section */}
                       <div>
                         <h3 className="text-lg font-semibold text-white mb-4">Panel Credentials</h3>
                       
                       {credentialsLoading ? (
                         <div className="text-gray-400">Loading credentials...</div>
                       ) : needsSetup ? (
                         <div className="space-y-4">
                           <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-6">
                             <div className="text-center">
                               <h4 className="text-lg font-semibold text-white mb-2">Pterodactyl Account Setup Required</h4>
                               <p className="text-gray-300 mb-4">
                                 You need to set up your Pterodactyl panel access to manage your game servers.
                               </p>
                               <button
                                 onClick={setupPterodactylAccount}
                                 disabled={credentialsLoading}
                                 className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                               >
                                 {credentialsLoading ? 'Setting up...' : 'Setup Pterodactyl Account'}
                               </button>
                               <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded">
                                 <p className="text-blue-300 text-sm">
                                   💡 This will create your Pterodactyl panel account and generate secure credentials for server management.
                                 </p>
                               </div>
                             </div>
                           </div>
                         </div>
                        ) : credentialsError ? (
                          <div className="space-y-4">
                            <div className="text-red-400">Error: {credentialsError}</div>
                            <div className="flex space-x-3">
                              <button
                                onClick={setupPterodactylAccount}
                                disabled={credentialsLoading}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                {credentialsLoading ? 'Retrying...' : 'Retry Setup'}
                              </button>
                              {credentialsError.includes('Password not found') && (
                                <button
                                  onClick={fixPterodactylCredentials}
                                  disabled={credentialsLoading}
                                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                  {credentialsLoading ? 'Fixing...' : 'Fix Credentials'}
                                </button>
                              )}
                            </div>
                            <div className="p-3 bg-amber-900/30 border border-amber-700 rounded">
                              <p className="text-amber-300 text-sm">
                                🔧 If you have a Pterodactyl account but can't login, try "Fix Credentials" to reset your password.
                              </p>
                            </div>
                          </div>
                       ) : pterodactylCredentials ? (
                         <div className="space-y-4">
                           <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-6">
                             <p className="text-gray-300 mb-4">Use these credentials to access your Pterodactyl panel:</p>
                             
                             <div className="space-y-4">
                               <div>
                                 <label className="block text-gray-300 mb-2">Panel URL:</label>
                                 <div className="flex items-center gap-2">
                                   <input
                                     type="text"
                                     value={pterodactylCredentials.panel_url}
                                     readOnly
                                     className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white"
                                   />
                                   <button
                                     onClick={() => copyToClipboard(pterodactylCredentials.panel_url, 'Panel URL')}
                                     className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-3 rounded-lg transition-colors"
                                   >
                                     <Copy className="w-4 h-4" />
                                   </button>
                                    <button
                                      onClick={() => window.open(pterodactylCredentials.panel_url, '_blank')}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors"
                                    >
                                      Open Panel
                                    </button>
                                    <button
                                      onClick={fixPterodactylCredentials}
                                      disabled={credentialsLoading}
                                      className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
                                    >
                                      {credentialsLoading ? 'Resetting…' : 'Reset Panel Password'}
                                    </button>
                                 </div>
                               </div>
                               
                               <div>
                                 <label className="block text-gray-300 mb-2">Email:</label>
                                 <div className="flex items-center gap-2">
                                   <input
                                     type="text"
                                     value={pterodactylCredentials.email}
                                     readOnly
                                     className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white"
                                   />
                                   <button
                                     onClick={() => copyToClipboard(pterodactylCredentials.email, 'Email')}
                                     className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-3 rounded-lg transition-colors"
                                   >
                                     <Copy className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                               
                               <div>
                                 <label className="block text-gray-300 mb-2">Password:</label>
                                 <div className="flex items-center gap-2">
                                   <input
                                     type={showPterodactylPassword ? "text" : "password"}
                                     value={pterodactylCredentials.password}
                                     readOnly
                                     className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white"
                                   />
                                   <button
                                     onClick={() => setShowPterodactylPassword(!showPterodactylPassword)}
                                     className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-3 rounded-lg transition-colors"
                                   >
                                     {showPterodactylPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                   </button>
                                   <button
                                     onClick={() => copyToClipboard(pterodactylCredentials.password, 'Password')}
                                     className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-3 rounded-lg transition-colors"
                                   >
                                     <Copy className="w-4 h-4" />
                                   </button>
                                 </div>
                                 {!pterodactylCredentials.password && (
                                   <p className="text-gray-400 text-xs mt-2">
                                     Password is hidden until generated. Click "Reset Panel Password" to create a fresh login password.
                                   </p>
                                 )}
                               </div>
                             </div>
                             
                             <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                               <p className="text-blue-300 text-sm">
                                 💡 <strong>Note:</strong> These are your automatically generated Pterodactyl panel credentials. 
                                 Keep them secure and use them to access your server management panel.
                               </p>
                             </div>
                           </div>
                         </div>
                         ) : (
                           <div className="space-y-4">
                             <div className="text-gray-400">No Pterodactyl credentials found</div>
                             <button
                               onClick={setupPterodactylAccount}
                               disabled={credentialsLoading}
                               className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                             >
                               {credentialsLoading ? 'Setting up...' : 'Setup Pterodactyl Account'}
                             </button>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  )}

                  {/* Notifications Tab */}
                  {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Notification Methods</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Mail className="text-blue-400" size={20} />
                              <span className="text-white">Email Notifications</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notifications.email}
                                onChange={() => handleNotificationChange('email')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Smartphone className="text-emerald-400" size={20} />
                              <span className="text-white">Push Notifications</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notifications.push}
                                onChange={() => handleNotificationChange('push')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'maintenance', label: 'Maintenance Alerts', icon: Shield },
                            { key: 'billing', label: 'Billing Notifications', icon: Mail },
                            { key: 'security', label: 'Security Alerts', icon: Key }
                          ].map(({ key, label, icon: Icon }) => (
                            <div key={key} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Icon className="text-purple-400" size={20} />
                                <span className="text-white">{label}</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifications[key as keyof typeof notifications]}
                                  onChange={() => handleNotificationChange(key)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

               </div>
             </div>
           </div>
         </div>

         {/* Footer is included in App.tsx */}
       </div>
     </div>
   );
 };

export default DashboardSettings;
