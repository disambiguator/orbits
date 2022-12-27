import { VercelRequest, VercelResponse } from '@vercel/node';
import { airtablePut } from '../../lib/airtable';
import pusher from '../../lib/pusher';
import { Seed } from '../../lib/seed';

const addToOrbits = (seed: Seed) => {
  return airtablePut('orbits', seed);
};

const broadcastNeighbor = (seed: Seed) =>
  Promise.all([
    pusher.trigger('orbits', 'new-neighbor', { seed }),
    addToOrbits(seed),
  ]);

module.exports = async (
  req: VercelRequest & { body: Seed },
  res: VercelResponse,
) => {
  await broadcastNeighbor(JSON.parse(req.body).seed)
    .then(() => {
      res.status(200).send('sent event succesfully');
    })
    .catch((e) => {
      console.error(e.message);
      res.status(500).send({ error: e.message });
    });
};
