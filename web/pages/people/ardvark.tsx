/* eslint-disable @next/next/no-img-element */
import ardvark from "@/public/assets/people/ardvark.jpeg";
import Head from "next/head";

const Sam = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Aaratrik</title>
      </Head>
      <img
        src={ardvark.src}
        alt="lemon"
        className="rounded-lg shadow-lg max-w-full h-auto"
      />
    </div>
  );
};

export default Sam;
