// four states
// 1. requested approval
// 2. import
// 3. imported
// 4. approved

import { useCallback, type FC } from 'react';
import type { ProductCardJSON } from '../../types';
import sharedStyles from '~/shared.module.css';
import { Text } from '@shopify/polaris';
import { useLocation, useSubmit } from '@remix-run/react';
import { INTENTS } from '../../constants';
import type { FulfillmentService } from '../../loader';

type Props = {
  product: ProductCardJSON;
  fulfillmentService: FulfillmentService;
};

const ProductCardBtn: FC<Props> = (props) => {
  const { product, fulfillmentService } = props;
  const { isImported, hasAccessToImport } = product;
  const remixSubmit = useSubmit();
  const { pathname } = useLocation();

  const handleImportProduct = useCallback(() => {
    remixSubmit(
      {
        productId: product.id,
        intent: INTENTS.IMPORT_PRODUCT,
        fulfillmentServiceId: fulfillmentService.id,
      },
      {
        method: 'post',
        action: pathname,
      },
    );
  }, [product, pathname, remixSubmit, fulfillmentService]);

  if (isImported) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']} ${sharedStyles['disabled']}`}
        disabled={true}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Imported
        </Text>
      </button>
    );
  }

  if (hasAccessToImport && !isImported) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']}`}
        onClick={handleImportProduct}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Import Product
        </Text>
      </button>
    );
  }

  return (
    <button className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}>
      <Text as="p" variant="bodySm" fontWeight="medium">
        Request Price List
      </Text>
    </button>
  );
};

export default ProductCardBtn;
