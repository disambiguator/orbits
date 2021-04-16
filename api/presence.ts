import { VercelRequest, VercelResponse } from "@vercel/node";
import Pusher from "pusher";
import { airtableDelete } from "../airtable";

const {
  APP_ID: appId,
  KEY: key,
  SECRET: secret,
  CLUSTER: cluster,
} = process.env;

const pusher = new Pusher({ appId, key, secret, cluster });

const deleteEvents = async (memberRemovalEvents) => {
  if (memberRemovalEvents.length > 0) {
    await airtableDelete(
      "orbits",
      memberRemovalEvents.map((e) => e.user_id)
    );
  }
};

module.exports = async (
  req: VercelRequest & { rawBody: string },
  res: VercelResponse
) => {
  req.rawBody = JSON.stringify(req.body);
  const webhook = pusher.webhook(req);

  if (webhook.isValid()) {
    const memberRemovalEvents = webhook.getEvents().filter((event) => {
      console.debug(event);
      return (
        event.channel === "presence-orbits" && event.name === "member_removed"
      );
    });
    deleteEvents(memberRemovalEvents)
      .then(() => {
        res.status(200).end();
      })
      .catch(() => {
        console.error("failed webhook");
        res.status(500).end();
      });
  } else {
    console.error("webhook invalid");
    res.status(401).end();
  }
};
