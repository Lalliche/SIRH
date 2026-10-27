"use client";

import { Fragment } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { lpDur, lpEase, lpStep, lpViewport } from "./landing-tokens";

const bez = (a) => `cubic-bezier(${a.join(",")})`;

/**
 * Word-by-word masked rise. `parts` = [{ text, className?, breakBefore? }]. The container carries the full
 * string as aria-label; the pieces are aria-hidden.
 *  - trigger="load": pure CSS keyframes (visible in the SSR markup, runs at first paint, no hydration wait).
 *  - trigger="view": motion whileInView, once.
 * Under reduced motion globals.css / MotionConfig flatten both to the final pose.
 */
export default function SplitReveal({ parts, as: Tag = "h2", trigger = "view", baseDelay = 0, className, partClassName }) {
  const label = parts.map((p) => p.text).join(" ");
  let index = 0;

  const nodes = parts.map((part, pi) => {
    const words = part.text.split(" ");
    return (
      <span key={pi} className={cn("contents", part.className)}>
        {part.breakBefore && <br aria-hidden />}
        {words.map((w, wi) => {
          const i = index++;
          const lastInPart = wi === words.length - 1;
          const gap = !lastInPart || (pi < parts.length - 1 && !parts[pi + 1].breakBefore);
          const delay = baseDelay + i * lpStep.words;
          return (
            <Fragment key={`${pi}-${wi}`}>
            <span aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              {trigger === "load" ? (
                <span
                  className={cn("inline-block", partClassName, part.className)}
                  style={{ animation: `sirh-word-rise ${lpDur.hero}s ${bez(lpEase.emphasized)} ${delay}s both` }}
                >
                  {w}
                </span>
              ) : (
                <motion.span
                  className={cn("inline-block", partClassName, part.className)}
                  initial={{ y: "110%" }}
                  whileInView={{ y: "0%" }}
                  viewport={lpViewport}
                  transition={{ duration: lpDur.hero, ease: lpEase.emphasized, delay }}
                >
                  {w}
                </motion.span>
              )}
            </span>
            {gap && " "}
            </Fragment>
          );
        })}
      </span>
    );
  });

  return (
    <Tag aria-label={label} className={className}>
      {nodes}
    </Tag>
  );
}
