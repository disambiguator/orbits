import { throttle } from "lodash";

export const printEverySecond = throttle((seeds, points) => {
  console.log(seeds, points);
}, 1000);
