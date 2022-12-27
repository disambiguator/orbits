import { VercelRequest, VercelResponse } from '@vercel/node';
import { airtableList } from '../../lib/airtable';
import { ServerSeed, newChord } from '../../lib/seed';

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  await airtableList('orbits')
    .then((seeds) => {
      const parsedSeeds = seeds.map((s) => {
        const { chord, ...rest } = s.fields as ServerSeed;
        return {
          chord: chord ? chord.split(',').map((c) => +c) : newChord(),
          ...rest,
        };
      });
      res.status(200).send({
        seeds: parsedSeeds,
      });
    })
    .catch((e) => {
      res.status(500).send({ error: e.message });
    });
};
