import { VercelRequest, VercelResponse } from "@vercel/node";
import Pusher from "pusher";
import * as PusherTypes from "pusher";
import { airtableDelete } from "../airtable";

const {
  APP_ID: appId,
  KEY: key,
  SECRET: secret,
  CLUSTER: cluster,
} = process.env;

const pusher = new Pusher({ appId, key, secret, cluster });

const deleteEvents = async (memberRemovalEvents) => {
  memberRemovalEvents.forEach(async (event) => {
    console.log(`deleting ${event.user_id}`);
    await airtableDelete("orbits", event.user_id);
  });
};

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  req.rawBody = JSON.stringify(req.body);
  const webhook = pusher.webhook(req);

  if (webhook.isValid()) {
    const memberRemovalEvents = webhook
      .getEvents()
      .filter(
        (event) =>
          event.channel === "presence-orbits" && event.name === "member_removed"
      );
    deleteEvents(memberRemovalEvents)
      .then(() => {
        res.status(200);
      })
      .catch(() => {
        res.status(500);
      });
  } else {
    res.status(500);
  }
};
