import Pusher from "pusher";

const {
  APP_ID: appId,
  NEXT_PUBLIC_PUSHER_KEY: key,
  SECRET: secret,
  NEXT_PUBLIC_PUSHER_CLUSTER: cluster,
} = process.env;

const pusher = new Pusher({ appId, key, secret, cluster });

export default pusher;
