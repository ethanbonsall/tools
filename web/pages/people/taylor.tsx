/* eslint-disable @next/next/no-img-element */
import taylor from "@/public/assets/people/taylor.jpeg";
import Head from "next/head";

export default function HeartImage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <Head>
        <title>MY LOVE!</title>
      </Head>
      <div className="w-[50dvh] h-[50dvh] flex flex-row items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <clipPath id="heartClip">
              <path
                d="M50 90 
                       C20 60 0 40 0 25 
                       C0 10 10 0 25 0 
                       C40 0 50 10 50 20 
                       C50 10 60 0 75 0 
                       C90 0 100 10 100 25 
                       C100 40 80 60 50 90 Z"
              />
            </clipPath>
          </defs>
          <image
            href={taylor.src}
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#heartClip)"
          />
        </svg>
      </div>
    </div>
  );
}
