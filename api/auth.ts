import { VercelRequest, VercelResponse } from "@vercel/node";
import Pusher from "pusher";
import { v4 as uuidv4 } from "uuid";
import { Seed } from "../seed";

const {
  APP_ID: appId,
  KEY: key,
  SECRET: secret,
  CLUSTER: cluster,
} = process.env;

const pusher = new Pusher({
  appId,
  key,
  secret,
  cluster,
});

module.exports = async (
  req: VercelRequest & { body: Seed },
  res: VercelResponse
) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const presenceData = { user_id: uuidv4() };

  const auth = pusher.authenticate(socketId, channel, presenceData);
  res.send(auth);
};
