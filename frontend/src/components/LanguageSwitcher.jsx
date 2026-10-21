import { useLanguage } from "../i18n/LanguageContext.jsx";

// =============================================================================
// LanguageSwitcher.jsx — compact "EN | BN" segmented toggle for the navbar.
// =============================================================================
export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t("lang.label")}>
      {[
        { code: "en", label: "EN", title: t("lang.en") },
        { code: "bn", label: "BN", title: t("lang.bn") },
      ].map(({ code, label, title }) => (
        <button
          key={code}
          type="button"
          className={`lang-switch-btn ${lang === code ? "is-active" : ""}`}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          title={title}
        >
          {label}
        </button>
      ))}
    </div>
  );
}