/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import linkedinLogo from "@/public/assets/logos/linkedin-logo.svg";
import githubLogo from "@/public/assets/logos/github-logo.png";
import Logo from "@/components/nameLogo";
import clsx from "clsx";
import {
  GraduationCap,
  FolderKanban,
  Briefcase,
  Download,
  Terminal,
} from "lucide-react";
import Link from "next/link";

const sections = ["experience", "projects", "education"];

const NavBar = () => {
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Publish the resting nav height so the hero can fill the rest of the
  // viewport. Deliberately not tracked on scroll, since the pill shrinks as the
  // page moves and would otherwise resize the hero underneath it.
  useEffect(() => {
    const publishNavHeight = () => {
      const height = navRef.current?.offsetHeight;
      if (height) {
        document.documentElement.style.setProperty(
          "--nav-height",
          `${height}px`
        );
      }
    };

    publishNavHeight();
    window.addEventListener("resize", publishNavHeight);

    return () => window.removeEventListener("resize", publishNavHeight);
  }, [isMobile]);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleScroll = () => {
      // Whichever section has most recently scrolled past the navbar wins, so
      // the underline stays correct regardless of section heights or order.
      const threshold = (navRef.current?.offsetHeight ?? 0) + 24;
      let current = "";
      let closestTop = -Infinity;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;

        const { top } = el.getBoundingClientRect();
        if (top <= threshold && top > closestTop) {
          closestTop = top;
          current = id;
        }
      }

      setActiveSection(current);

      // Calculate scroll progress (0 to 1, maxing at 300px scroll)
      const maxScroll = 300;
      const progress = Math.min(window.scrollY / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Calculate dynamic values based on scroll progress (only for desktop)
  const topOffset = isMobile ? 0 : scrollProgress * 24; // 0px to 24px
  const width = isMobile ? 100 : 100 - scrollProgress * 10; // 100% to 90%
  const borderRadius = isMobile ? 0 : scrollProgress * 9999; // 0 to fully rounded
  const horizontalPadding = isMobile ? 5 : 5 - scrollProgress * 3; // 5% to 2%
  const showGlow = !isMobile && scrollProgress > 0.3;

  return (
    <nav
      ref={navRef}
      className="sticky z-50  w-full transition-all duration-300 ease-out flex justify-center"
      style={{
        top: `${topOffset}px`,
      }}
    >
      <div
        className={clsx(
          "flex-row justify-between items-between text-text transition-all pb-1 duration-300 ease-out backdrop-blur-md",
          showGlow && "navbar-pill-glow",
          isMobile
            ? "w-full bg-background/80 border-b border-primary/20"
            : "bg-background/90 border border-primary/40"
        )}
        style={{
          width: `${width}%`,
          borderRadius: `${borderRadius}px`,
          paddingLeft: isMobile ? undefined : `${horizontalPadding}%`,
          paddingRight: isMobile ? undefined : `${horizontalPadding}%`,
          paddingTop: isMobile ? undefined : `${8 + scrollProgress * 4}px`,
          paddingBottom: isMobile ? undefined : `${8 + scrollProgress * 4}px`,
        }}
      >
        <div
          className={clsx(
            "flex max-w-full  justify-between items-center transition-all duration-300",
            isMobile ? "px-[5%]" : ""
          )}
        >
          <div
            className={clsx(
              "flex items-center transition-all duration-300",
              isMobile && "gap-4 sm:gap-x-12"
            )}
            style={{
              gap: isMobile ? undefined : `${48 - scrollProgress * 32}px`,
            }}
          >
            <div
              className="transition-all duration-300"
              style={{
                transform: isMobile
                  ? undefined
                  : `scale(${1 - scrollProgress * 0.25})`,
              }}
            >
              <Logo />
            </div>
            {sections.map((section) => (
              <a key={section} href={`#${section}`}>
                <div className="flex items-center justify-center">
                  <span className="md:hidden">
                    {section === "education" && (
                      <GraduationCap className="w-6 h-6" />
                    )}
                    {section === "projects" && (
                      <FolderKanban className="w-6 h-6" />
                    )}
                    {section === "experience" && (
                      <Briefcase className="w-6 h-6" />
                    )}
                  </span>

                  <span
                    className={clsx(
                      "hidden md:inline nav-link relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:transition-transform after:duration-300 transition-all duration-300",
                      isMobile && "md:text-4xl",
                      activeSection === section
                        ? "after:scale-x-100"
                        : "after:scale-x-0 hover:after:scale-x-100"
                    )}
                    style={{
                      fontSize: isMobile
                        ? undefined
                        : `${2.25 - scrollProgress * 0.75}rem`,
                    }}
                  >
                    <div className="hidden md:inline">{section}</div>
                  </span>
                </div>
              </a>
            ))}
          </div>
          <div
            className={clsx(
              "flex items-center transition-all duration-300",
              isMobile && "gap-1 md:gap-4"
            )}
            style={{
              gap: isMobile ? undefined : `${16 - scrollProgress * 8}px`,
            }}
          >
            <Link
              href="/main-frame"
              className={clsx(
                "group relative flex items-center justify-center overflow-hidden rounded-full border-2 border-green-500",
                "transition-all duration-300",
                "hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]",
                "hover:bg-green-500/10 ",
                isMobile && "w-10 h-10 md:w-14 md:h-14"
              )}
              style={{
                width: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
                height: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(0,255,0,0.08)_0px,rgba(0,255,0,0.08)_1px,transparent_1px,transparent_3px)]" />
              </div>

              <Terminal
                className={clsx(
                  "text-green-400 transition-all duration-300",
                  "group-hover:text-green-300",
                  "group-hover:animate-[hacker-flicker_1.2s_infinite]",
                  "group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.9)]",
                  isMobile && "w-5 h-5 md:w-7 md:h-7"
                )}
                style={{
                  width: isMobile ? undefined : `${28 - scrollProgress * 8}px`,
                  height: isMobile ? undefined : `${28 - scrollProgress * 8}px`,
                }}
              />
            </Link>
            <a
              href="/Ethan-Bonsall-Resume.pdf"
              download
              className={clsx(
                "flex border-2 border-primary justify-center items-center text-center justify-items-center hover:bg-primary/20 rounded-full transition-all duration-300",
                isMobile && "w-10 h-10 md:w-14 md:h-14"
              )}
              style={{
                width: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
                height: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
              }}
            >
              <Download
                className={clsx(
                  "text-primary justify-center text-center items-center transition-all",
                  isMobile && "w-5 h-5 md:w-7 md:h-7"
                )}
                style={{
                  width: isMobile ? undefined : `${28 - scrollProgress * 8}px`,
                  height: isMobile ? undefined : `${28 - scrollProgress * 8}px`,
                }}
              />
            </a>
            <a
              href="https://www.linkedin.com/in/ethanbonsall/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={linkedinLogo.src}
                alt="LinkedIn"
                className={clsx(
                  "image-hover h-auto rounded-full transition-all duration-300 bg-white",
                  isMobile && "w-10 md:w-14"
                )}
                style={{
                  width: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
                }}
              />
            </a>
            <a
              href="https://github.com/ethanbonsall"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={githubLogo.src}
                alt="GitHub"
                className={clsx(
                  "image-hover h-auto rounded-full transition-all duration-300 z-50",
                  isMobile && "w-10 md:w-14"
                )}
                style={{
                  width: isMobile ? undefined : `${56 - scrollProgress * 16}px`,
                }}
              />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
