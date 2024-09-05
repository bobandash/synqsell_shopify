import { json } from '@remix-run/node';

type Props = {
  statusCode: number;
  message: string;
  subMessage?: string;
};

function getJSONBadgeError({ statusCode, message, subMessage }: Props) {
  return json({
    error: {
      message: message,
      ...(subMessage && {
        subMessage,
      }),
    },
    statusCode,
  });
}

export default getJSONBadgeError;
