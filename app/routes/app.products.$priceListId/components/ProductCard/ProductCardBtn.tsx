// four states
// 1. requested approval
// 2. import
// 3. imported
// 4. approved

import type { FC } from 'react';
import type { ProductCardJSON } from '../../types';
import sharedStyles from '~/shared.module.css';
import { Text } from '@shopify/polaris';

type Props = {
  product: ProductCardJSON;
};

const ProductCardBtn: FC<Props> = (props) => {
  const { product } = props;
  const { isImported, hasAccessToImport } = product;

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
      <button className={`${sharedStyles['green']} ${sharedStyles['btn']}`}>
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

// TODO: add import buttons

// const handleImportProduct = useCallback(() => {
//   remixSubmit(
//     {
//       productId: product.id,
//       intent: INTENTS.IMPORT_PRODUCT,
//       fulfillmentServiceId: fulfillmentService.id,
//     },
//     {
//       method: 'post',
//       action: pathname,
//     },
//   );
// }, [product, pathname, remixSubmit, fulfillmentService]);
