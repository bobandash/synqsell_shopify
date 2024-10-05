import { Modal, type ShopifyGlobal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../../constants';
import { useSubmit } from '@remix-run/react';
import { type FC, useCallback } from 'react';
import { useField, useForm } from '@shopify/react-form';

type Props = {
  checklistItemId: string | null;
  shopify: ShopifyGlobal;
};

const SupplierModal: FC<Props> = ({ checklistItemId, shopify }) => {
  const remixSubmit = useSubmit();

  const supplierForm = useForm({
    fields: {
      intent: useField(INTENTS.SUPPLIER_GET_STARTED),
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

  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.BECOME_SUPPLIER);
  }, [shopify]);

  const handleSubmitForm = useCallback(() => {
    supplierForm.submit();
  }, [supplierForm]);

  if (!checklistItemId) {
    return;
  }

  return (
    <Modal id={MODALS.BECOME_SUPPLIER}>
      <div style={{ padding: '1rem' }}>
        <p>
          By clicking this button, you agree to our Terms of Service and are
          ready to start listing products on Synqell for other retailers to
          import!
        </p>
        <br />
        <p>
          To become a supplier, we ask that your annual sales total at least
          $5000 USD. If you do not meet this threshold but still wish to become
          a supplier, please reach out to us at{' '}
          <a href="mailto:support@synqsell.com">support@synqsell.com</a> with an
          explanation.
        </p>
      </div>
      <TitleBar title="Become a supplier on SynqSell">
        <button onClick={hideModal}>Cancel</button>
        <button variant={'primary'} onClick={handleSubmitForm}>
          Request Access
        </button>
      </TitleBar>
    </Modal>
  );
};

export default SupplierModal;
