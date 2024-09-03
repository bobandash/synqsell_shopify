import { Modal, TitleBar } from '@shopify/app-bridge-react';
import type { ShopifyGlobal } from '@shopify/app-bridge-react';
import { type FC, useCallback } from 'react';
import { MODALS } from '../../constants';

type Props = {
  message: { name: string; content: string };
  shopify: ShopifyGlobal;
};

const MessageModal: FC<Props> = ({ message, shopify }) => {
  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.MESSAGE);
  }, [shopify]);

  return (
    <Modal id={MODALS.MESSAGE}>
      <p style={{ padding: '1rem' }}>{message.content}</p>
      <TitleBar title={`${message.name}'s Request`}>
        <button onClick={hideModal}>Close</button>
      </TitleBar>
    </Modal>
  );
};

export default MessageModal;
