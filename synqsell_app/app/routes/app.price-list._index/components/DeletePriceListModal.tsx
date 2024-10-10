import { type FC, useCallback } from 'react';
import { INTENTS, MODALS } from '../constants';
import { Modal, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Form } from '@shopify/polaris';
import { useField, useForm } from '@shopify/react-form';
import { useNavigation, useSubmit as useRemixSubmit } from '@remix-run/react';

type Props = {
  priceListIds: string[];
};

const DeletePriceListModal: FC<Props> = ({ priceListIds }) => {
  const shopify = useAppBridge();

  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.DELETE_PRICE_LIST);
  }, [shopify]);

  const remixSubmit = useRemixSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const { submit } = useForm({
    fields: {
      intent: useField(INTENTS.DELETE_PRICE_LIST),
      priceListIds: useField(priceListIds),
    },
    onSubmit: async (fieldValues) => {
      remixSubmit(
        {
          intent: fieldValues.intent,
          priceListIds: JSON.stringify(fieldValues.priceListIds),
        },
        { method: 'delete' },
      );
      return { status: 'success' };
    },
  });

  if (!priceListIds) {
    return;
  }

  return (
    <Modal id={MODALS.DELETE_PRICE_LIST}>
      <p style={{ padding: '1rem' }}>
        By clicking this button, you will delete the price lists selected, and
        all retailers and products connected to them.{' '}
        <b>This action is irreversible.</b>
      </p>
      <Form onSubmit={submit}>
        <input type="hidden" name="intent" value={MODALS.DELETE_PRICE_LIST} />
        <input
          type="hidden"
          name="priceListIds"
          value={JSON.stringify(priceListIds)}
        />
      </Form>
      <TitleBar title="Delete Price List(s)">
        <button onClick={hideModal}>Cancel</button>
        <button
          variant={'primary'}
          tone={'critical'}
          onClick={submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting' : 'Delete'}
        </button>
      </TitleBar>
    </Modal>
  );
};

export default DeletePriceListModal;
