// constants that depend on the environment
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

export const CARRIER_SERVICE = {
  name: getServiceName(process.env.NODE_ENV),
  callbackUrl: process.env.CARRIER_SERVICE_CALLBACK_URL,
};
