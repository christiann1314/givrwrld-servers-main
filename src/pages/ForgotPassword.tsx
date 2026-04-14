import * as React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const ForgotPassword = () => {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setSubmitted(true);
      toast({
        title: "Check your email",
        description: "If an account with that email exists, we've sent a password reset link.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-gray-200">
              {submitted
                ? "We've sent you a reset link. Check your inbox."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-100 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200" size={20} />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                <p className="text-emerald-300 text-sm">
                  If an account exists for <strong>{email}</strong>, you'll receive an email with instructions to reset your password.
                </p>
              </div>

              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="w-full bg-gray-700/50 hover:bg-gray-700/70 text-white font-semibold py-3 px-4 rounded-lg transition-all"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/auth" className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
