import { Text } from '@shopify/polaris';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';

type Props = {
  requiresApprovalToImport: boolean;
};

const ApprovalStatusButton: FC<Props> = ({ requiresApprovalToImport }) => {
  if (!requiresApprovalToImport) {
    return (
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']} ${sharedStyles['disabled']}`}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          No Access Needed
        </Text>
      </button>
    );
  }

  // TODO: add remaining status: Pending, granted access
  return (
    <button className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}>
      <Text as="p" variant="bodySm" fontWeight="medium">
        Request Access
      </Text>
    </button>
  );
};
export default ApprovalStatusButton;
