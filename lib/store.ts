import create, { SetState } from "zustand";
import { Seed, randSeed } from "./seed";

export type State = {
  canvas: HTMLCanvasElement | null;
  set: SetState<State>;
  mySeed: Seed;
};
const useStore = create<State>((set) => ({
  set,
  canvas: null,
  mySeed: randSeed(),
}));

export { useStore };
