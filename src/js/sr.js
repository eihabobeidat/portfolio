export default function initSr() {
  if (typeof ScrollReveal === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const base = {
    easing: "cubic-bezier(0.5, 0, 0, 1)",
    distance: "24px",
    duration: 900,
    origin: "bottom",
    interval: 80,
  };

  ScrollReveal().reveal(".hero__copy > *", { ...base, delay: 150, interval: 90 });
  ScrollReveal().reveal(".hero__scene", { ...base, delay: 400, distance: "0px", scale: 0.96 });
  ScrollReveal().reveal(".reveal", base);
}
