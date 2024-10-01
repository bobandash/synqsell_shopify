import { useCallback, type FC } from 'react';
import type { ProductCardJSON } from '../../types';
import sharedStyles from '~/shared.module.css';
import { Text } from '@shopify/polaris';
import { useLocation, useSubmit } from '@remix-run/react';
import { INTENTS, PRODUCT_STATUS } from '../../constants';

type Props = {
  product: ProductCardJSON;
  isSubmitting: boolean;
};

const ProductCardBtn: FC<Props> = (props) => {
  const { product, isSubmitting } = props;
  const { productStatus } = product;
  const remixSubmit = useSubmit();
  const { pathname } = useLocation();

  const handleImportProduct = useCallback(() => {
    remixSubmit(
      {
        productId: product.id,
        intent: INTENTS.IMPORT_PRODUCT,
      },
      {
        method: 'post',
        action: pathname,
      },
    );
  }, [product, pathname, remixSubmit]);

  if (productStatus === PRODUCT_STATUS.IMPORTED) {
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

  if (productStatus === PRODUCT_STATUS.ACCESS_NOT_IMPORTED) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']}`}
        onClick={handleImportProduct}
        disabled={isSubmitting}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          {isSubmitting ? 'Importing' : 'Import Product'}
        </Text>
      </button>
    );
  }

  if (productStatus === PRODUCT_STATUS.NO_ACCESS_REQUEST) {
    return (
      <button className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}>
        <Text as="p" variant="bodySm" fontWeight="medium">
          Request Price List
        </Text>
      </button>
    );
  }

  if (productStatus === PRODUCT_STATUS.REQUESTED_ACCESS) {
    return (
      <button
        className={`${sharedStyles['orange']} ${sharedStyles['btn']} } ${sharedStyles['disabled']}`}
        disabled={true}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Requested Access
        </Text>
      </button>
    );
  }
};

export default ProductCardBtn;
