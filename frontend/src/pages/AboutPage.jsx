import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Seo from '../components/common/Seo';
import useTranslation from '../hooks/useTranslation';
import PolicyPageLayout from '../components/common/PolicyPageLayout';

const AboutPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('about').then(res => {
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
          title: 'About Us',
          intro: 'Connecting job seekers, employers, and recruiters through transparent AI technology.',
          lastUpdated: 'Last updated: July 2026',
          sections: [
            { title: 'Who We Are', body: 'Lucohire is an AI-powered employment platform designed to connect talented job seekers with verified employers and recruiters across various industries.' },
            { title: 'Our Mission', body: 'Our mission is to simplify job discovery, streamline application processes, and provide data-driven career tools including ATS resume scoring, smart matching, and automated alerts.' }
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
        title={t('static.aboutTitle', 'About Us | Lucohire')}
        description={t('static.aboutDescription', 'Learn about Lucohire - The AI-Powered Career Platform.')}
        canonicalPath="/about"
      />
      <PolicyPageLayout data={data} isEditMode={false} imageUrl="/image.webp" />
    </>
  );
};

export default AboutPage;
