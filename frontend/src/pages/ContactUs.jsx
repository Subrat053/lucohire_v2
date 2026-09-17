import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, User, Tag, Sparkles, CheckCircle2 } from 'lucide-react';
import { enquiryAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import Seo from '../components/common/Seo';

const ContactUs = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: location.state?.subject || '',
    message: location.state?.message || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Validation
      if (!form.name.trim()) {
        toast.error(t('contact.nameRequired', 'Name is required'));
        setLoading(false);
        return;
      }
      if (!form.email.trim()) {
        toast.error(t('contact.emailRequired', 'Email is required'));
        setLoading(false);
        return;
      }
      if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(form.email)) {
        toast.error(t('contact.validEmail', 'Please enter a valid email'));
        setLoading(false);
        return;
      }
      if (!form.message.trim()) {
        toast.error(t('contact.messageRequired', 'Message is required'));
        setLoading(false);
        return;
      }
      
      // Call enquiry API
      await enquiryAPI.create(form);
      
      toast.success(t('contact.successMessage', 'Thank you! We will get back to you soon.'));
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || t('contact.errorMessage', 'Failed to submit enquiry. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const contactCards = [
    {
      icon: MapPin,
      title: t('contact.visitUs', 'Visit Us'),
      value: t('contact.addressValue', 'India (HQ)'),
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    }
  ];

  const benefits = [
    {
      icon: MessageSquare,
      text: t('contact.benefitOne', 'Direct assistance from our plan experts')
    },
    {
      icon: Send,
      text: t('contact.benefitTwo', 'Quick response to your service queries')
    },
    {
      icon: User,
      text: t('contact.benefitThree', 'Custom solutions for recruiters and providers')
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Seo
        title={t('contact.pageTitle', 'Contact Us')}
        description={t('contact.pageDescription', 'Get in touch with Lucohire for support, partnerships, and hiring queries.')}
        canonicalPath="/contact"
      />
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-3xl text-center lg:mb-14">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {t('contact.badge', 'We are here to help')}
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {t('contact.title', 'Get in Touch')}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {t('contact.subtitle', 'Have questions about our services or need assistance? We\'re here to help you connect with the best professionals.')}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-14">
          {/* Left: Contact Info */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
              <h2 className="text-2xl font-bold text-slate-950">
                {t('contact.info', 'Contact Information')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t('contact.infoSubtitle', 'Reach out anytime. Our team will guide you with the right solution.')}
              </p>

              <div className="mt-7 grid gap-4">
                {contactCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group flex items-start gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg}`}>
                        <Icon className={`h-6 w-6 ${item.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-500">{item.title}</p>
                        <p className="mt-1 break-words text-base font-bold text-slate-950 sm:text-lg">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Why Contact Us */}
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-950/20 sm:p-8">
              <h3 className="text-xl font-bold">
                {t('contact.whyTitle', 'Why Contact Us?')}
              </h3>

              <div className="mt-6 space-y-4">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={benefit.text} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Icon className="h-4 w-4 text-indigo-200" />
                      </div>
                      <p className="text-sm leading-6 text-slate-200 sm:text-base">{benefit.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl shadow-slate-200/80 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                  {t('contact.formTitle', 'Send us a Message')}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {t('contact.formSubtitle', 'Fill the form and our team will contact you shortly.')}
                </p>
              </div>
              <div className="hidden rounded-2xl bg-indigo-50 p-3 sm:block">
                <CheckCircle2 className="h-7 w-7 text-indigo-600" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name & Email Row */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t('contact.yourName', 'Your Name')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t('contact.namePlaceholder', 'John Doe')}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t('contact.emailAddress', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t('contact.emailPlaceholder', 'john@example.com')}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Subject Row */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t('contact.phoneOptional', 'Phone Number (Optional)')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder={t('contact.phonePlaceholder', '+91 00000 00000')}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t('contact.subject', 'Subject')}
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder={t('contact.subjectPlaceholder', 'Service Needed')}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {t('contact.message', 'Message')}
                </label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('contact.messagePlaceholder', 'How can we help you?')}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 font-extrabold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    {t('common.sending', 'Sending...')}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 transition group-hover:translate-x-0.5" />
                    {t('contact.sendButton', 'Send Message')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
