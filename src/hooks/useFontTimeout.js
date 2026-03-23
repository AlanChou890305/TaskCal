import { useState, useEffect } from "react";

export const useFontTimeout = (ms = 3000) => {
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Font loading timeout - continuing anyway");
      setFontTimeout(true);
    }, ms);
    return () => clearTimeout(timer);
  }, []);

  return fontTimeout;
};
