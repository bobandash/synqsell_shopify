import { Modal, type ShopifyGlobal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../../constants';
import { useNavigation, useSubmit } from '@remix-run/react';
import { Link } from '@shopify/polaris';
import { type FC, useCallback } from 'react';
import { useField, useForm } from '@shopify/react-form';

type Props = {
  checklistItemId: string | null;
  shopify: ShopifyGlobal;
};

const SupplierModal: FC<Props> = ({ checklistItemId, shopify }) => {
  const remixSubmit = useSubmit();
  // only a single modal can be open at a time, so it's okay to use form instead of fetchers for this route
  const navigate = useNavigation();
  const isSubmitting = navigate.state === 'submitting';

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
          To become a supplier, we ask that you have a proven sales record and
          the products you're looking to distribute don't need a license for
          retailers to sell. If you do not meet these requirements but still
          wish to become a supplier, please reach out to us at{' '}
          <Link url="mailto:synqsell@gmail.com">synqsell@gmail.com</Link> with
          an explanation.
        </p>
      </div>
      <TitleBar title="Become a supplier on SynqSell">
        <button onClick={hideModal}>Cancel</button>
        <button
          variant={'primary'}
          onClick={handleSubmitForm}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Requesting Access' : 'Request Access'}
        </button>
      </TitleBar>
    </Modal>
  );
};

export default SupplierModal;
