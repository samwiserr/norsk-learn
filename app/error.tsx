"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        // Error handled by error boundary UI
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-900">
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <pre className="bg-white p-4 rounded-lg border border-red-200 mb-6 overflow-auto max-w-full text-xs">
                {error.message}
                {"\n"}
                {error.stack}
            </pre>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
