"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

const HACK_CODE = `from cyber import hack

with hack.mainframe(root=True) as mf:
    mf.bypass("security_layer")
    mf.inject("access_token")
    mf.unlock("core_system")`;

const ASCII_MAINFRAME = `
  ‎ _   _      _ _         _   _               
| | | |    | | |       | | | |              
| |_| | ___| | | ___   | | | |___  ___ _ __ 
|  _  |/ _ \\ | |/ _ \\  | | | / __|/ _ \\ '__|
| | | |  __/ | | (_) | | |_| \\__ \\  __/ |   
\\_| |_/\\___|_|_|\\___/   \\___/|___/\\___|_|   
                                            
`;

const ASCII_HELLO = `
  ‎ _   _      _ _       
| | | |    | | |      
| |_| | ___| | | ___  
|  _  |/ _ \\ | |/ _ \\
| | | |  __/ | | (_) |
\\_| |_/\\___|_|_|\\___/  `;

type Step =
  | "init"
  | "server_select" // logged in: pick todo.server or goals.server
  | "first_time" // not logged in: Yes hack in / No hack back in
  | "username"
  | "email" // sign up only
  | "password"
  | "hack_code" // auto-type hack, then Enter
  | "authenticating"
  | "done";

const SERVER_OPTIONS = [
  { label: "todo.server", href: "/todo" },
  { label: "goals.server", href: "/goals" },
  { label: "expenses.server", href: "/expenses" },
  { label: "subscriptions.server", href: "/subscriptions" },
] as const;

const FIRST_TIME_OPTIONS = [
  "Yes, I need to hack in",
  "No, I already created a backdoor",
] as const;

