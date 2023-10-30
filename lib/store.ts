import { AudioListener } from 'three';
import { StoreApi, create } from 'zustand';
import { Seed, randSeed } from './seed';

export type State = {
  canvas: HTMLCanvasElement | null;
  set: StoreApi<State>['setState'];
  mySeed: Seed;
  listener: AudioListener | null;
};

export const useStore = create<State>((set) => ({
  set,
  canvas: null,
  mySeed: randSeed(),
  listener: null,
}));

export const useCanvas = () => useStore((state) => state.canvas)!;
