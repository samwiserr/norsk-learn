export default function SpeakingLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-lg px-6 animate-pulse text-center">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mb-4" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-12" />
        <div className="h-32 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8" />
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl mx-auto" />
      </div>
    </div>
  );
}
