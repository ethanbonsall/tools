import Head from "next/head";

const floatingHearts = [
  { left: "8%", size: 26, delay: "0s", duration: "9s" },
  { left: "18%", size: 18, delay: "1.5s", duration: "11s" },
  { left: "30%", size: 32, delay: "0.5s", duration: "10s" },
  { left: "43%", size: 20, delay: "2.5s", duration: "12s" },
  { left: "55%", size: 28, delay: "1s", duration: "9.5s" },
  { left: "67%", size: 22, delay: "3s", duration: "11.5s" },
  { left: "78%", size: 30, delay: "2s", duration: "10.5s" },
  { left: "90%", size: 16, delay: "4s", duration: "12.5s" },
];

export default function ILoveYouTaylorPage() {
  return (
    <>
      <Head>
        <title>I love you</title>
      </Head>

      <main className="relative min-h-screen overflow-hidden bg-[#fff6fb] text-[#7d2954]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,182,213,0.7),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,220,233,0.9),_transparent_30%),linear-gradient(180deg,_#fff8fc_0%,_#ffe4ef_100%)]" />
        <div className="absolute inset-0 opacity-50">
          {floatingHearts.map((heart) => (
            <span
              key={`${heart.left}-${heart.delay}`}
              className="floating-heart"
              style={{
                left: heart.left,
                fontSize: `${heart.size}px`,
                animationDelay: heart.delay,
                animationDuration: heart.duration,
              }}
            >
              ♥
            </span>
          ))}
        </div>

        <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-3xl">
            <div className="love-card rounded-[2rem] border border-white/70 bg-white/65 p-8 shadow-[0_30px_80px_rgba(219,39,119,0.18)] backdrop-blur-xl md:p-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f7b7cf] bg-white/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#d14d86]">
                <span className="sparkle">♡</span>
                Voice Note
              </div>

              <h1 className="font-serif text-5xl leading-none text-[#b8326e] md:text-7xl">
                I love you!
              </h1>

              <div className="mt-10 grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[1.75rem] border border-[#ffd2e3] bg-[#fff9fc]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#df6c9f]">
                    Now playing
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[#aa2f67]">
                    iloveyou.mp4
                  </p>
                  <audio
                    className="mt-6 w-full"
                    controls
                    preload="metadata"
                    src="/assets/uploads/I%20love%20you.m4a"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>

                <div className="relative overflow-hidden rounded-[1.75rem] border border-[#ffc7dc] bg-[linear-gradient(180deg,_rgba(255,255,255,0.85),_rgba(255,223,236,0.95))] p-6">
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#ffb6d5]/60 blur-2xl" />
                  <div className="absolute -bottom-10 left-4 h-32 w-32 rounded-full bg-[#ffd8e8]/80 blur-2xl" />
                  <div className="relative mt-6 flex flex-wrap gap-3 text-3xl justify-center">
                    <span className="bounce-heart"> ♥</span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.2s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.4s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.6s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.8s" }}
                    >
                      ♥
                    </span>

                    <span className="bounce-heart"> ♥</span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.2s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.4s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.6s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.8s" }}
                    >
                      ♥
                    </span>
                    <span className="bounce-heart"> ♥</span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.2s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.4s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.6s" }}
                    >
                      ♥
                    </span>
                    <span
                      className="bounce-heart"
                      style={{ animationDelay: "0.8s" }}
                    >
                      ♥
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .love-card {
          animation: cardEntrance 900ms ease-out forwards,
            cardGlow 4s ease-in-out infinite;
        }

        .sparkle {
          animation: twinkle 1.8s ease-in-out infinite;
        }

        .floating-heart {
          position: absolute;
          bottom: -10%;
          color: rgba(214, 73, 132, 0.32);
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.55);
          animation-name: floatUp;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .bounce-heart {
          display: inline-block;
          animation: bouncePop 1.8s ease-in-out infinite;
        }

        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(32px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cardGlow {
          0%,
          100% {
            box-shadow: 0 30px 80px rgba(219, 39, 119, 0.18);
          }
          50% {
            box-shadow: 0 38px 100px rgba(219, 39, 119, 0.26);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes floatUp {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translate3d(18px, -42vh, 0) rotate(8deg);
          }
          100% {
            transform: translate3d(-12px, -92vh, 0) rotate(-10deg);
            opacity: 0;
          }
        }

        @keyframes bouncePop {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.12);
          }
        }
      `}</style>
    </>
  );
}