export default function MainFramePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("init");
  const [lines, setLines] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [hackCodeIndex, setHackCodeIndex] = useState(0);
  const [hackCodeDisplay, setHackCodeDisplay] = useState("");

  const preRef = useRef<HTMLPreElement | null>(null);
  const [cursorTopPx, setCursorTopPx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mirrorBeforeRef = useRef<HTMLSpanElement | null>(null);
  const mirrorCaretRef = useRef<HTMLSpanElement | null>(null);
  const [cursorLeft, setCursorLeft] = useState(0);
  const [cursorW, setCursorW] = useState(10);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currentOptions =
    step === "server_select"
      ? SERVER_OPTIONS.map((o) => o.label)
      : step === "first_time"
      ? [...FIRST_TIME_OPTIONS]
      : [];

  function measureTextWidth(container: HTMLElement, text: string) {
    const s = document.createElement("span");
    s.style.position = "absolute";
    s.style.visibility = "hidden";
    s.style.whiteSpace = "pre";
    s.style.font = getComputedStyle(container).font;
    s.textContent = text;
    container.appendChild(s);
    const w = s.getBoundingClientRect().width;
    container.removeChild(s);
    return w;
  }

  const updateCursor = () => {
    const pre = preRef.current;
    const el = inputRef.current;
    const before = mirrorBeforeRef.current;
    const caret = mirrorCaretRef.current;
    if (!pre || !before || !caret) return;
    const pos =
      step === "hack_code"
        ? hackCodeDisplay.length
        : el?.selectionStart ?? typed.length;
    const shown =
      step === "hack_code"
        ? hackCodeDisplay
        : step === "password"
        ? "•".repeat(typed.length)
        : typed;
    before.textContent = shown.slice(0, pos);
    caret.textContent = shown[pos] ?? " "; // one char for width; empty at end
    const prompt = ">";
    const promptWidth = measureTextWidth(pre, `${prompt} `);
    const left = promptWidth + before.getBoundingClientRect().width;
    const w = caret.getBoundingClientRect().width || 10;
    setCursorLeft(left);
    setCursorW(w);
    const lineHeight = parseFloat(getComputedStyle(pre).lineHeight || "20");
    const totalLines = (lines.join("\n") + "\n").split("\n").length;
    setCursorTopPx((totalLines - 1) * lineHeight);
  };

  useLayoutEffect(() => {
    updateCursor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, step, lines, selectedIdx, hackCodeDisplay]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function typeLine(text: string, speed = 28) {
    setLines((prev) => [...prev, ""]);
    let cur = "";
    for (let i = 0; i < text.length; i++) {
      cur += text[i];
      setLines((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = cur;
        return copy;
      });
      await sleep(speed);
    }
  }

  // --- Auth check on mount ---
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthChecked(true);
    })();
  }, []);

  // --- Boot based on auth ---
  useEffect(() => {
    if (!authChecked) return;

    const run = async () => {
      setLines([]);
      setTyped("");
      setSelectedIdx(0);

      const mobile = typeof window !== "undefined" && window.innerWidth < 768;
      if (mobile) {
        const helloLines = ASCII_HELLO.trim().split("\n");
        for (const l of helloLines) {
          setLines((prev) => [...prev, l]);
          await sleep(40);
        }
        await sleep(200);
        setLines((prev) => [...prev, ""]);
      } else {
        const asciiLines = ASCII_MAINFRAME.trim().split("\n");
        for (const l of asciiLines) {
          setLines((prev) => [...prev, l]);
          await sleep(40);
        }
        await sleep(200);
        setLines((prev) => [...prev, ""]);
      }

      if (userId) {
        await typeLine("What server do you want to break into?");
        setLines((prev) => [...prev, ""]);
        setStep("server_select");
      } else {
        await typeLine("Is this your first time in main frame?");
        setLines((prev) => [...prev, ""]);
        setStep("first_time");
      }
    };

    run();
  }, [authChecked, userId]);

  useEffect(() => {
    if (
      step === "username" ||
      step === "password" ||
      step === "email" ||
      step === "hack_code"
    ) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [step]);

  // On mobile: auto-type the hack code (single interval, no key handler overlap)
  const hackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (step !== "hack_code" || !isMobile) return;
    hackIntervalRef.current = setInterval(() => {
      setHackCodeIndex((i) => {
        if (i >= HACK_CODE.length) {
          if (hackIntervalRef.current) {
            clearInterval(hackIntervalRef.current);
            hackIntervalRef.current = null;
          }
          return i;
        }
        const chunkSize = Math.min(
          2 + Math.floor(Math.random() * 4),
          HACK_CODE.length - i
        );
        const chunk = HACK_CODE.slice(i, i + chunkSize);
        setHackCodeDisplay((prev) => prev + chunk);
        return i + chunkSize;
      });
    }, 55);
    return () => {
      if (hackIntervalRef.current) {
        clearInterval(hackIntervalRef.current);
        hackIntervalRef.current = null;
      }
    };
  }, [step, isMobile]);

  const isTypingStep =
    step === "username" || step === "password" || step === "email";
  const isHackCodeStep = step === "hack_code";
  const prompt = isTypingStep || isHackCodeStep ? ">" : "";

  function pickFirstTimeOption(picked: string) {
    setLines((prev) => [...prev, `> ${picked}`]);
    setIsSignUp(picked === FIRST_TIME_OPTIONS[0]);
    setLines((prev) => [...prev, ""]);
    (async () => {
      await typeLine("please enter username:");
      setStep("username");
    })();
  }

  function commitCurrentInput() {
    const value = typed.trim();
    if (!value && step !== "hack_code") return;

    if (step === "username") {
      setUsername(value);
      setLines((prev) => [...prev, `> ${value}`]);
      setTyped("");
      if (isSignUp) {
        (async () => {
          await typeLine("enter email:");
          setStep("email");
        })();
      } else {
        (async () => {
          await typeLine("enter password:");
          setStep("password");
        })();
      }
      return;
    }

    if (step === "email") {
      setEmail(value);
      setLines((prev) => [...prev, `> ${value}`]);
      setTyped("");
      (async () => {
        await typeLine("enter password:");
        setStep("password");
      })();
      return;
    }

    if (step === "password") {
      setPassword(value);
      setLines((prev) => [...prev, `> ${"•".repeat(value.length)}`]);
      setTyped("");
      (async () => {
        setLines((prev) => [...prev, ""]);
        await typeLine("write code to hack into the mainframe:");
        setLines((prev) => [...prev, ""]);
        setStep("hack_code");
        setHackCodeIndex(0);
        setHackCodeDisplay("");
      })();
      return;
    }

    if (step === "hack_code") {
      // Enter pressed - run auth
      setLines((prev) => [...prev, `> ${hackCodeDisplay}`]);
      setLines((prev) => [...prev, ""]);
      setStep("authenticating");
      setTyped("");
      setHackCodeDisplay("");

      (async () => {
        setLines((prev) => [...prev, "authenticating..."]);
        await sleep(600);
        const ok = isSignUp
          ? await doSignUp(username, email, password)
          : await doSignIn(username, password);
        if (ok) {
          setLines((prev) => [...prev, "access granted."]);
          await sleep(400);
          setLines((prev) => [...prev, ""]);
          await typeLine("What server do you want to break into?");
          setLines((prev) => [...prev, ""]);
          setStep("server_select");
        }
      })();
    }
  }

  async function doSignIn(user: string, pass: string): Promise<boolean> {
    const { data: userRow, error: lookupError } = await supabase
      .from("users")
      .select("email")
      .ilike("username", user)
      .limit(1)
      .maybeSingle();

    if (lookupError || !userRow?.email) {
      setLines((prev) => [...prev, "user not found.", ""]);
      setTyped("");
      setUsername("");
      setPassword("");
      setStep("username");
      await typeLine("please enter username:");
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: userRow.email,
      password: pass,
    });

    if (error) {
      setLines((prev) => [...prev, `login failed: ${error.message}`, ""]);
      setTyped("");
      setPassword("");
      setStep("password");
      await typeLine("enter password:");
      return false;
    }
    return true;
  }

  async function doSignUp(
    user: string,
    em: string,
    pass: string
  ): Promise<boolean> {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: em,
      password: pass,
    });

    if (signUpError) {
      setLines((prev) => [
        ...prev,
        `sign up failed: ${signUpError.message}`,
        "",
      ]);
      setTyped("");
      setUsername("");
      setEmail("");
      setPassword("");
      setStep("username");
      await typeLine("please enter username:");
      return false;
    }

    const authUserId = signUpData?.user?.id;
    if (authUserId) {
      const { error: insertErr } = await supabase.from("users").insert({
        user_id: authUserId,
        username: user.trim() || null,
        email: em.trim() || null,
      });
      if (insertErr) {
        // If unique user_id conflict, try upsert so existing row gets username/email updated
        const { error: upsertErr } = await supabase
          .from("users")
          .upsert(
            { user_id: authUserId, username: user.trim() || null, email: em.trim() || null },
            { onConflict: "user_id" }
          );
        if (upsertErr) {
          setLines((prev) => [...prev, `Could not add user to list: ${upsertErr.message}`, ""]);
        }
      }
    }

    return true;
  }

  // Hack code: any keypress types 2–5 chars (desktop only; mobile uses auto-type)
  function onHackCodeKeyDown(e: KeyboardEvent) {
    if (step !== "hack_code") return;
    e.preventDefault();
    if (e.key === "Enter") {
      commitCurrentInput();
      return;
    }
    if (isMobile) return; // on mobile, only Enter is handled; auto-type does the rest
    if (hackCodeIndex < HACK_CODE.length) {
      const chunkSize = Math.min(
        2 + Math.floor(Math.random() * 4),
        HACK_CODE.length - hackCodeIndex
      );
      const chunk = HACK_CODE.slice(hackCodeIndex, hackCodeIndex + chunkSize);
      setHackCodeDisplay((prev) => prev + chunk);
      setHackCodeIndex((i) => i + chunkSize);
    }
  }

  // Keyboard for server_select and first_time
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (step === "server_select" || step === "first_time") {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIdx(
            (i) => (i - 1 + currentOptions.length) % currentOptions.length
          );
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIdx((i) => (i + 1) % currentOptions.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const picked = currentOptions[selectedIdx];
          setLines((prev) => [...prev, `> ${picked}`]);

          if (step === "server_select") {
            const opt = SERVER_OPTIONS[selectedIdx];
            router.push(opt.href);
            return;
          }

          if (step === "first_time") {
            setIsSignUp(picked === "Yes, I need to hack in");
            setLines((prev) => [...prev, ""]);
            (async () => {
              await typeLine("please enter username:");
              setStep("username");
            })();
          }
          return;
        }
      }

      if (step === "hack_code") {
        onHackCodeKeyDown(e);
        return;
      }

      if (isTypingStep && e.key === "Enter") {
        e.preventDefault();
        commitCurrentInput();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    selectedIdx,
    typed,
    hackCodeIndex,
    hackCodeDisplay,
    currentOptions,
    isSignUp,
    isMobile,
  ]);

  const showInput =
    (isTypingStep && typed !== undefined) ||
    (isHackCodeStep && (typed !== undefined || hackCodeDisplay !== undefined));
  const showInputInPre = showInput && !(isMobile && isTypingStep);

  return (
    <div className="min-h-screen bg-[hsl(154_50%_5%)] text-[hsl(154_84%_70%)] [text-shadow:0_0_4px_hsl(154_84%_70%)] font-mono text-[16px] cursor-none">
      <Head>
        <title>Main Frame</title>
      </Head>
      <div className="relative p-8">
        <pre ref={preRef} className="relative whitespace-pre-wrap leading-5">
          {lines.join("\n")}
          {showInputInPre && (
            <>
              {"\n"}
              <span className="select-none">{prompt} </span>
              <span ref={mirrorBeforeRef} className="whitespace-pre" />
              <span ref={mirrorCaretRef} className="whitespace-pre">
                {!isHackCodeStep &&
                  (step === "password" ? "•".repeat(typed.length) : typed)}
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute blink"
                style={{
                  left: cursorLeft,
                  top: cursorTopPx,
                  width: cursorW,
                  height: "1.2em",
                  background: "hsl(154 84% 70%)",
                  mixBlendMode: "screen",
                }}
              />
            </>
          )}
        </pre>

        {isTypingStep &&
          (isMobile ? (
            <div className="mt-3 flex w-full max-w-xl items-baseline gap-0 font-mono text-[16px] text-[hsl(154_84%_70%)] [text-shadow:0_0_4px_hsl(154_84%_70%)]">
              <span className="select-none shrink-0">&gt; </span>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyUp={updateCursor}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete={
                  step === "password"
                    ? "current-password"
                    : step === "email"
                    ? "email"
                    : "username"
                }
                type={step === "password" ? "password" : "text"}
                className="min-w-0 flex-1 border-0  bg-transparent py-1 outline-none placeholder:opacity-60"
              />
            </div>
          ) : (
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyUp={updateCursor}
              onClick={updateCursor}
              onSelect={updateCursor}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="absolute left-[-9999px] top-0 opacity-0 caret-transparent"
            />
          ))}

        {step === "hack_code" && !isMobile && (
          <input
            ref={inputRef}
            readOnly
            tabIndex={0}
            value=""
            className="absolute left-[-9999px] top-0 opacity-0 w-0 h-0"
            aria-hidden
          />
        )}

        {step === "hack_code" && isMobile && (
          <div className=" flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={() => commitCurrentInput()}
              disabled={hackCodeIndex < HACK_CODE.length}
              className=" text-left font-mono text-sm text-[hsl(154_84%_70%)] hover:bg-primary/20 hover:border-primary/60 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-primary/40"
            >
              &gt; Run
            </button>
          </div>
        )}

        {(step === "server_select" || step === "first_time") && (
          <div className="mt-3">
            <div className="ml-4 flex flex-col gap-1">
              {currentOptions.map((c, idx) => {
                const isSelected = idx === selectedIdx;
                const handleClick = () => {
                  if (step === "server_select") {
                    setLines((prev) => [...prev, `> ${c}`]);
                    const opt = SERVER_OPTIONS[idx];
                    router.push(opt.href);
                  } else {
                    pickFirstTimeOption(c);
                  }
                };
                return (
                  <button
                    key={String(c)}
                    type="button"
                    onClick={handleClick}
                    className="relative flex w-full cursor-none  items-center gap-2 rounded border-0 bg-transparent p-0 text-left font-inherit text-inherit hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50 normal-case font-normal"
                  >
                    <span className="w-4 select-none">
                      {isSelected ? ">" : " "}
                    </span>
                    <span
                      className={`select-none ${
                        isSelected ? "goldShimmer" : ""
                      }`}
                    >
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 opacity-80 select-none ml-4">
              (use ↑/↓, press Enter, or tap)
            </div>
          </div>
        )}

        <div id="interlaced" />
        <div id="glare" />
      </div>

      <style jsx>{`
        #glare {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: radial-gradient(hsl(154 5% 15%) 0%, hsl(154 50% 5%) 70%);
        }

        @keyframes lines {
          0% {
            background-position: 0px 0px;
          }
          50% {
            background-position: 0px 0px;
          }
          51% {
            background-position: 0px 2px;
          }
          100% {
            background-position: 0px 2px;
          }
        }

        #interlaced {
          position: fixed;
          inset: 0;
          z-index: 10;
          pointer-events: none;
          background: repeating-linear-gradient(
            transparent 0px 1px,
            hsl(154 0% 0% / 0.3) 3px 4px
          );
          animation: lines 0.066666666s linear infinite;
        }

        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .blink {
          animation: blink 1s steps(1) infinite;
        }

        .goldShimmer {
          color: hsl(45 100% 60%);
          text-shadow: 0 0 6px hsl(45 100% 60%), 0 0 18px hsl(45 100% 45%);
          background: linear-gradient(
            90deg,
            hsl(45 100% 45%),
            hsl(55 100% 70%),
            hsl(45 100% 45%)
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 1.2s linear infinite;
          position: relative;
        }

        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
      `}</style>
    </div>
  );
}
