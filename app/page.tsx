"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, Users, Languages, ChevronDown, Settings, GraduationCap } from "lucide-react";
import { getTranslation } from "@/lib/languages";
import { useSessionContext } from "@/src/context/SessionContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { Card, CardContent, CardFooter } from "@/src/components/ui";
import { cn } from "@/lib/utils";
import { useAppSetupGate } from "@/src/hooks/useAppSetupGate";
import { DashboardProgressionBanner } from "@/src/components/dashboard/DashboardProgressionBanner";

export default function Dashboard() {
  const ready = useAppSetupGate("dashboard");
  const { cefrLevel } = useSessionContext();
  const { language } = useLanguageContext();
  const [firstName] = useState("Student");
  const [showDropdown, setShowDropdown] = useState(false);

  const t = (key: string, params?: Record<string, string>) => getTranslation(language, key as any, params);

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors duration-300">
      <header className="z-20 flex w-full items-center justify-between border-b border-border/80 bg-card/80 px-6 py-3 backdrop-blur md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Languages className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Norsk Tutor</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold">{firstName}</p>
            <p className="text-xs text-muted-foreground">Level {cefrLevel || "A1"}</p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-background">
                S
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-popover py-2 text-popover-foreground shadow-lg"
                role="menu"
              >
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                  onClick={() => setShowDropdown(false)}
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" />
                  {t("settings")}
                </Link>
                <Link
                  href="/level-selection"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                  onClick={() => setShowDropdown(false)}
                  role="menuitem"
                >
                  <GraduationCap className="h-4 w-4" />
                  {t("changeLevel")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="z-10 flex flex-grow flex-col items-center px-6 pb-16 pt-12">
        <div className="w-full max-w-4xl px-4">
          <DashboardProgressionBanner cefrLevel={cefrLevel} language={language} />
        </div>
        <div className="mb-12 max-w-4xl px-4 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
            {t("welcomeBack", { name: firstName })}
          </h1>
          <p className="text-base text-muted-foreground">{t("dashboardSubtitle")}</p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-2">
          <DashboardActionCard
            icon={<PenLine className="h-6 w-6 text-white" />}
            iconClassName="bg-blue-500"
            title={t("writing")}
            description={t("writingDesc")}
            href="/writing"
            cta={t("startChat")}
            ctaVariant="outline"
          />
          <DashboardActionCard
            icon={<Users className="h-6 w-6 text-white" />}
            iconClassName="bg-emerald-500"
            title={t("findTutor")}
            description={t("findTutorDesc")}
            href="/tutors"
            cta={t("browseTutors")}
            ctaVariant="outline"
          />
        </div>
      </main>

      <footer className="w-full py-8 text-center text-sm text-muted-foreground">{t("footerCopyright")}</footer>
    </div>
  );
}

function DashboardActionCard({
  icon,
  iconClassName,
  title,
  description,
  href,
  cta,
  ctaVariant,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  ctaVariant: "default" | "outline";
}) {
  return (
    <Card className="flex min-h-[340px] flex-col rounded-3xl border-border/70">
      <CardContent className="flex flex-grow flex-col p-6 pt-6">
        <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-lg", iconClassName)}>{icon}</div>
        <h2 className="mb-2 text-lg font-bold text-card-foreground">{title}</h2>
        <p className="flex-grow text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Link
          href={href}
          className={cn(
            "inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            ctaVariant === "default" &&
              "bg-primary text-primary-foreground shadow hover:opacity-90",
            ctaVariant === "outline" &&
              "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {cta}
        </Link>
      </CardFooter>
    </Card>
  );
}
