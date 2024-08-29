import type { FC } from 'react';
import type { ProductCardData } from '../loader/getProductCardInfo';
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

type Props = {
  product: ProductCardData;
};

const ProductCard: FC<Props> = ({ product }) => {
  const { images, brandName, title, priceListId } = product;
  const primaryImage =
    images.length > 0 && images[0].url
      ? { url: images[0].url, alt: images[0].alt }
      : null;
  const priceListUrl = `/app/products/${priceListId}`;

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
                  <UnstyledLink url={priceListUrl} truncate={true}>
                    {brandName}
                  </UnstyledLink>
                </div>
              )}
              <Text as="h2" variant="headingMd" truncate={true}>
                {title}
              </Text>
            </BlockStack>
            <Divider />
            <BlockStack gap="025">
              <Text as="p" fontWeight="medium">
                Retail:
              </Text>
              <Text as="p" fontWeight="medium">
                Cost:
              </Text>
            </BlockStack>
            <Divider />
            <div className={`${sharedStyles['orange-container']}`}>
              <Text as="p" fontWeight="medium">
                Your Profit:
              </Text>
            </div>

            <button
              className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}
            >
              <Text as="p" variant="bodySm" fontWeight="medium">
                Request Price List
              </Text>
            </button>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
};

export default ProductCard;
