import Head from "next/head";

export default function PrivateRepoPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-background text-text px-6">
      <Head>
        <title>Git</title>
      </Head>
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-4xl font-bold text-accent">
          🔒 Private Repository
        </h1>
        <p className="text-lg">
          Sorry! This repository is currently private. If you&apos;d like to
          view the source code or learn more about this project, please reach
          out to me.
        </p>
        <a
          href="mailto:ethanbonsall50@gmail.com"
          className="inline-block px-6 py-3 text-white bg-accent hover:bg-opacity-80 rounded-xl transition-all duration-300"
        >
          📬 Contact Me
        </a>
        <p>
          Or email me directly at &nbsp;
          <span className="underline text-accent">
            ethanbonsall50@gmail.com
          </span>
        </p>
      </div>
    </main>
  );
}
