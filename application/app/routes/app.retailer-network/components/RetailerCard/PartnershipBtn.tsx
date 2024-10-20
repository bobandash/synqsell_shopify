import { Text } from '@shopify/polaris';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';
import {
  PARTNERSHIP_STATUS,
  type PartnershipStatusProps,
} from '../../constants';

type Props = {
  partnershipStatus: PartnershipStatusProps;
  handleRequestPartnership: () => void;
};

const PartnershipButton: FC<Props> = ({
  partnershipStatus,
  handleRequestPartnership,
}) => {
  if (partnershipStatus === PARTNERSHIP_STATUS.PARTNERED) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']} ${sharedStyles['disabled']}`}
        disabled={true}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Partnered
        </Text>
      </button>
    );
  }

  if (partnershipStatus === PARTNERSHIP_STATUS.REQUESTED_PARTNERSHIP) {
    return (
      <button
        className={`${sharedStyles['yellow']} ${sharedStyles['btn']}`}
        disabled={true}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Pending Request
        </Text>
      </button>
    );
  }

  if (partnershipStatus === PARTNERSHIP_STATUS.NO_PARTNERSHIP) {
    return (
      <button
        className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}
        onClick={handleRequestPartnership}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Request Partnership
        </Text>
      </button>
    );
  }

  return null;
};
export default PartnershipButton;
