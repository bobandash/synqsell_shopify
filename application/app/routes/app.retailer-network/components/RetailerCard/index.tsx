import {
  BlockStack,
  Card,
  Icon,
  InlineStack,
  Link,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { EmailIcon } from '@shopify/polaris-icons';
import { SocialIcon } from 'react-social-icons';
import { useCallback, type FC } from 'react';
import { ImageIcon } from '~/assets';
import { v4 as uuidv4 } from 'uuid';
import styles from '../../styles.module.css';
import { useAppBridge } from '@shopify/app-bridge-react';
import { MODALS } from '../../constants';
import type { Retailer } from '../../loader/getRetailerPaginatedInfo';
import PartnershipButton from './PartnershipBtn';

type Props = {
  retailer: Retailer;
  setSelectedRetailerId: React.Dispatch<React.SetStateAction<string>>;
};

const SupplierCard: FC<Props> = ({ retailer, setSelectedRetailerId }) => {
  const { profile, id, partnershipStatus } = retailer;
  const { name, website, address, email, logo, biography } = profile;
  const {
    socialMediaLink: { facebook, twitter, instagram, tiktok, youtube },
  } = profile;
  const shopify = useAppBridge();

  // TODO: change social media links to one to many relationship, otherwise, just handle like this for now
  const allSocialMediaLinks = [
    facebook,
    twitter,
    instagram,
    tiktok,
    youtube,
  ].filter((link) => link);

  const handleRequestPartnership = useCallback(() => {
    shopify.modal.show(MODALS.INITIATE_PARTNERSHIP);
    setSelectedRetailerId(id);
  }, [shopify, setSelectedRetailerId, id]);

  return (
    <Card>
      <BlockStack gap="200">
        <div className={`${styles['card-container']}`}>
          <div>
            {logo ? (
              <Thumbnail source={logo} size="large" alt={`${name} logo`} />
            ) : (
              <Thumbnail
                source={ImageIcon}
                size="large"
                alt="Default logo image"
              />
            )}
          </div>
          <div>
            <Text variant="headingLg" as="h2" fontWeight="bold" truncate>
              {name}
            </Text>
            <div className={`${styles['link']} ${styles['truncate']}`}>
              <Link url={website} target="_blank">
                {website}
              </Link>
            </div>
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
          </div>
          <InlineStack gap={'200'}>
            <Link
              url={`mailto:${email}`}
              target="_blank"
              accessibilityLabel="Shopify website"
            >
              <Icon source={EmailIcon} tone="base" />
            </Link>
          </InlineStack>
        </div>
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
            <PartnershipButton
              partnershipStatus={partnershipStatus}
              handleRequestPartnership={handleRequestPartnership}
            />
          </InlineStack>
        </InlineStack>
      </BlockStack>
    </Card>
  );
};

export default SupplierCard;
