import React from "react";
import logo from "../../assets/header-logo.svg";
import { useI18n } from "../../i18n.jsx";

export default function HeaderLogo({ className = "" }) {
  const { t } = useI18n();
  return (
    <img
      src={logo}
      alt={t('app.title')}
      className={`select-none mt-2 mb-6 w-full max-w-xl h-auto ${className}`}
    />
  );
}