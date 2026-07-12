import { useEffect } from "react";
import { Platform } from "react-native";

export const useWebSetup = (appName) => {
  // Web font injection
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const cleanupElements = [];

      const fontsLink = document.createElement("link");
      fontsLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap";
      fontsLink.rel = "stylesheet";
      document.head.appendChild(fontsLink);
      cleanupElements.push(fontsLink);

      const style = document.createElement("style");
      style.textContent = `
        [dir] > * {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans TC',
            system-ui, sans-serif !important;
        }
        [dir] > svg,
        [dir] > * > svg,
        [dir] [role="img"],
        [dir] [aria-label*="icon" i] {
          font-family: inherit !important;
        }
        input, textarea, select {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans TC',
            system-ui, sans-serif !important;
        }
      `;
      document.head.appendChild(style);
      cleanupElements.push(style);

      return () => {
        cleanupElements.forEach((el) => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      };
    }
  }, []);

  // Web title observer
  useEffect(() => {
    if (Platform.OS === "web") {
      const setTitle = () => {
        document.title = appName;
      };
      setTitle();
      const observer = new MutationObserver(() => {
        if (document.title !== appName) {
          document.title = appName;
        }
      });
      const titleTag = document.querySelector("title");
      if (titleTag) {
        observer.observe(titleTag, { childList: true });
      }

      return () => observer.disconnect();
    }
  }, []);
};
