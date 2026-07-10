import Link from "next/link";
import { Heart } from "lucide-react";

export default function SavedPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <div className="bg-brand-tint text-brand mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <Heart className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        No saved laptops yet
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Tap the heart on any laptop to keep it here for later. Your saved picks
        will sync across devices.
      </p>
      <Link
        href="/laptops"
        className="bg-brand rounded-full px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        Browse laptops
      </Link>
    </main>
  );
}
