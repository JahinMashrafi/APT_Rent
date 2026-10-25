import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-800 border-t border-gray-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-xs font-mono tracking-widest text-gray-400">
          {t("footer.brand")}
        </p>
      </div>
    </footer>
  );
}