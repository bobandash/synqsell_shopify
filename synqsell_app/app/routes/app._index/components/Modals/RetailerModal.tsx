import { Modal, TitleBar } from '@shopify/app-bridge-react';
import type { ShopifyGlobal } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../../constants';
import { type FC, useCallback } from 'react';
import { useField, useForm } from '@shopify/react-form';
import { useNavigation, useSubmit } from '@remix-run/react';

type Props = {
  checklistItemId: string | null;
  shopify: ShopifyGlobal;
};

const RetailerModal: FC<Props> = ({ checklistItemId, shopify }) => {
  const remixSubmit = useSubmit();
  // only a single modal can be open at a time, so it's okay to use form instead of fetchers for this route
  const navigate = useNavigation();
  const isSubmitting = navigate.state === 'submitting';

  const retailerForm = useForm({
    fields: {
      intent: useField(INTENTS.RETAILER_GET_STARTED),
      checklistItemId: useField(checklistItemId),
    },
    onSubmit: async (fieldValues) => {
      const { intent, checklistItemId } = fieldValues;
      remixSubmit(
        {
          intent,
          checklistItemId,
        },
        { method: 'post' },
      );
      return { status: 'success' };
    },
  });

  const handleSubmitForm = useCallback(() => {
    retailerForm.submit();
  }, [retailerForm]);

  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.BECOME_RETAILER);
  }, [shopify]);

  if (!checklistItemId) {
    return;
  }

  return (
    <Modal id={MODALS.BECOME_RETAILER}>
      <p style={{ padding: '1rem' }}>
        By clicking this button, you agree to our Terms of Service and are ready
        to start importing products from other stores!
      </p>
      <TitleBar title="Become a retailer on SynqSell">
        <button onClick={hideModal}>Cancel</button>
        <button
          variant={'primary'}
          onClick={handleSubmitForm}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Joining SynqSell' : 'Join SynqSell'}
        </button>
      </TitleBar>
    </Modal>
  );
};

export default RetailerModal;
