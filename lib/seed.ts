import { sample } from 'lodash';
import consts from './consts';
import { notes, rand } from './helpers';

export type Seed = {
  radius: number;
  theta: number;
  phi: number;
  thetaSpeed: number;
  phiSpeed: number;
  color: string;
  chord: number[];
};
export type SeedWithUser = Seed & { userId: string };
export type ServerSeed = Omit<SeedWithUser, 'chord'> & { chord: string };
export const newChord = () =>
  [sample(notes), sample(notes), sample(notes)] as [number, number, number];

export const randSeed = (): Seed => ({
  radius: rand(consts.RADIUS_MIN, consts.RADIUS_MAX),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(0, 0.5),
  phiSpeed: rand(0, 0.5),
  color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  chord: newChord(),
});
