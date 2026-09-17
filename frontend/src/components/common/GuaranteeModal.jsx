import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const GuaranteeModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch (err) {
      toast.error('Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[440px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 animate-in zoom-in-95 fade-in">
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {!submitted ? (
            <>
              {/* Icon & Heading */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 ring-1 ring-blue-100">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  100% Satisfaction Guarantee
                </h2>
                <p className="mt-3 text-slate-600 text-[15px] leading-relaxed">
                  Not satisfied within 24 hours of subscribing? Get a full refund instantly — no questions asked.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Contact Support
                      <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer text */}
              <p className="mt-6 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
                Our support team will contact you shortly
              </p>
            </>
          ) : (
            /* Success State */
            <div className="py-8 flex flex-col items-center text-center animate-in slide-in-from-bottom-4">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Request Received!</h3>
              <p className="mt-3 text-slate-600">
                We've received your message for <b>{email}</b>. Our support team will reach out to you within 24 hours to help you with your query.
              </p>
              <button
                onClick={handleClose}
                className="mt-8 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Decorative background blurs */}
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
};

export default GuaranteeModal;
