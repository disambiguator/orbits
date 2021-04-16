import { VercelRequest, VercelResponse } from "@vercel/node";
import { airtableList } from "../airtable";

module.exports = async (req: VercelRequest, res: VercelResponse) => {
  await airtableList("orbits")
    .then((seeds) => {
      res.status(200).send({ seeds: seeds.map((s) => s.fields) });
    })
    .catch((e) => {
      res.status(500).send({ error: e.message });
    });
};
