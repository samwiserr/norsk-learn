export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  );
}
