import {
  BlockStack,
  Box,
  Card,
  Divider,
  Image,
  Text,
  UnstyledLink,
} from '@shopify/polaris';
import { ImageIcon } from '~/assets';
import sharedStyles from '~/shared.module.css';
import type { FulfillmentService } from '@prisma/client';
import type { ProductCardJSON } from '../../types';
import PricingDetails from './PricingDetails';
import type { FC } from 'react';

type Props = {
  product: ProductCardJSON;
  fulfillmentService: FulfillmentService;
};

const ProductCard: FC<Props> = ({ product, fulfillmentService }) => {
  const { brandName, title, variants } = product;
  const primaryImage =
    product.mediaImageUrl && product.mediaAlt !== null
      ? { url: product.mediaImageUrl, alt: product.mediaAlt }
      : null;
  const priceListUrl = `/app/products/${product.priceListId}`;
  const numVariants = variants.length;
  const productName = `${title}${numVariants > 1 ? ` (${numVariants} variants)` : ''}`;

  return (
    <Card padding="0">
      <BlockStack>
        <div className={`${sharedStyles['card-image-container']}`}>
          {primaryImage ? (
            <Image source={primaryImage.url} alt={primaryImage.alt} />
          ) : (
            <Image source={ImageIcon} alt={'Image placeholder'} />
          )}
        </div>
        <Box paddingInline={'300'} paddingBlock={'200'}>
          <BlockStack gap={'100'}>
            <BlockStack>
              {brandName && (
                <div className={`${sharedStyles['bold-link-container']}`}>
                  <UnstyledLink url={priceListUrl} truncate={'true'}>
                    {brandName}
                  </UnstyledLink>
                </div>
              )}
              <div title={productName}>
                <Text as="h2" variant="headingMd" truncate={true}>
                  {productName}
                </Text>
              </div>
            </BlockStack>
            <Divider />
          </BlockStack>
          <PricingDetails
            variant={product.variants[0]}
            currencySign={product.currencySign}
          />
        </Box>
      </BlockStack>
    </Card>
  );
};

export default ProductCard;

// TODO: add import buttons
// {/* <button className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}>
// <Text as="p" variant="bodySm" fontWeight="medium">
//   Request Price List
// </Text>
// </button> */}
// {/* <button
// className={`${sharedStyles['green']} ${sharedStyles['btn']}`}
// onClick={handleImportProduct}
// >
// <Text as="p" variant="bodySm" fontWeight="medium">
//   Import Product
// </Text>
// </button> */}

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
