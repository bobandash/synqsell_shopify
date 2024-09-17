import {
  BlockStack,
  Box,
  Card,
  Divider,
  Image,
  Link,
  Text,
} from '@shopify/polaris';
import { ImageIcon } from '~/assets';
import sharedStyles from '~/shared.module.css';
import type { FulfillmentService } from '@prisma/client';
import type { ProductCardJSON } from '../../types';
import PricingDetails from './PricingDetails';
import type { FC } from 'react';
import ProductCardBtn from './ProductCardBtn';

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
                <div
                  className={`${sharedStyles['bold-link-container']}`}
                  title={brandName}
                >
                  <Link url={priceListUrl}>
                    <Text as="span" truncate>
                      {brandName}
                    </Text>
                  </Link>
                </div>
              )}
              <div title={productName}>
                <Text as="h2" variant="headingMd" truncate={true}>
                  {productName}
                </Text>
              </div>
            </BlockStack>
            <Divider />
            <PricingDetails
              variant={product.variants[0]}
              currencySign={product.currencySign}
            />
            <ProductCardBtn
              product={product}
              fulfillmentService={fulfillmentService}
            />
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
};

export default ProductCard;
