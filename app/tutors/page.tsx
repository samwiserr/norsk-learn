"use client";

import Link from "next/link";
import { Search, ChevronDown, MessageSquare, CheckCircle, Star, Languages, Settings, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { getTranslation } from "@/lib/languages";

interface Tutor {
    id: number;
    name: string;
    roleKey: "certifiedTeacher" | "communityTutor";
    role: string;
    certified: boolean;
    rating: number;
    lessons: number;
    rate: number;
    about: string;
    avatar: string;
}

const TUTORS: Tutor[] = [
    {
        id: 1,
        name: "Eirik Hansen",
        roleKey: "certifiedTeacher",
        role: "Certified Teacher",
        certified: true,
        rating: 5.0,
        lessons: 124,
        rate: 35,
        about: "Specializing in grammar and business Norwegian. I have 5 years of experience teaching students from A1 to C1 levels...",
        avatar: "bg-blue-100",
    },
    {
        id: 2,
        name: "Ingrid Solberg",
        roleKey: "communityTutor",
        role: "Community Tutor",
        certified: false,
        rating: 4.8,
        lessons: 42,
        rate: 18,
        about: "Friendly conversation practice! Let's talk about Norwegian culture, travel, and daily life to improve your speaking confidence.",
        avatar: "bg-pink-100",
    },
    {
        id: 3,
        name: "Jonas Berg",
        roleKey: "certifiedTeacher",
        role: "Certified Teacher",
        certified: true,
        rating: 4.9,
        lessons: 89,
        rate: 40,
        about: "Efficient exam preparation (Norskprøve). I focus on writing corrections and advanced pronunciation techniques.",
        avatar: "bg-green-100",
    },
];

export default function TutorsPage() {
    const { language } = useLanguageContext();
    const [showDropdown, setShowDropdown] = useState(false);

    const t = (key: any, params?: any) => getTranslation(language, key, params);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
            {/* Navigation Header */}
            <header className="w-full bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 py-4 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Languages className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">Norsk Tutor</span>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                        >
                            {t("dashboard")}
                        </Link>
                        <span className="font-semibold text-blue-600">{t("findTutors")}</span>
                    </nav>

                    {/* User Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-slate-200 dark:ring-zinc-800">
                                S
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-600" />
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

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
                        {t("findNorwegianTutor")}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        {t("bookLessons")}
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row items-center gap-3 mb-10">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t("searchPlaceholder")}
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-3 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                            {t("availability")}
                        </button>
                        <button className="flex-1 md:flex-none px-6 py-3 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                            <span className="text-lg">≡</span>
                            {t("price")}
                        </button>
                        <button className="flex-1 md:flex-none px-6 py-3 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                            {t("moreFilters")}
                        </button>
                    </div>
                </div>

                {/* Tutor Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {TUTORS.map((tutor) => (
                        <div
                            key={tutor.id}
                            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 hover:shadow-lg transition-shadow flex flex-col min-h-[340px]"
                        >
                            {/* Profile Image with Badge */}
                            <div className="relative mb-4 inline-block">
                                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-slate-700", tutor.avatar)}>
                                    {(tutor.name.split(' ')[0] || "").charAt(0)}{(tutor.name.split(' ')[1] || "").charAt(0)}
                                </div>
                                {tutor.certified && (
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                                        <CheckCircle className="w-5 h-5 text-blue-600 fill-blue-600" />
                                    </div>
                                )}
                            </div>

                            {/* Name and Role */}
                            <div className="mb-3">
                                <div className="flex items-center gap-1 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tutor.name}</h3>
                                    {tutor.certified && (
                                        <CheckCircle className="w-4 h-4 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{t(tutor.roleKey)}</span>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "w-4 h-4",
                                                star <= Math.floor(tutor.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                                            )}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {tutor.rating.toFixed(1)}
                                </span>
                                <span className="text-sm text-slate-500">
                                    ({t("lessons", { count: tutor.lessons })})
                                </span>
                            </div>

                            {/* About */}
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed flex-grow">
                                {tutor.about}
                            </p>

                            {/* Rate */}
                            <div className="mb-4">
                                <span className="text-sm text-slate-600 dark:text-slate-400">{t("rate")} </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    ${tutor.rate}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">/hr</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                                    {t("bookTrial")}
                                </button>
                                {tutor.id === 2 && (
                                    <button className="w-full py-3 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors">
                                        {t("message")}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* View All Link */}
                <div className="text-center">
                    <Link
                        href="#"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {t("viewAllTutors", { count: 142 })}
                        <span>→</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
