import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export const secretsManagerClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'us-east-2',
});
