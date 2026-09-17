import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Seo from '../components/common/Seo';
import useTranslation from '../hooks/useTranslation';
import PolicyPageLayout from '../components/common/PolicyPageLayout';

const RefundPolicyPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getContent('refund').then(res => {
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
          theme: 'amber',
          badge: 'Refund & Cancellation',
          title: 'Refund & Cancellation Policy',
          intro: 'At Lucohire, we strive to provide transparent pricing and quality service. Please read our refund policy carefully before making a purchase.',
          lastUpdated: 'Last updated: July 2026',
          sections: [
            { title: 'Important Notice on Paid Plans', body: 'If a plan is purchased, you cannot refund the money. You may stop or cancel auto-pay at any time from your dashboard to prevent future charges, but past and current billing cycles are strictly non-refundable once processed.' },
            { title: '1. Subscription Cancellations', body: 'You can cancel your subscription renewal at any time. Your access will remain active until the end of your current billing period. Canceling your subscription stops future auto-payments.' },
            { title: '2. Exceptions', body: 'Refunds may only be considered in the case of duplicate billing errors or if required by applicable local law. Any such claims must be made within 7 days of the transaction by contacting support.' }
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
        title={t('static.refundTitle', 'Refund & Cancellation Policy | Lucohire')}
        description={t('static.refundDescription', 'Read the refund and cancellation policy for using Lucohire.')}
        canonicalPath="/refund-policy"
      />
      <PolicyPageLayout data={data} isEditMode={false} imageUrl="/refund_illustration_1785319056153.webp" fullPage={true} />
    </>
  );
};

export default RefundPolicyPage;
