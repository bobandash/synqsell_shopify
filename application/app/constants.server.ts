// constants that depend on env variables
const getServiceName = (env: string) => {
  switch (env) {
    case 'development':
      return 'SynqSell-Dev';
    case 'staging':
      return 'SynqSell-Staging';
    case 'production':
      return 'SynqSell';
    default:
      return 'SynqSell';
  }
};

const getCarrierServiceCallbackUrl = (sessionId: string) => {
  const callbackUrl = process.env.CARRIER_SERVICE_CALLBACK_URL;
  if (!callbackUrl) {
    throw new Error('Callback url is not defined in environment variables.');
  }
  return `${callbackUrl}?sessionId=${sessionId}`;
};

export const getCarrierServiceDetails = (sessionId: string) => {
  return {
    name: getServiceName(process.env.NODE_ENV),
    callbackUrl: getCarrierServiceCallbackUrl(sessionId),
  };
};
