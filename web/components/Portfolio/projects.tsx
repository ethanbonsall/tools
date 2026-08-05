/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import githubLogo from "@/public/assets/logos/github-logo-alt.png";

type Tag = "web" | "ai" | "data";

type Project = {
  name: string;
  link?: string;
  git: string;
  description: string;
  photo: string;
  tags: Tag[];
  featured?: boolean; // optional: use this if you want to hard-pin top projects
};

const TAGS: { key: Tag; label: string }[] = [
  { key: "web", label: "Web" },
  { key: "ai", label: "AI" },
  { key: "data", label: "Data" },
];

// since your --text is hex (#e8e8e8), use explicit rgba(232,232,232,alpha)
const TEXT_70 = "text-[rgba(232,232,232,0.7)]";
const TEXT_80 = "text-[rgba(232,232,232,0.8)]";
const BORDER_30 = "border-[rgba(232,232,232,0.3)]";
const BORDER_50 = "hover:border-[rgba(232,232,232,0.5)]";
const projects: Project[] = [
  {
    name: "Magic Hour Portraits",
    link: "https://magichourportraits.com/",
    git: "https://github.com/ethanbonsall/Magic-Hour-Portraits",
    photo: "/assets/uploads/1magic-hour.png",
    tags: ["web"],
    featured: true,
    description:
      "A full-stack website built for a photography business. The frontend is developed with Next.js and Tailwind CSS, and deployed via Vercel. The backend is powered by Supabase, serving as both the database and API layer, enabling seamless data retrieval and submission",
  },
  {
    name: "Chad GPT",
    git: "https://github.com/comp423-25s/csxl-a2",
    photo: "/assets/uploads/3chad-gpt.png",
    tags: ["web", "ai"],
    description:
      "A chatbot developed for the UNC Computer Science website, built with Angular. Integrates ChatGPT to interpret user input and convert it into API requests, enabling users to check class availability, reserve study rooms, and schedule time with TAs.",
  },
  {
    name: "Pediatric Blue Book",
    link: "https://pediatricbluebook.com",
    git: "https://github.com/ethanbonsall/Pediatric-Blue-Book",
    photo: "/assets/uploads/4pbb.png",
    tags: ["web", "data"],
    featured: true,
    description:
      "A web app for dietitians to calculate patient nutrient needs and create formula recipes that meet those requirements. Built with Next.js and TypeScript, using Supabase to manage user profiles, saved recipes, nutrient data, and weight benchmarks.",
  },
  {
    name: "Bonsai Property Care",
    link: "https://bonsaipropertycare.com/",
    git: "https://github.com/ethanbonsall/bonsai-property-care",
    photo: "/assets/uploads/2bonsai-property-care.png",
    tags: ["web"],
    description:
      "A full-stack website built for a property care business. The frontend is developed with Next.js and Tailwind CSS, and deployed via Vercel. The backend is powered by Supabase, serving as both the database and API layer, enabling seamless data retrieval and submission",
  },
  {
    name: "Postprofundus",
    link: "https://postprofundus.org",
    git: "https://github.com/ethanbonsall/Postprofundus",
    photo: "/assets/uploads/9postprofundus.png",
    tags: ["web"],
    featured: true,
    description:
      "A designer and lifestyle website built for a client, featuring immersive 3D renderings and a fully integrated online shop for apparel purchases. The frontend is developed with Next.js, React, Three.js, and TypeScript, delivering an interactive, performance-optimized experience.",
  },
  {
    name: "AuditTrail",
    git: "https://github.com/ethanbonsall/audit-trail",
    photo: "/assets/uploads/91audittrail.png",
    tags: ["ai", "data"],
    featured: true,
    description:
      "An open-source Python library for creating tamper-proof audit logs of API activity. Built as plug-and-play middleware for FastAPI, it cryptographically chains log entries, encrypts payloads at rest, and provides CLI verification tools, compliance reporting, and optional enterprise-grade security features.",
  },
  {
    name: "Main Frame",
    link: "https://www.ethanbonsall.com/main-frame",
    git: "https://github.com/ethanbonsall/ethanbonsall-portfolio",
    photo: "/assets/uploads/92mainframe.png",
    tags: ["web"],
    description:
      "A retro-styled interactive dashboard featuring a themed login experience, todo chart, and shared goals table. Built with React, TypeScript, and Tailwind CSS, it blends playful 'hacking' aesthetics with real user-driven functionality.",
  },
  {
    name: "Study Buddy",
    link: "https://study-buddy-center.vercel.app/login",
    git: "https://github.com/ethanbonsall/study-buddy",
    photo: "/assets/uploads/5study-buddy.png",
    tags: ["web"],
    description:
      "An all-in-one study platform similar to Discord but designed for school, featuring shared notes, live collaborative documents, study channels, and virtual study rooms. Built with Next.js, Supabase, and Supabase Realtime for real-time collaboration. Contact me if you’d like to see a demo.",
  },
  {
    name: "Ethan's Birthday",
    link: "https://www.ethanbonsall.com/birthday",
    git: "https://github.com/ethanbonsall/ethanbonsall-portfolio",
    photo: "/assets/uploads/6party.png",
    tags: ["web", "data"],
    description:
      "A birthday celebration website with RSVP submissions, photo uploads, and a shared Spotify playlist. Built with a Next.js frontend styled with Tailwind, and a Supabase backend integrating the Spotify API. Supabase for database and file storage.",
  },
  {
    name: "Beautiful Together",
    link: "https://beautiful-together-next.vercel.app/tinder-page",
    git: "https://github.com/cssgunc/beautiful-together-next",
    photo: "/assets/uploads/7beautiful.png",
    tags: ["web", "data"],
    description:
      "A website built for the animal sanctuary Beautiful Together, React frontend and Supabase backend. Includes a Tinder-like interface to streamline pet adoption. Contributed to preferences, pet ranking system, and design of animal profile cards.",
  },
  {
    name: "Not Wordle",
    link: "https://not-wordle-mu.vercel.app/",
    git: "https://github.com/ethanbonsall/not-wordle",
    photo: "/assets/uploads/8wordle.png",
    tags: ["web"],
    description:
      "A Wordle clone built with React and styled using Tailwind CSS.",
  },
];

