import { range, throttle } from 'lodash';
export const printEverySecond = throttle((seeds, points) => {
  console.log(seeds, points);
}, 1000);

export const rand = (min: number, max: number) => Math.random() * max + min;

export const notes = range(-21, 21).map((i) => 440 * 2 ** (i / 12));
