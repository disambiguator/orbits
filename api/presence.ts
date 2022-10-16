import { VercelRequest, VercelResponse } from '@vercel/node';
import { airtableDelete } from '../lib/airtable';
import pusher from '../lib/pusher';

const deleteEvents = async (memberRemovalEvents: { user_id: string }[]) => {
  if (memberRemovalEvents.length > 0) {
    await airtableDelete(
      'orbits',
      memberRemovalEvents.map((e) => e.user_id),
    );
  }
};

module.exports = async (
  req: VercelRequest & { rawBody: string },
  res: VercelResponse,
) => {
  req.rawBody = JSON.stringify(req.body);
  const webhook = pusher.webhook(req);

  if (webhook.isValid()) {
    const memberRemovalEvents = webhook.getEvents().filter((event) => {
      console.debug(event);
      return (
        event.channel === 'presence-orbits' && event.name === 'member_removed'
      );
    });
    // @ts-expect-error - fix this so user_ids are in events
    deleteEvents(memberRemovalEvents)
      .then(() => {
        res.status(200).end();
      })
      .catch(() => {
        console.error('failed webhook');
        res.status(500).end();
      });
  } else {
    console.error('webhook invalid');
    res.status(401).end();
  }
};
