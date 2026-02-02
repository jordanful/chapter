'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">You're offline</h1>
        <p className="text-muted-foreground mb-6">
          It looks like you've lost your internet connection. Don't worry, any books you've
          downloaded are still available to read offline.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
