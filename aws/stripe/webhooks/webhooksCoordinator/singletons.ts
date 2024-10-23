import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { Lambda } from 'aws-sdk';

const client = new SecretsManager();
const lambda = new Lambda();
export { client, lambda };
