import { VercelRequest, VercelResponse } from "@vercel/node";
import Pusher from "pusher";
import { airtablePut } from "../airtable";
import { Seed } from "../seed";

const {
  APP_ID: appId,
  KEY: key,
  SECRET: secret,
  CLUSTER: cluster,
} = process.env;

const pusher = new Pusher({ appId, key, secret, cluster });

const addToOrbits = (seed: Seed) => airtablePut("orbits", seed);

const broadcastNeighbor = (seed: Seed) =>
  Promise.all([
    pusher.trigger("orbits", "new-neighbor", { seed }),
    addToOrbits(seed),
  ]);

module.exports = async (
  req: VercelRequest & { body: Seed },
  res: VercelResponse
) => {
  await broadcastNeighbor(JSON.parse(req.body).seed)
    .then(() => {
      res.status(200).send("sent event succesfully");
    })
    .catch((e) => {
      console.error(e.message);
      res.status(500).send({ error: e.message });
    });
};
