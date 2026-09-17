import React from 'react';
import PortfolioApprovalPanel from '../../components/admin/PortfolioApprovalPanel';
import { adminAPI } from '../../services/api';

const PortfolioApprovals = () => {
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
      <PortfolioApprovalPanel adminAPI={adminAPI} />
    </div>
  );
};

export default PortfolioApprovals;
