import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Seo from '../components/common/Seo';
import useTranslation from '../hooks/useTranslation';
import PolicyPageLayout from '../components/common/PolicyPageLayout';

const TermsPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('terms').then(res => {
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
          title: 'Terms & Conditions',
          intro: 'Rules and guidelines for candidate applications, employer postings, and AI matching services.',
          lastUpdated: 'Last updated: July 2026',
          sections: [
            { title: '1. Acceptance of Terms', body: 'By using Lucohire, you agree to these Terms and Conditions. If you do not agree, please do not use our services.' },
            { title: '2. User Conduct', body: 'Users must provide accurate profile details and refrain from posting misleading job or candidate information.' },
            { title: '3. Platform Services', body: 'Lucohire reserves the right to update or modify features, terms, and services as needed.' }
          ]
        };
      }
      
      setData(parsed);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>;

  return (
    <>
      <Seo
        title={t('static.termsTitle', 'Terms & Conditions | Lucohire')}
        description={t('static.termsDescription', 'Read the terms and conditions for using Lucohire.')}
        canonicalPath="/terms"
      />
      <PolicyPageLayout data={data} isEditMode={false} imageUrl="/terms_illustration_1785319045794.webp" />
    </>
  );
};

export default TermsPage;
