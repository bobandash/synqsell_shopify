import { secretsManagerClient } from '~/lib/singletons';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import errorHandler from './errorHandler.server';

async function getSecrets<T>(secretsArn: string) {
  try {
    const response = await secretsManagerClient.send(
      new GetSecretValueCommand({
        SecretId: secretsArn,
      }),
    );
    const secretString = response.SecretString;
    if (!secretString) {
      throw new Error('There are no secrets in the secrets manager arn.');
    }
    return JSON.parse(secretString) as T;
  } catch (error) {
    throw errorHandler(error, 'Failed to get secrets.', getSecrets, {
      secretsArn,
    });
  }
}

export default getSecrets;
