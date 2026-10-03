/** Site-wide facts used for SEO (structured data, sitemap, social cards). */
module.exports = {
  // Netlify sets process.env.URL to your primary domain at build time,
  // so this updates automatically if you add a custom domain.
  fallbackUrl: "https://pedantic-aryabhata-e2b1d3.netlify.app",
  name: "Eihab Obeidat",
  jobTitle: "Senior Software Engineer",
  description:
    "Senior Software Engineer with experience building fintech, web and mobile platforms using React, React Native, Angular, Next.js, Node.js, NestJS and Express.",
  careerStart: "2018-01-01",
  email: "obeidateihab9@gmail.com",
  telephone: "+962791541142",
  city: "Amman",
  country: "JO",
  worksFor: { name: "Network International", url: "https://www.network.ae" },
  alumniOf: "Jordan University of Science and Technology",
  sameAs: ["https://www.linkedin.com/in/eihab-obeidat/", "https://github.com/eihabobeidat"],
  knowsAbout: [
    "React", "React Native", "Angular", "Next.js", "TypeScript", "JavaScript", "Node.js", "NestJS", "Express.js",
    "PostgreSQL", "MySQL", "MongoDB", "Firebase", "AWS", "Google Cloud", "Docker", "CI/CD",
    "System Design", "REST APIs", "Fintech", "Mobile Development", "Secure Coding",
    "Machine Learning", "Artificial Intelligence",
  ],
  languages: ["en", "ar"],
  pages: [
    { file: "index.html", path: "/", priority: "1.0", name: "Home" },
    { file: "part-time.html", path: "/part-time.html", priority: "0.8", name: "Part-time projects" },
    { file: "freelance.html", path: "/freelance.html", priority: "0.8", name: "Freelance projects" },
    { file: "ai.html", path: "/ai.html", priority: "0.7", name: "AI learning path" },
  ],
};
