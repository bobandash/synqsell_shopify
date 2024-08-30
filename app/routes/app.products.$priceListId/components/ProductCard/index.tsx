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

// TODO: add pending request status and fix status for this to instead just fetch and check for permissions
// TODO: the case that it's a general price list that the supplier granted permission
// TODO: also if the product has been imported before, I need to denote that it's been imported before
const ProductCard: FC<Props> = ({ product }) => {
  const { images, brandName, title, priceListId, variants } = product;
  const primaryImage =
    images.length > 0 && images[0].url
      ? { url: images[0].url, alt: images[0].alt }
      : null;
  const priceListUrl = `/app/products/${priceListId}`;
  const numVariants = variants.length;

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
              <Text as="h2" variant="headingMd" truncate={true}>
                {title} {numVariants > 1 && `(${numVariants} variants)`}
              </Text>
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