const Web = () => {
  // Single source of truth (no more parallel arrays + index mapping)

  const [activeTags, setActiveTags] = useState<Tag[]>([]);

  const filtered = useMemo(() => {
    if (activeTags.length === 0) return projects;

    // AND match (must include ALL selected tags)
    return projects.filter((p) => activeTags.some((t) => p.tags.includes(t)));
  }, [activeTags]);

  const majors = useMemo(() => {
    const featured = filtered.filter((p) => p.featured);
    const picked = [...featured, ...filtered.filter((p) => !p.featured)];
    return picked.slice(0, 2);
  }, [filtered]);

  const minors = useMemo(() => {
    const majorNames = new Set(majors.map((m) => m.name));
    return filtered.filter((p) => !majorNames.has(p.name));
  }, [filtered, majors]);

  const toggleTag = (t: Tag) => {
    setActiveTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const clear = () => setActiveTags([]);

  return (
    <section
      className="bg-background text-text z-0 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12 md:py-16 w-full max-w-full overflow-hidden scroll-mt-28 "
      id="projects"
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl 2xl:text-7xl z-0 font-bold">
          <span className="gradient-text">Projects</span>
        </h1>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 ">
          {TAGS.map((t) => {
            const on = activeTags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTag(t.key)}
                className={[
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on
                    ? "bg-primary text-background border-primary"
                    : `border ${BORDER_30} ${TEXT_80} hover:text-text ${BORDER_50}`,
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={clear}
            className={[
              "rounded-full border px-3 py-1 text-sm transition-colors",
              BORDER_30,
              TEXT_70,
              "hover:text-text",
              BORDER_50,
            ].join(" ")}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Two major projects (same sizing as your current top grid cards) */}
      <div className="grid mb-8 grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-full">
        {majors.map((p) => (
          <div
            key={p.name}
            className="glass-card project-card rounded-2xl overflow-hidden group"
          >
            <div className="relative overflow-hidden">
              {p.link ? (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="w-full aspect-video object-cover"
                  />
                </a>
              ) : (
                <img
                  src={p.photo}
                  alt={p.name}
                  className="w-full aspect-video object-cover"
                />
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className={[
                          "text-xs px-2 py-0.5 rounded-full border",
                          BORDER_30,
                          TEXT_70,
                        ].join(" ")}
                      >
                        {t.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={p.git}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <img
                    src={githubLogo.src}
                    alt="GitHub"
                    className="w-6 h-6 bg-white rounded-full"
                  />
                </a>
              </div>

              <p className={`${TEXT_80} text-sm leading-relaxed`}>
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable row of the rest (same sizing as your current bottom cards) */}
      <div className="relative pt-3">
        <div
          className="
            flex flex-row gap-4 md:gap-6
            overflow-x-auto pt-2 pb-4
            snap-x snap-mandatory
            custom-scrollbar
            [-webkit-overflow-scrolling:touch]
          "
        >
          {minors.map((p) => (
            <div
              key={p.name}
              className="
                glass-card project-card rounded-2xl overflow-hidden group
                shrink-0
                snap-start
                w-[78%] sm:w-[52%] md:w-[40%] lg:w-[28%]
              "
            >
              <div className="relative overflow-hidden">
                {p.link ? (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="w-full aspect-video object-cover"
                    />
                  </a>
                ) : (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="w-full aspect-video object-cover"
                  />
                )}
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-primary">{p.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className={[
                            "text-[10px] px-2 py-0.5 rounded-full border",
                            BORDER_30,
                            TEXT_70,
                          ].join(" ")}
                        >
                          {t.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <a
                    href={p.git}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <img
                      src={githubLogo.src}
                      alt="GitHub"
                      className="w-5 h-5 bg-white rounded-full"
                    />
                  </a>
                </div>

                <p
                  className={`${TEXT_80} text-xs leading-relaxed line-clamp-[7]`}
                >
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className={`${TEXT_70} text-sm`}>
            No projects match those filters.
          </div>
        )}
      </div>
    </section>
  );
};

export default Web;
