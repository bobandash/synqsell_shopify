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
    shopify.modal.hide(MODALS.BECOME_SUPPLIER);
  }, [shopify]);

  if (!checklistItemId) {
    return;
  }

  return (
    <Modal id={MODALS.BECOME_SUPPLIER}>
      <div style={{ padding: "1rem" }}>
        <p>
          By clicking this button, you agree to our Terms of Service and are
          ready to start listing products on Synqell for other retailers to
          import!
        </p>
        <br />
        <p>
          To become a supplier, we ask that your annual sales total at least
          $5000 USD. If you do not meet this threshold but still wish to become
          a supplier, please reach out to us at{" "}
          <a href="mailto:support@synqsell.com">support@synqsell.com</a> with an
          explanation.
        </p>
      </div>
      <fetcher.Form method="post" ref={formRef}>
        <input
          type="hidden"
          name="intent"
          value={INTENTS.SUPPLIER_GET_STARTED}
        />
        <input type="hidden" name="checklistItemId" value={checklistItemId} />
      </fetcher.Form>
      <TitleBar title="Become a supplier on SynqSell">
        <button onClick={hideModal}>Cancel</button>
        <button variant={"primary"} onClick={handleSubmitForm}>
          Request Access
        </button>
      </TitleBar>
    </Modal>
  );
};

export default SupplierModal;
