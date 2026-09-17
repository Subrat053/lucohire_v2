import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import useTranslation from '../hooks/useTranslation';
import Seo from '../components/common/Seo';

const RenewalPolicyPage = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('renewal').then(res => {
      setContent(res.data || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="max-w-6xl mx-auto px-2 lg:px-4 lg:py-4">
      <Seo
        title={t('static.renewalTitle', 'Renewal Policy')}
        description={t('static.renewalDescription', 'Read the renewal policy for subscription plans on ServiceHub.')}
        canonicalPath="/renewal-policy"
      />
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default RenewalPolicyPage;
