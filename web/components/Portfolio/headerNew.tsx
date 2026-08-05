/* eslint-disable @next/next/no-img-element */
"use client";
import profilePic from "@/public/assets/image.jpeg";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SIDE_INSET_VW = 14;
// Distance from the viewport center to each element's resting inset, used to
// park both halves on top of each other before they split apart.
const CENTER_SHIFT_VW = 50 - SIDE_INSET_VW;
const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
const SLIDE_DURATION = 2.4;
const TEXT_FADE_DELAY = 0.1;

const Header = () => {
  const [stats, setStats] = useState({ projects: 0, experience: 0, tech: 0 });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    if (!revealed) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = { projects: 10, experience: 3, tech: 15 };
    let current = { projects: 0, experience: 0, tech: 0 };

    const timer = setInterval(() => {
      const increment = {
        projects: targets.projects / steps,
        experience: targets.experience / steps,
        tech: targets.tech / steps,
      };

      current = {
        projects: Math.min(
          current.projects + increment.projects,
          targets.projects
        ),
        experience: Math.min(
          current.experience + increment.experience,
          targets.experience
        ),
        tech: Math.min(current.tech + increment.tech, targets.tech),
      };

      setStats({
        projects: Math.floor(current.projects),
        experience: Math.floor(current.experience),
        tech: Math.floor(current.tech),
      });

      if (
        current.projects >= targets.projects &&
        current.experience >= targets.experience &&
        current.tech >= targets.tech
      ) {
        clearInterval(timer);
        setStats(targets);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [revealed]);

  return (
    <section className="relative w-full max-w-full overflow-hidden animated-gradient tech-grid text-text h-[calc(100svh-var(--nav-height,4rem))]">
      {/* Desktop — both start at true center, then split outward together */}
      <div
        className="hidden md:flex h-full w-full items-center justify-between"
        style={{
          paddingLeft: `${SIDE_INSET_VW}vw`,
          paddingRight: `${SIDE_INSET_VW}vw`,
        }}
      >
        <div
          className="relative z-10 shrink-0"
          style={{
            transform: revealed
              ? "translateX(0)"
              : `translateX(calc(${CENTER_SHIFT_VW}vw - 50%))`,
            transition: `transform ${SLIDE_DURATION}s ${EASE_CSS}`,
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent blur-2xl opacity-30 animate-pulse" />
            <img
              src={profilePic.src}
              alt="Profile"
              className="relative float-animation w-48 h-48 lg:w-64 lg:h-64 xl:w-72 xl:h-72 rounded-full border-4 border-primary glow-effect"
            />
          </div>
        </div>

        <div
          className="relative z-10 max-w-[min(52%,36rem)]"
          style={{
            transform: revealed
              ? "translateX(0)"
              : `translateX(calc(50% - ${CENTER_SHIFT_VW}vw))`,
            opacity: revealed ? 1 : 0,
            transition: `transform ${SLIDE_DURATION}s ${EASE_CSS}, opacity 1.1s ease-out ${TEXT_FADE_DELAY}s`,
          }}
        >
          <div className="mb-2 lg:mb-3 text-primary text-sm lg:text-base xl:text-lg font-mono">
            Software Developer
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-sans font-extrabold leading-tight">
            <span className="text-text">Hello I&apos;m </span>
            <span className="gradient-text">Ethan Bonsall</span>
          </h1>
          <p className="text-[#e8e8e8]/70 text-base lg:text-lg xl:text-xl font-normal mt-3 lg:mt-4">
            Full-Stack Developer | Data Engineer
          </p>
          <p className="text-[#e8e8e8]/70 text-sm lg:text-base xl:text-lg font-normal mt-2 lg:mt-3">
            UNC Chapel Hill | 3.8 GPA | Computer Science | Data Science
          </p>

          <div className="flex flex-wrap gap-4 lg:gap-6 xl:gap-8 mt-6 lg:mt-8">
            <div className="glass-card px-5 py-3 lg:px-6 lg:py-4 rounded-xl text-center min-w-[100px]">
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold gradient-text">
                {stats.projects}+
              </div>
              <div className="text-xs lg:text-sm text-text/70 mt-1 whitespace-nowrap">
                Projects
              </div>
            </div>
            <div className="glass-card px-5 py-3 lg:px-6 lg:py-4 rounded-xl text-center min-w-[100px]">
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold gradient-text">
                {stats.experience}+
              </div>
              <div className="text-xs lg:text-sm text-text/70 mt-1 whitespace-nowrap">
                Years Experience
              </div>
            </div>
            <div className="glass-card px-5 py-3 lg:px-6 lg:py-4 rounded-xl text-center min-w-[100px]">
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold gradient-text">
                {stats.tech}+
              </div>
              <div className="text-xs lg:text-sm text-text/70 mt-1 whitespace-nowrap">
                Technologies
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden h-full w-full flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ y: 28 }}
          animate={{ y: revealed ? 0 : 28 }}
          transition={{ duration: SLIDE_DURATION, ease: EASE }}
          className="relative shrink-0"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent blur-2xl opacity-30 animate-pulse" />
          <img
            src={profilePic.src}
            alt="Profile"
            className="relative float-animation w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-primary glow-effect"
          />
        </motion.div>

        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 36 }}
          animate={
            revealed
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 36 }
          }
          transition={{
            default: { duration: SLIDE_DURATION, ease: EASE },
            opacity: { duration: 1.1, delay: TEXT_FADE_DELAY, ease: "easeOut" },
          }}
        >
          <div className="mb-2 text-primary text-sm font-mono">
            Software Developer
          </div>
          <h1 className="text-2xl sm:text-3xl font-sans font-extrabold leading-tight">
            <span className="text-text">Hello I&apos;m </span>
            <span className="gradient-text">Ethan Bonsall</span>
          </h1>
          <p className="text-[#e8e8e8]/70 text-sm sm:text-base font-normal mt-3">
            Full-Stack Developer | Data Engineer
          </p>
          <p className="text-[#e8e8e8]/70 text-xs sm:text-sm font-normal mt-2">
            UNC Chapel Hill | 3.8 GPA | Computer Science | Data Science
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-5">
            <div className="glass-card px-4 py-2.5 rounded-lg text-center min-w-[88px]">
              <div className="text-xl sm:text-2xl font-bold gradient-text">
                {stats.projects}+
              </div>
              <div className="text-[10px] sm:text-xs text-text/70 mt-0.5 whitespace-nowrap">
                Projects
              </div>
            </div>
            <div className="glass-card px-4 py-2.5 rounded-lg text-center min-w-[88px]">
              <div className="text-xl sm:text-2xl font-bold gradient-text">
                {stats.experience}+
              </div>
              <div className="text-[10px] sm:text-xs text-text/70 mt-0.5 whitespace-nowrap">
                Years Exp
              </div>
            </div>
            <div className="glass-card px-4 py-2.5 rounded-lg text-center min-w-[88px]">
              <div className="text-xl sm:text-2xl font-bold gradient-text">
                {stats.tech}+
              </div>
              <div className="text-[10px] sm:text-xs text-text/70 mt-0.5 whitespace-nowrap">
                Technologies
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Header;
