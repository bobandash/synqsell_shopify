import { useNavigate } from '@remix-run/react';
import { Page } from '@shopify/polaris';
import { useCallback } from 'react';
import { useRoleContext } from '~/context/RoleProvider';

const RetailerPartnerships = () => {
  const { isRetailer } = useRoleContext();
  const navigate = useNavigate();

  const navigateRetailerRequests = useCallback(() => {
    navigate('/app/partnerships/supplier');
  }, [navigate]);

  return (
    <Page
      title="Retailer Partnerships"
      subtitle="Approve or reject retailer partnership requests."
      primaryAction={{
        content: 'Supplier Requests',
        disabled: !isRetailer,
        helpText: 'Navigate to retailer partnership requests',
        onAction: navigateRetailerRequests,
      }}
    ></Page>
  );
};

export default RetailerPartnerships;
