export default function LevelSelectionLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-xl px-6 space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
        <div className="grid grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
