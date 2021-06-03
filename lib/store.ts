import create, { SetState } from "zustand";
import { Seed, randSeed } from "./seed";

export type State = {
  canvas: HTMLCanvasElement | null;
  mode: "design" | "viewing";
  set: SetState<State>;
  mySeed: Seed;
};
const useStore = create<State>((set) => ({
  set,
  mode: "design",
  canvas: null,
  mySeed: randSeed(),
}));

export { useStore };
