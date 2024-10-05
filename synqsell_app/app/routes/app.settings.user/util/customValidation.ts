import type { ErrorContent } from "@shopify/react-form";

export const isEmail = (error: ErrorContent<string>) => (input: any) => {
  const isRegex = String(input)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );

  if (!isRegex) {
    return error.toString();
  }
};
