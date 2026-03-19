"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, PenLine, Users, Languages, ChevronDown, Settings, GraduationCap } from "lucide-react";
import { loadFromLocalStorage } from "@/lib/storage";
import { isValidCEFRLevel } from "@/lib/cefr";
import { isValidLanguageCode, getTranslation } from "@/lib/languages";
import { useSessionContext } from "@/src/context/SessionContext";
import { useLanguageContext } from "@/src/context/LanguageContext";

export default function Dashboard() {
    const router = useRouter();
    const { cefrLevel } = useSessionContext();
    const { language } = useLanguageContext();
    const [ready, setReady] = useState(false);
    const [firstName] = useState("Student");
    const [showDropdown, setShowDropdown] = useState(false);

    const t = (key: any, params?: any) => getTranslation(language, key, params);

    useEffect(() => {
        // Quick auth/setup check
        const storedLanguage = loadFromLocalStorage<string>("norsk_ui_language");
        const storedLevel = loadFromLocalStorage<string>("norsk_cefr_level");

        if (!storedLanguage || !isValidLanguageCode(storedLanguage)) {
            router.push("/language-selection");
            return;
        }
        if (!storedLevel || !isValidCEFRLevel(storedLevel)) {
            router.push("/level-selection");
            return;
        }

        setReady(true);
    }, [router]);

    if (!ready) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300">
            {/* Top Header */}
            <header className="w-full bg-white dark:bg-black py-3 px-6 md:px-12 flex justify-between items-center z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Languages className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Norsk Tutor</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{firstName}</p>
                        <p className="text-xs text-slate-500">Level {cefrLevel || "A1"}</p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white dark:ring-zinc-800">
                                S
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 py-2 z-50">
                                <Link
                                    href="/settings"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <Settings className="w-4 h-4" />
                                    {t("settings")}
                                </Link>
                                <Link
                                    href="/level-selection"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    {t("changeLevel")}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Announcement Bar */}
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 py-2.5 text-center text-indigo-700 dark:text-indigo-300 text-sm font-medium border-y border-indigo-100 dark:border-indigo-900/30">
                {t("newVoiceMode")}
            </div>

            <main className="flex-grow flex flex-col items-center pt-12 pb-16 px-6 z-10">
                {/* Hero Section */}
                <div className="w-full max-w-4xl text-center mb-12 px-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        {t("welcomeBack", { name: firstName })}
                    </h1>
                    <p className="text-base text-slate-600 dark:text-slate-400">
                        {t("dashboardSubtitle")}
                    </p>
                </div>

                {/* Grid of Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">

                    {/* Speaking Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[340px]">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                            <Mic className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t("speaking")}</h2>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 flex-grow">
                            {t("speakingDesc")}
                        </p>
                        <Link
                            href="/speaking"
                            className="w-full py-2.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
                        >
                            {t("startSession")}
                        </Link>
                    </div>

                    {/* Writing Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[340px]">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                            <PenLine className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t("writing")}</h2>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 flex-grow">
                            {t("writingDesc")}
                        </p>
                        <Link
                            href="/writing"
                            className="w-full py-2.5 border border-slate-300 dark:border-zinc-700 bg-transparent text-slate-900 dark:text-white rounded-lg font-semibold text-sm text-center hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {t("startChat")}
                        </Link>
                    </div>

                    {/* Tutor Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[340px]">
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t("findTutor")}</h2>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 flex-grow">
                            {t("findTutorDesc")}
                        </p>
                        <Link
                            href="/tutors"
                            className="w-full py-2.5 border border-slate-300 dark:border-zinc-700 bg-transparent text-slate-900 dark:text-white rounded-lg font-semibold text-sm text-center hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {t("browseTutors")}
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="w-full py-8 text-center text-slate-500 dark:text-zinc-500 text-sm">
                {t("footerCopyright")}
            </footer>
        </div>
    );
}
