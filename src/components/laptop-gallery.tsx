"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface LaptopGalleryProps {
  images: string[];
  name: string;
}

/** Details-page hero gallery: large photo + one selectable thumbnail per image. */
export function LaptopGallery({ images, name }: LaptopGalleryProps) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-3xl bg-white p-8">
        <Image
          src={images[selected] ?? images[0]}
          alt={name}
          width={600}
          height={600}
          priority
          className="h-full w-full object-contain mix-blend-multiply drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 dark:mix-blend-normal motion-safe:animate-float"
        />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Show photo ${i + 1} of ${name}`}
              aria-current={i === selected}
              className={cn(
                "h-16 w-16 cursor-pointer rounded-xl transition-colors",
                i === selected
                  ? "border-brand border-[1.5px] bg-white p-1"
                  : "border-line hover:border-brand/40 border bg-white",
              )}
            >
              <Image
                src={src}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
