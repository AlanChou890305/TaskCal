// Terms of Use / Privacy Policy 文字的動態載入 loader
// 這些文字佔每個語系檔 61-68% 的體積，但只有 TermsScreen/PrivacyScreen 用得到，
// 抽出成獨立模組供這兩個畫面按需 import()，避免每次啟動都全部載入。
const TERMS_LOADERS = {
  en: () => import("./terms/en"),
  zh: () => import("./terms/zh-Hant"),
  es: () => import("./terms/es"),
};

export function loadTermsTranslations(language) {
  const loader = TERMS_LOADERS[language] || TERMS_LOADERS.en;
  return loader().then((mod) => mod.default);
}
