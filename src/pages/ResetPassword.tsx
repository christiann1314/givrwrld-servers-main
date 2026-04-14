import * as React from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { validatePassword } from '../utils/passwordValidation';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [passwordValidation, setPasswordValidation] = React.useState(validatePassword(''));

  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get('token');

  React.useEffect(() => {
    setPasswordValidation(validatePassword(newPassword));
  }, [newPassword]);

  React.useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This password reset link is invalid. Please request a new one.",
        variant: "destructive",
      });
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!passwordValidation.isValid) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password that meets all requirements.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      toast({
        title: "Password Reset",
        description: "Your password has been updated. You can now sign in.",
      });
    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err?.message || "This link may have expired. Please request a new reset.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden flex items-center justify-center">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/70 to-gray-900/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-emerald-900/30" />
      </div>

      <Link to="/auth" className="absolute top-6 left-6 z-20 flex items-center space-x-2 text-gray-100 hover:text-white transition-colors">
        <ArrowLeft size={20} />
        <span>Back to Sign In</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl font-bold text-white tracking-tight">GIVRwrld</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {success ? 'Password Updated' : 'Choose New Password'}
            </h1>
            <p className="text-gray-200">
              {success
                ? "You're all set. Sign in with your new password."
                : "Enter your new password below."}
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center flex flex-col items-center gap-3">
                <CheckCircle className="text-emerald-400" size={32} />
                <p className="text-emerald-300 text-sm">
                  Your password has been reset successfully.
                </p>
              </div>
              <Link
                to="/auth"
                className="block w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-100 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-lg pl-12 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-200 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {newPassword && (
                  <PasswordStrengthIndicator password={newPassword} showErrors={true} />
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-100 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !passwordValidation.isValid}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
