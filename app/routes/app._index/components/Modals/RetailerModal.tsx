import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { FETCHER_KEYS, INTENTS, MODALS } from "../../constants";
import { useFetcher } from "@remix-run/react";
import { useEffect, useRef } from "react";

const RetailerModal = () => {
  const fetcher = useFetcher({ key: FETCHER_KEYS.RETAILER_GET_STARTED });
  const formRef = useRef<HTMLFormElement>(null);
  const handleSubmitForm = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  useEffect(() => {
    console.log(fetcher.data);
  }, [fetcher.data]);

  return (
    <Modal id={MODALS.BECOME_RETAILER}>
      <p style={{ padding: "1rem" }}>
        By clicking this button, you agree to our Terms of Service and are ready
        to start importing products from other stores!
      </p>
      <fetcher.Form method="post" ref={formRef}>
        <input
          type="hidden"
          name="intent"
          value={INTENTS.RETAILER_GET_STARTED}
        />
      </fetcher.Form>
      <TitleBar title="Become a retailer on SynqSell">
        <button>Cancel</button>
        <button variant={"primary"} onClick={handleSubmitForm}>
          Join SynqSell
        </button>
      </TitleBar>
    </Modal>
  );
};

export default RetailerModal;
