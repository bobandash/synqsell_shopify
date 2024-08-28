import {
  BlockStack,
  Card,
  Icon,
  InlineStack,
  Layout,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { EmailIcon } from '@shopify/polaris-icons';
import { SocialIcon } from 'react-social-icons';
import type { Supplier } from '../../loader/getSupplierPaginatedInfo';
import { useCallback, type FC } from 'react';
import { ImageIcon } from '~/assets';
import { useNavigate } from '@remix-run/react';
import { v4 as uuidv4 } from 'uuid';
import sharedStyles from '~/shared.module.css';
import styles from '../../styles.module.css';
import ApprovalStatusButton from './ApprovalStatusBtn';
type Props = {
  supplier: Supplier;
};

const SupplierCard: FC<Props> = ({ supplier }) => {
  const { profile, priceList } = supplier;
  const { name, website, address, email, logo, biography } = profile;
  const {
    socialMediaLink: { facebook, twitter, instagram, tiktok, youtube },
  } = profile;
  const { requiresApprovalToImport, id: priceListId } = priceList;
  const navigate = useNavigate();

  const allSocialMediaLinks = [
    facebook,
    twitter,
    instagram,
    tiktok,
    youtube,
  ].filter((link) => link !== '');

  const handleSeeProducts = useCallback(() => {
    navigate(`/app/price-list/${priceListId}/products`);
  }, [navigate, priceListId]);

  return (
    <Layout.Section variant="oneHalf">
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap={'300'}>
              {logo ? (
                <Thumbnail source={logo} size="large" alt={`${name} logo`} />
              ) : (
                <Thumbnail
                  source={ImageIcon}
                  size="large"
                  alt="Default logo image"
                />
              )}

              <BlockStack>
                <Text variant="headingLg" as="h2" fontWeight="bold">
                  {name}
                </Text>
                <a
                  href="https://www.blankmod.com"
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles['link']}`}
                >
                  {website}
                </a>
                <Text variant="bodyMd" as="p">
                  {address ?? ''}
                </Text>
                <InlineStack gap={'150'} align={'start'}>
                  {allSocialMediaLinks.map((link) => (
                    <SocialIcon
                      key={uuidv4()}
                      url={link}
                      target="_blank"
                      className={styles['logo']}
                    />
                  ))}
                </InlineStack>
              </BlockStack>
            </InlineStack>
            <InlineStack gap={'200'}>
              <a href={`mailto:${email}`} title={email}>
                <Icon source={EmailIcon} tone="base" />
              </a>
            </InlineStack>
          </InlineStack>
          <BlockStack>
            <Text variant="headingMd" as="h3">
              About Us:
            </Text>
            <Text variant="bodyMd" as="p">
              {biography}
            </Text>
          </BlockStack>
          <InlineStack align="end">
            <InlineStack gap={'200'}>
              <ApprovalStatusButton
                requiresApprovalToImport={requiresApprovalToImport}
              />
              <button
                className={`${sharedStyles['blue']} ${sharedStyles['btn']}`}
                onClick={handleSeeProducts}
              >
                <Text as="p" variant="bodySm" fontWeight="medium">
                  See Products
                </Text>
              </button>
            </InlineStack>
          </InlineStack>
        </BlockStack>
      </Card>
    </Layout.Section>
  );
};

export default SupplierCard;
