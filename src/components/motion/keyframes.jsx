import { lpDur, lpEase } from "./landing-tokens";

const bez = (a) => `cubic-bezier(${a.join(",")})`;

/**
 * First-paint keyframes + a few scoped classes for the landing page. Rendered once by the marketing layout.
 * React 19 hoists and dedupes <style href precedence>. Durations / curves are interpolated from the tokens.
 * Reduced motion: globals.css collapses every animation to ~0ms / 1 iteration, so each keyframe's END state
 * must be the designed static pose.
 */
export default function LandingKeyframes() {
  const css = `
@keyframes sirh-word-rise { from { transform: translate3d(0, 110%, 0); } to { transform: translate3d(0, 0, 0); } }
@keyframes sirh-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sirh-rise-in { from { opacity: 0; transform: translate3d(0, 0.75em, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
@keyframes sirh-glint { from { background-position: 100% 0; } to { background-position: 0% 0; } }
@keyframes sirh-sway { from { transform: rotateY(-5deg) rotateX(2deg); } to { transform: rotateY(5deg) rotateX(-1deg); } }
@keyframes sirh-bob { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, -0.35em, 0); } }
@keyframes sirh-spin { to { transform: rotate(360deg); } }
@keyframes sirh-ping { 0% { transform: scale(1); opacity: 0.55; } 80%, 100% { transform: scale(2.6); opacity: 0; } }

.sirh-rise { animation: sirh-rise-in ${lpDur.reveal}s ${bez(lpEase.outStrong)} both; }
.sirh-fade { animation: sirh-fade-in ${lpDur.reveal}s ${bez(lpEase.out)} both; }
.sirh-sway { animation: sirh-sway 9s ${bez(lpEase.inOut)} infinite alternate; transform-style: preserve-3d; }
.sirh-bob { animation: sirh-bob 5.5s ${bez(lpEase.inOut)} infinite alternate; }
.sirh-glint-text {
  background-image: linear-gradient(100deg, var(--primary) 42%, var(--pine-300) 50%, var(--primary) 58%);
  background-size: 260% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: sirh-glint 1.6s ${bez(lpEase.inOut)} 1.5s both;
}
.sirh-ping::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: currentColor; animation: sirh-ping 2.4s ${bez(lpEase.out)} infinite; }

/* Border beam: a conic highlight on an oversized square, rotated on the compositor, masked to a thin ring. */
.sirh-beam { position: absolute; inset: 0; border-radius: inherit; padding: 0.14em; overflow: hidden; pointer-events: none;
  -webkit-mask: linear-gradient(black 0 0) content-box, linear-gradient(black 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(black 0 0) content-box exclude, linear-gradient(black 0 0); }
.sirh-beam::before { content: ""; position: absolute; left: 50%; top: 50%; width: 220%; aspect-ratio: 1; margin: -110% 0 0 -110%;
  background: conic-gradient(from 0deg, transparent 0 62%, var(--beam, var(--pine-300)) 86%, transparent 100%);
  animation: sirh-spin 3.4s linear infinite; }
.sirh-beam[data-paused="true"]::before { animation-play-state: paused; }

@media (hover: hover) and (pointer: fine) { .sirh-sway { animation: none; } }
@media (prefers-reduced-motion: reduce) {
  .sirh-sway, .sirh-bob { animation: none; }
  .sirh-beam::before { animation: none; transform: rotate(40deg); }
  .sirh-ping::after { display: none; }
}
`;
  return (
    <style href="sirh-landing-kf" precedence="default">
      {css}
    </style>
  );
}
