import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Seo from '../components/common/Seo';
import useTranslation from '../hooks/useTranslation';
import FaqLayout from '../components/common/FaqLayout';

const FaqPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('faq').then(res => {
      let parsed = null;
      if (res.data && typeof res.data === 'string') {
        try {
          parsed = JSON.parse(res.data);
        } catch (e) {}
      } else if (res.data && typeof res.data === 'object') {
        parsed = res.data;
      }
      
      if (!parsed || !parsed.title) {
        parsed = {
          badge: 'TRUSTED BY',
          title: 'Frequently Asked Questions',
          sections: [
            { title: 'How does the AI candidate matching work?', body: 'Our proprietary AI algorithm analyzes candidate resumes against job descriptions to provide a Match Score (0-100%). It evaluates skills, experience, and educational background to ensure recruiters see the most relevant applicants first.' },
            { title: 'What happens when my subscription plan expires?', body: 'When your plan expires, your active job postings will be paused and your access to premium candidate profiles will be restricted. You can easily renew or upgrade your plan from the Billing section of your dashboard.' },
            { title: 'Can I request a refund if I am not satisfied?', body: 'As per our Refund Policy, all subscription purchases are final. However, you may cancel your auto-renewal at any time to prevent future charges. If you experience a technical error during billing, please contact support within 7 days.' },
            { title: 'How do I optimize my resume for the ATS?', body: 'To get the highest ATS score, ensure your resume includes clear headings, standard fonts, and keywords that directly match the job description. Avoid complex formatting like tables or images, as they can disrupt text parsing.' },
            { title: 'Are my personal details shared with third parties?', body: 'No. Lucohire strictly adheres to data protection laws. We only share your professional profile with verified employers when you actively apply for a job or opt-in to our talent pool.' }
          ]
        };
      }
      
      setData(parsed);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center bg-[#F8F9FA]"><LoadingSpinner /></div>;

  return (
    <>
      <Seo
        title={t('static.faqTitle', 'Frequently Asked Questions | Lucohire')}
        description={t('static.faqDescription', 'Find answers to common questions about Lucohire candidate tools, recruiter features, and subscriptions.')}
        canonicalPath="/faq"
      />
      <FaqLayout data={data} isEditMode={false} />
    </>
  );
};

export default FaqPage;
