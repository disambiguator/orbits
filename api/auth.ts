import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import pusher from '../lib/pusher';
import { Seed } from '../lib/seed';

module.exports = async (
  req: VercelRequest & { body: Seed },
  res: VercelResponse,
) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const presenceData = { user_id: uuidv4() };

  const auth = pusher.authenticate(socketId, channel, presenceData);
  res.send(auth);
};
