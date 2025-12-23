"use client";

import { useContext } from "react";
import { Context } from "@/src/context/Context";
import { getTranslation } from "@/lib/languages";

const Settings = () => {
  const { language } = useContext(Context);
  const t = (key: any) => getTranslation(language, key);

  return (
    <button
      type="button"
      className="sidebar-bottom-item"
      onClick={() => {
        // Placeholder for future settings functionality
      }}
    >
      <span>⚙️</span>
      <span>{t("settings")}</span>
    </button>
  );
};

export default Settings;

