import consts from "./consts";
import { rand } from "./helpers";

export type Seed = {
  radius: number;
  theta: number;
  phi: number;
  thetaSpeed: number;
  phiSpeed: number;
  color: string;
};

export const randSeed = (): Seed => ({
  radius: rand(consts.RADIUS_MIN, consts.RADIUS_MAX),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(0, 0.5),
  phiSpeed: rand(0, 0.5),
  color: "#" + Math.floor(Math.random() * 16777215).toString(16),
});
