import Link from "next/link";
import { Heart } from "lucide-react";

export default function SavedPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Heart className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        No saved laptops yet
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Tap the heart on any laptop to keep it here for later. Your saved picks
        will sync across devices.
      </p>
      <Link
        href="/results"
        className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Browse Recommendations
      </Link>
    </main>
  );
}
