/**
 * All project data lives here — edit this file, then rebuild.
 * Cards are rendered into the HTML at build time (great for SEO).
 *
 * - `type` decides which page a project shows on:
 *     "full-time"  → Home page ("Selected work")
 *     "part-time"  → part-time.html
 *     "freelance"  → freelance.html
 * - `description`, `stack` and `link` are optional.
 * - `icon` is a Font Awesome 4.7 icon name.
 */
module.exports = [
  // ── Full-time ────────────────────────────────────────────────
  {
    type: "full-time",
    name: "Issuer Onboarding Platform",
    company: "Network International",
    category: "Fintech · Web",
    icon: "fa-university",
    description: "Issuer portal that cut tenant configuration time from weeks to hours.",
    stack: ["React", "Node.js", "Express"],
  },
  {
    type: "full-time",
    name: "Ora Bank Cardholder",
    company: "Network International",
    category: "Fintech · Web & Mobile",
    icon: "fa-credit-card",
    description:
      "Core cardholder app for managing cards and transfers, white-labeled for Ora Bank. Secure payment APIs, NFC & contactless.",
    stack: ["React", "React Native", "Node.js"],
  },
  {
    type: "full-time",
    name: "Velox Taxi",
    company: "Tahaluf Al-Emarat",
    category: "Mobility · Dashboard & Mobile",
    icon: "fa-taxi",
    description:
      "Enterprise admin dashboard for real-time control and analytics, plus companion apps for drivers and passengers.",
    stack: ["Angular", "React Native"],
  },
  {
    type: "full-time",
    name: "ComfiPark",
    company: "Tahaluf Al-Emarat",
    category: "Parking · Dashboard & Mobile",
    icon: "fa-car",
    description:
      "Central management hub for the ComfiPark ecosystem and a cross-platform app for parking users.",
    stack: ["Angular", "React Native"],
  },

  // ── Part-time ────────────────────────────────────────────────
  { type: "part-time", name: "Cupify", category: "Mobile & Web", icon: "fa-coffee" },
  { type: "part-time", name: "LN Loyalty", category: "Mobile & Web", icon: "fa-star" },
  { type: "part-time", name: "Tap IQ", category: "Mobile & Web", icon: "fa-hand-pointer-o" },
  { type: "part-time", name: "TheNod", category: "Mobile & Web", icon: "fa-comments" },
  { type: "part-time", name: "Yoni", category: "Mobile & Web", icon: "fa-heart" },

  // ── Freelance ────────────────────────────────────────────────
  { type: "freelance", name: "Attendance App", category: "Mobile & Web", icon: "fa-calendar-check-o" },
  { type: "freelance", name: "VIPScanner", category: "Mobile & Web", icon: "fa-qrcode" },
  {
    type: "freelance",
    name: "Cubo",
    category: "E-commerce",
    icon: "fa-mobile",
    description: "E-commerce store for virtual numbers, virtual phones and eSIMs.",
  },
  {
    type: "freelance",
    name: "Mono",
    category: "E-commerce · Warehouse",
    icon: "fa-cubes",
    description: "Warehouse e-commerce app.",
  },
];
