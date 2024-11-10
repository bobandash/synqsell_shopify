import { json } from '@remix-run/node';

export const loader = () => {
  return json({ message: 'Health check for ECS was successful' });
};
