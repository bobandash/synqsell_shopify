import { Modal, type ShopifyGlobal, TitleBar } from "@shopify/app-bridge-react";
import { FETCHER_KEYS, INTENTS, MODALS } from "../../constants";
import { useFetcher } from "@remix-run/react";
import { type FC, useCallback, useRef } from "react";

type Props = {
  checklistItemId: string | null;
  shopify: ShopifyGlobal;
};

const SupplierModal: FC<Props> = ({ checklistItemId, shopify }) => {
  const fetcher = useFetcher({ key: FETCHER_KEYS.SUPPLIER_GET_STARTED });
  const formRef = useRef<HTMLFormElement>(null);
  const handleSubmitForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);
  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.BECOME_RETAILER);
  }, [shopify]);

  if (!checklistItemId) {
    return;
  }

  return (
    <Modal id={MODALS.BECOME_SUPPLIER}>
      <p style={{ padding: "1rem" }}>
        By clicking this button, you agree to our Terms of Service and are ready
        to start importing products from other stores!
      </p>
      <fetcher.Form method="post" ref={formRef}>
        <input
          type="hidden"
          name="intent"
          value={INTENTS.SUPPLIER_GET_STARTED}
        />
        <input type="hidden" name="checklistItemId" value={checklistItemId} />
      </fetcher.Form>
      <TitleBar title="Become a retailer on SynqSell">
        <button onClick={hideModal}>Cancel</button>
        <button variant={"primary"} onClick={handleSubmitForm}>
          Join SynqSell
        </button>
      </TitleBar>
    </Modal>
  );
};

export default SupplierModal;
