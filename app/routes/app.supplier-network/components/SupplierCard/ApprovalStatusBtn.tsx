import { Text } from '@shopify/polaris';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';
import { APPROVAL_STATUS, type ApprovalStatusProps } from '../../constants';

type Props = {
  approvalStatus: ApprovalStatusProps;
  handleRequestAccess: () => void;
};

const ApprovalStatusButton: FC<Props> = ({
  approvalStatus,
  handleRequestAccess,
}) => {
  if (approvalStatus === APPROVAL_STATUS.NO_ACCESS_REQUIRED) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']} ${sharedStyles['disabled']}`}
        disabled={true}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          No Access Needed
        </Text>
      </button>
    );
  }

  if (approvalStatus === APPROVAL_STATUS.HAS_ACCESS) {
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

  if (approvalStatus === APPROVAL_STATUS.REQUESTED_ACCESS) {
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

  if (approvalStatus === APPROVAL_STATUS.NO_ACCESS) {
    return (
      <button
        className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}
        onClick={handleRequestAccess}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Request Partnership
        </Text>
      </button>
    );
  }

  return null;
};
export default ApprovalStatusButton;
