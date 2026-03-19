export default function ReviewLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-lg px-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
