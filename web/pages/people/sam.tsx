/* eslint-disable @next/next/no-img-element */
import sam from "@/public/assets/people/sam.jpeg";
import Head from "next/head";

const Sam = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Sam</title>
      </Head>
      <img
        src={sam.src}
        alt="Sam"
        className="rounded-lg shadow-lg max-w-full h-auto"
      />
    </div>
  );
};

export default Sam;
