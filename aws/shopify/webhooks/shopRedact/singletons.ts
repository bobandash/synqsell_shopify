import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager();

export { client };
