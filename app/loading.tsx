export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-2xl px-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
