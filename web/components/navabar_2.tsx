/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import linkedinLogo from "@/public/assets/logos/linkedin-logo.svg";
import githubLogo from "@/public/assets/logos/github-logo.png";
import Logo from "@/components/nameLogo";
import clsx from "clsx";
import {
  Download,
  Terminal,
  ListTodo,
  Target,
  Wallet,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavBar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full flex justify-center">
      <div
        className={clsx(
          "flex flex-row justify-between items-center text-text transition-all duration-300 ease-out backdrop-blur-md",
          "w-full bg-background/90 border-b border-primary/40",
          "rounded-none"
        )}
        style={{
          paddingLeft: isMobile ? "5%" : "5%",
          paddingRight: isMobile ? "5%" : "5%",
          paddingTop: "12px",
          paddingBottom: "12px",
        }}
      >
        <div className="flex max-w-full justify-between items-center  w-full">
          <div
            className={clsx(
              "flex items-center",
              isMobile ? "gap-[10px]" : "gap-10"
            )}
          >
            <Logo />
            <Link
              href="/todo"
              className={clsx(
                "nav-link flex items-center gap-2 text-lg",
                pathname === "/todo" && "text-primary font-medium"
              )}
            >
              <ListTodo className="w-5 h-5" />
              <span className="hidden sm:inline">Todo</span>
            </Link>
            <Link
              href="/goals"
              className={clsx(
                "nav-link flex items-center gap-2 text-lg",
                pathname === "/goals" && "text-primary font-medium"
              )}
            >
              <Target className="w-5 h-5" />
              <span className="hidden sm:inline">Goals</span>
            </Link>
            <Link
              href="/expenses"
              className={clsx(
                "nav-link flex items-center gap-2 text-lg",
                pathname === "/expenses" && "text-primary font-medium"
              )}
            >
              <Wallet className="w-5 h-5" />
              <span className="hidden sm:inline">Expenses</span>
            </Link>
            <Link
              href="/subscriptions"
              className={clsx(
                "nav-link flex items-center gap-2 text-lg",
                pathname === "/subscriptions" && "text-primary font-medium"
              )}
            >
              <CreditCard className="w-5 h-5" />
              <span className="hidden sm:inline">Subscriptions</span>
            </Link>
          </div>
          <div
            className={clsx(
              "flex items-center",
              isMobile ? "gap-2 md:gap-4" : "gap-4"
            )}
          >
            <Link
              href="/main-frame"
              className={clsx(
                "group relative flex items-center justify-center overflow-hidden rounded-full border-2 border-green-500",
                "transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] hover:bg-green-500/10",
                isMobile ? "w-10 h-10" : "w-12 h-12"
              )}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(0,255,0,0.08)_0px,rgba(0,255,0,0.08)_1px,transparent_1px,transparent_3px)]" />
              </div>
              <Terminal
                className={clsx(
                  "text-green-400 group-hover:text-green-300 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.9)]",
                  "group-hover:animate-[hacker-flicker_1.2s_infinite]",
                  isMobile ? "w-5 h-5" : "w-6 h-6"
                )}
              />
            </Link>
            <a
              href="/Ethan-Bonsall-Resume.pdf"
              download
              className={clsx(
                "flex border-2 border-primary justify-center items-center hover:bg-primary/20 rounded-full transition-all duration-300",
                isMobile ? "w-10 h-10" : "w-12 h-12"
              )}
            >
              <Download
                className={clsx(
                  "text-primary",
                  isMobile ? "w-5 h-5" : "w-6 h-6"
                )}
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
                  "image-hover h-auto rounded-full bg-white",
                  isMobile ? "w-10" : "w-12"
                )}
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
                  "image-hover h-auto rounded-full z-50",
                  isMobile ? "w-10" : "w-12"
                )}
              />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
