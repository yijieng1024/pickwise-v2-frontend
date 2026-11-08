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
  // Apple shoots the MacBook Pro on black, so a white tile would frame each
  // photo (same rule as LaptopCard).
  const darkPhoto = /macbook pro/i.test(name);
  const tile = darkPhoto ? "bg-black" : "bg-white";
  const blend = darkPhoto ? "" : "mix-blend-multiply dark:mix-blend-normal";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("group relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-3xl p-8", tile)}>
        <Image
          src={images[selected] ?? images[0]}
          alt={name}
          width={600}
          height={600}
          priority
          className={cn("h-full w-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 motion-safe:animate-float", blend)}
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
                "size-16 cursor-pointer rounded-xl transition-colors",
                tile,
                i === selected
                  ? "border-brand border-[1.5px] p-1"
                  : "border-line hover:border-brand/40 border",
              )}
            >
              <Image
                src={src}
                alt=""
                width={80}
                height={80}
                className={cn("h-full w-full object-contain", blend)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
