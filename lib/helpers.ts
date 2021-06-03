import { throttle } from "lodash";

export const printEverySecond = throttle((seeds, points) => {
  console.log(seeds, points);
}, 1000);

export const rand = (min: number, max: number) => Math.random() * max + min;
