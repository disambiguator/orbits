import Pusher from 'pusher';
import env from './env';

const {
  APP_ID: appId,
  NEXT_PUBLIC_PUSHER_KEY: key,
  SECRET: secret,
  NEXT_PUBLIC_PUSHER_CLUSTER: cluster,
} = env;

const pusher = new Pusher({ appId, key, secret, cluster });

export default pusher;
