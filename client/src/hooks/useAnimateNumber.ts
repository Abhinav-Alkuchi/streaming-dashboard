import { useEffect, useState } from "react";

export const useAnimatedNumber = (end: number, duration = 1200) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const totalFrames = Math.round(duration / 16);
    const increment = end / totalFrames;

    let frame = 0;

    const counter = () => {
      frame++;
      start += increment;

      if (frame < totalFrames) {
        setValue(start);
        requestAnimationFrame(counter);
      } else {
        setValue(end); // final exact value
      }
    };

    requestAnimationFrame(counter);
  }, [end, duration]);

  return value;
};