import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Seo from '../components/common/Seo';
import useTranslation from '../hooks/useTranslation';
import PolicyPageLayout from '../components/common/PolicyPageLayout';

const PrivacyPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('privacy').then(res => {
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
          title: 'Privacy Policy',
          intro: 'Your privacy is important to us. It is Lucohire\'s policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.',
          lastUpdated: 'Last Updated: November 2025',
          sections: [
            { title: 'Information We Collect', body: 'We only collect information about you if we have a reason to do so - for example, to provide our Services, to communicate with you, or to make our Services better.\n\n• Personal Information: We collect personal information that you provide to us when you use our Services, such as your name, email address, and any other contact information you provide.\n• Usage Data: We collect information about your interactions with our Services, such as the pages you visit, the links you click, and the search terms you use.' },
            { title: 'How We Use Information', body: 'We use the information we collect in various ways, including to:\n\n• Provide, operate, and maintain our website.\n• Improve, personalize, and expand our website.\n• Understand and analyze how you use our website.\n• Develop new products, services, features, and functionality.\n• Communicate with you, either directly or through one of our partners.' },
            { title: 'Data Security', body: 'We implement industry-standard encryption and security measures to protect your personal details.' }
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
        title={t('static.privacyTitle', 'Privacy Policy | Lucohire')}
        description={t('static.privacyDescription', 'Learn how Lucohire handles data and privacy.')}
        canonicalPath="/privacy"
      />
      <PolicyPageLayout data={data} isEditMode={false} imageUrl="/privacy_policy_illustration_1785319033161.webp" />
    </>
  );
};

export default PrivacyPage;
