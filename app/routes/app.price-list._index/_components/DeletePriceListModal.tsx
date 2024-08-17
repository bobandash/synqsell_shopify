import { type FC, useCallback, useRef } from "react";
import { MODALS } from "../constants";
import { useFetcher } from "@remix-run/react";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";

type Props = {
  priceListIds: string[];
};

const DeletePriceListModal: FC<Props> = ({ priceListIds }) => {
  const shopify = useAppBridge();
  const fetcher = useFetcher({ key: MODALS.DELETE_PRICE_LIST });
  const formRef = useRef<HTMLFormElement>(null);
  const handleSubmitForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);
  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.DELETE_PRICE_LIST);
  }, [shopify]);

  if (!priceListIds) {
    return;
  }

  return (
    <Modal id={MODALS.DELETE_PRICE_LIST}>
      <p style={{ padding: "1rem" }}>
        By clicking this button, you will delete the price lists selected, and
        all retailers and products connected to them.{" "}
        <b>This action is irreversible.</b>
      </p>
      <fetcher.Form method="delete" ref={formRef}>
        <input type="hidden" name="intent" value={MODALS.DELETE_PRICE_LIST} />
        <input
          type="hidden"
          name="priceListIds"
          value={JSON.stringify(priceListIds)}
        />
      </fetcher.Form>
      <TitleBar title="Delete Price Lists">
        <button onClick={hideModal}>Cancel</button>
        <button
          variant={"primary"}
          tone={"critical"}
          onClick={handleSubmitForm}
        >
          Delete
        </button>
      </TitleBar>
    </Modal>
  );
};

export default DeletePriceListModal;
