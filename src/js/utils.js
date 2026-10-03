export function addResume(pdf) {
  if (!pdf) return;
  document
    .querySelectorAll("[data-resume]")
    .forEach((el) => el.setAttribute("href", pdf));
}

export function initNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  const toggle = nav.querySelector(".site-nav__toggle");
  const icon = toggle && toggle.querySelector("i");

  toggle &&
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      if (icon) icon.className = `fa ${open ? "fa-times" : "fa-bars"}`;
    });

  nav.querySelectorAll(".site-nav__mobile a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      if (icon) icon.className = "fa fa-bars";
    })
  );

  const onScroll = () =>
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

const RAIN = [
  "eihab.boot() ok",
  "npm run build ✓",
  "react-native run-ios",
  "tsc --noEmit ✓ 0 errors",
  "git push origin main",
  "jest --coverage → passing",
  "docker compose up -d",
  "issuer.portal → tenant ready",
  "nfc.tap() → contactless ok",
  "api.cards.transfer() 200",
  "eas build --platform all",
  "ng build --prod ✓",
  "lambda.deploy() ok",
  "firebase deploy ✓",
  "postgres → connected",
  "ci.pipeline → green",
  "secure.auth() active",
  "ui.components → reusable",
  "status: shipping",
];

export function initCodeRain() {
  document.querySelectorAll("[data-code-rain]").forEach((el) => {
    const block = RAIN.join("\n");
    const text = Array(6).fill(block).join("\n");
    el.innerHTML = [0, 1, 2]
      .map(
        (c) =>
          `<div class="code-rain__col" style="animation-duration:${
            50 + c * 15
          }s;animation-delay:${c * -8}s">${text}</div>`
      )
      .join("");
  });
}

export function setYear() {
  document
    .querySelectorAll("[data-year]")
    .forEach((el) => (el.textContent = new Date().getFullYear()));
}

// Career start — years of experience are calculated from this date.
const CAREER_START = new Date(2018, 0, 1);

export function setYearsOfExperience() {
  const now = new Date();
  let years = now.getFullYear() - CAREER_START.getFullYear();
  const anniversary = new Date(now.getFullYear(), CAREER_START.getMonth(), CAREER_START.getDate());
  if (now < anniversary) years -= 1;
  document.querySelectorAll("[data-years]").forEach((el) => (el.textContent = years));
}
