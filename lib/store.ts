import create, { SetState } from "zustand";

export type State = {
  canvas: HTMLCanvasElement | null;
  set: SetState<State>;
};
const useStore = create<State>((set) => ({
  set,
  canvas: null,
}));

export { useStore };
