import type { FC } from 'react';
import type { ProductCardData } from '../../loader/getProductCardInfo';
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
import PricingDetails from './PricingDetails';

type Props = {
  product: ProductCardData;
};

// TODO: if the product has been imported before, I need to denote that it's been imported before
const ProductCard: FC<Props> = ({ product }) => {
  const { images, brandName, title, priceList, variants } = product;
  const primaryImage =
    images.length > 0 && images[0].url
      ? { url: images[0].url, alt: images[0].alt }
      : null;
  const priceListUrl = `/app/products/${priceList.id}`;
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
            <PricingDetails product={product} />
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
};

export default ProductCard;
