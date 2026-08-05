/* eslint-disable @next/next/no-img-element */
import graham from "@/public/assets/people/graham.jpeg";
import Head from "next/head";

const Sam = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Graham</title>
      </Head>
      <img
        src={graham.src}
        alt="lemon"
        className="rounded-lg shadow-lg max-w-full h-auto"
      />
    </div>
  );
};

export default Sam;
