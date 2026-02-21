import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get('verify_token') || params.get('token') || '';
  const emailParam = params.get('email') || '';

  const [email, setEmail] = React.useState(emailParam);
  const [isResending, setIsResending] = React.useState(false);
  const [verificationChecking, setVerificationChecking] = React.useState(!!token);

  React.useEffect(() => {
    if (!emailParam) return;
    setEmail(emailParam);
  }, [emailParam]);

  React.useEffect(() => {
    if (!token) return;
    let active = true;

    const runVerify = async () => {
      try {
        setVerificationChecking(true);
        const result = await api.verifyEmail(token);
        if (!active) return;

        toast({
          title: result?.success ? 'Email verified' : 'Verification failed',
          description:
            result?.message ||
            (result?.success ? 'Your email is verified. Please sign in.' : 'Invalid or expired verification link.'),
          variant: result?.success ? undefined : 'destructive',
        });

        if (result?.success) {
          setTimeout(() => {
            navigate('/auth', {
              replace: true,
              state: { message: 'Email verified. Please sign in to continue.' },
            });
          }, 1200);
        }
      } catch (error: any) {
        if (!active) return;
        toast({
          title: 'Verification failed',
          description: error?.message || 'Invalid or expired verification link.',
          variant: 'destructive',
        });
      } finally {
        if (active) setVerificationChecking(false);
      }
    };

    runVerify();
    return () => {
      active = false;
    };
  }, [token, navigate]);

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: 'Email required',
        description: 'Enter your signup email to resend verification.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    try {
      const result = await api.resendVerification(normalizedEmail);
      toast({
        title: 'Verification email sent',
        description: result?.message || 'Please check inbox and spam folder.',
      });
    } catch (error: any) {
      toast({
        title: 'Resend failed',
        description: error?.message || 'Could not resend verification email.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden flex items-center justify-center">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/70 to-gray-900/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-emerald-900/30"></div>
      </div>

      <Link to="/auth" className="absolute top-6 left-6 z-20 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
        <ArrowLeft size={20} />
        <span>Back to Sign In</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src="/images/9dd7d65a-1866-4205-bcbb-df3788eea144.png" alt="GIVRwrld" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-bold text-white">GIVRwrld</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
            <p className="text-gray-300 text-sm">
              We sent a verification link to your email. Open it to activate your account.
            </p>
          </div>

          <div className="space-y-4">
            {verificationChecking && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm">
                Verifying your email link...
              </div>
            )}

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300 text-sm">
              Check your inbox, spam, and promotions folders to find the verification email.
            </div>

            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your signup email"
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw size={18} />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/auth', { state: { message: 'Please sign in after verifying your email.' } })}
              className="w-full bg-gray-700/70 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <MailCheck size={18} />
              <span>Go to Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
