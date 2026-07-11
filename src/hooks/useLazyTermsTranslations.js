import { useEffect, useState } from "react";
import { loadTermsTranslations } from "../locales/termsLocales";

// TermsScreen/PrivacyScreen 專用：按需載入 Terms/Privacy 文字，
// language 切換時重新載入對應語系
export function useLazyTermsTranslations(language) {
  const [termsT, setTermsT] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setTermsT(null);

    loadTermsTranslations(language).then((loaded) => {
      if (!cancelled) {
        setTermsT(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return termsT;
}
