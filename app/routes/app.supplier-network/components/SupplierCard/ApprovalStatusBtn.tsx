import { Text } from '@shopify/polaris';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';

type Props = {
  requiresApprovalToImport: boolean;
  handleRequestAccess: () => void;
};

const ApprovalStatusButton: FC<Props> = ({
  requiresApprovalToImport,
  handleRequestAccess,
}) => {
  if (!requiresApprovalToImport) {
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

  // TODO: add remaining status: Pending, granted access
  return (
    <button
      className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}
      onClick={handleRequestAccess}
    >
      <Text as="p" variant="bodySm" fontWeight="medium">
        Request Access
      </Text>
    </button>
  );
};
export default ApprovalStatusButton;
