"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const ACTIVE_LINK = '[aria-current="page"]';
const SLIDE_MS = 500;
/** How long to wait for a link that is not mounted yet: the admin sidebar swaps
 * its page list 150 ms after a navigation into another group. */
const AWAIT_LINK_MS = 300;

type Box = { x: number; y: number; w: number; h: number };

/** Where `el` sits in `host`, ignoring any scale on an ancestor: the header
 * island scales as it enters. */
function measure(el: Element, host: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const scale = h.width / host.offsetWidth || 1;
  return {
    x: (r.left - h.left) / scale + host.scrollLeft,
    y: (r.top - h.top) / scale + host.scrollTop,
    w: r.width / scale,
    h: r.height / scale,
  };
}

/** The most the pill grows along its travel, whatever the distance: on a long
 * hop a stretch proportional to it would stop being subtle. */
const MAX_STRETCH_PX = 28;

/** [offset, progress, lead, trail, cross]. Progress runs 0 to 1 over the whole
 * pill. Lead and trail push that edge forward, in fractions of the stretch. Cross
 * is plain px: the pill thins as it stretches and bulges
 * as it lands. */
const STAGES = [
  [0.38, 0.55, 0.6, -0.4, -1.5], // stretched: the front runs ahead
  [0.58, 1, 0.21, -0.3, -0.75], // the front overshoots, the back still behind
  [0.74, 1, -0.07, 0.13, 1], // the back catches up: squashed
  [0.88, 1, 0.03, -0.02, -0.25], // spring-back
] as const;

function slideKeyframes(from: Box, to: Box): Keyframe[] {
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
  const [start, size] = horizontal ? (["x", "w"] as const) : (["y", "h"] as const);
  const [crossStart, crossSize] = horizontal ? (["y", "h"] as const) : (["x", "w"] as const);
  const dir = to[start] >= from[start] ? 1 : -1;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const stretch = Math.min(MAX_STRETCH_PX, Math.abs(to[start] - from[start]) * 0.3);

  const frame = (box: Box, offset: number): Keyframe => ({
    offset,
    easing: "ease-in-out",
    transform: `translate(${box.x}px, ${box.y}px)`,
    width: `${box.w}px`,
    height: `${box.h}px`,
  });

  const stages = STAGES.map(([offset, progress, lead, trail, cross]) => {
    const low = lerp(from[start], to[start], progress) + (dir > 0 ? trail : lead) * dir * stretch;
    const high =
      lerp(from[start] + from[size], to[start] + to[size], progress) +
      (dir > 0 ? lead : trail) * dir * stretch;
    const box = { ...to };
    box[start] = low;
    box[size] = high - low;
    box[crossStart] = lerp(from[crossStart], to[crossStart], progress) - cross;
    box[crossSize] = lerp(from[crossSize], to[crossSize], progress) + cross * 2;
    return frame(box, offset);
  });

  return [frame(from, 0), ...stages, frame(to, 1)];
}

/**
 * The selected background of a nav, sliding between links with a stretch and a
 * jelly spring-back. Renders inside the links' parent (the host), which needs
 * `relative isolate`, and follows whichever link has aria-current="page". The
 * links keep their own background until this has placed itself (globals.css),
 * so the first paint and a page without JavaScript still show the selection.
 *
 * Geometry is written straight to the element, and the slide is a Web Animation
 * over those styles: an in-flight slide can be measured and restarted from
 * where it is, and a resize can move the resting position underneath it.
 */
export function NavIndicator({
  activeKey,
  hidden = false,
  className,
}: {
  /** Changes when the user navigates. Only that slides; anything else that
   * moves the link, such as collapsing the sidebar, follows without one. */
  activeKey: string;
  /** Fades the pill out, for a list that is leaving. */
  hidden?: boolean;
  className?: string;
}) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const placedKey = useRef(activeKey);
  const visible = useRef(false);
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animation = useRef<Animation | undefined>(undefined);
  const observer = useRef<ResizeObserver | undefined>(undefined);
  const observed = useRef<Element | null>(null);

  const rest = (pill: HTMLElement, box: Box) => {
    pill.style.transform = `translate(${box.x}px, ${box.y}px)`;
    pill.style.width = `${box.w}px`;
    pill.style.height = `${box.h}px`;
  };

  // No dependencies on purpose: a list can swap its links with no change of
  // page, so this reconciles on every commit. It writes no React state.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const host = pill?.parentElement;
    if (!pill || !host) return;

    const hide = () => {
      animation.current?.cancel();
      pill.style.opacity = "0";
      visible.current = false;
      placedKey.current = activeKey;
    };

    const link = host.querySelector(ACTIVE_LINK);
    const navigated = activeKey !== placedKey.current;

    if (!link) {
      if (!visible.current) return;
      if (!navigated) hide();
      else waiting.current ??= setTimeout(hide, AWAIT_LINK_MS);
      return;
    }
    clearTimeout(waiting.current);
    waiting.current = undefined;
    if (!host.offsetWidth) return; // hidden at this breakpoint

    if (observed.current !== link) {
      if (observed.current) observer.current?.unobserve(observed.current);
      observer.current?.observe(link);
      observed.current = link;
    }

    const to = measure(link, host);
    const from = measure(pill, host);
    const moved = Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = host.dataset.navPillReady === undefined;

    if (first) {
      // Takes over from the link's background in one paint, with no fade.
      pill.style.transition = "none";
    }
    rest(pill, to);
    if (navigated && visible.current && moved && !reduced) {
      animation.current?.cancel();
      animation.current = pill.animate(slideKeyframes(from, to), SLIDE_MS);
    }
    pill.style.opacity = hidden ? "0" : "1";
    if (first) {
      host.dataset.navPillReady = "";
      pill.getBoundingClientRect();
      pill.style.transition = "";
    }
    placedKey.current = activeKey;
    visible.current = true;
  });

  useEffect(() => {
    const host = pillRef.current?.parentElement;
    if (!host) return;
    const follow = () => {
      const pill = pillRef.current;
      const link = host.querySelector(ACTIVE_LINK);
      if (pill && link && host.offsetWidth) rest(pill, measure(link, host));
    };
    observer.current = new ResizeObserver(follow);
    observer.current.observe(host);
    if (observed.current) observer.current.observe(observed.current);
    return () => {
      observer.current?.disconnect();
      clearTimeout(waiting.current);
      delete host.dataset.navPillReady;
    };
  }, []);

  return (
    <span
      ref={pillRef}
      aria-hidden
      style={{ opacity: 0 }}
      className={cn(
        "bg-brand-tint pointer-events-none absolute top-0 left-0 -z-10 transition-opacity duration-150",
        className,
      )}
    />
  );
}
