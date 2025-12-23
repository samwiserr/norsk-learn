"use client";

import { useContext } from "react";
import { Context } from "@/src/context/Context";
import "./ProgressBar.css";
import { CEFR_LEVELS } from "@/lib/cefr";
import { getCurrentCEFRLevel } from "@/lib/cefr-progress";
import { getTranslation } from "@/lib/languages";

const ProgressBar = () => {
  const { userProgress, language } = useContext(Context);
  const t = (key: any) => getTranslation(language, key);
  const percentage = Math.round(userProgress);
  const currentLevel = getCurrentCEFRLevel(userProgress);

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span>{t("progress")}</span>
        <strong>{percentage}%</strong>
      </div>
      <div className="progress-bar-wrapper">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
        <div className="progress-bar-markers">
          {CEFR_LEVELS.map((level, index) => {
            const position = (index / (CEFR_LEVELS.length - 1)) * 100;
            const isActive = level === currentLevel;
            const isCompleted = percentage > position;
            return (
              <span
                key={level}
                className={`progress-marker ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                style={{ left: `${position}%` }}
              >
                {level}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

