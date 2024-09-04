import { useNavigate } from '@remix-run/react';
import { EmptyState as ShopifyEmptyState } from '@shopify/polaris';
import { useCallback } from 'react';

const EmptyState = () => {
  const navigate = useNavigate();
  const navigatePriceListNew = useCallback(() => {
    navigate('/app/price-list/new');
  }, [navigate]);

  return (
    <ShopifyEmptyState
      heading="Build Your Price List"
      action={{
        content: 'Create Price List',
        onAction: navigatePriceListNew,
      }}
      image={
        'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png'
      }
    >
      <p>Start inviting retailers to import your products today!</p>
    </ShopifyEmptyState>
  );
};

export default EmptyState;
