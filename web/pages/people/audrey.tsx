/* eslint-disable @next/next/no-img-element */
import audrey from "@/public/assets/people/audrey.jpeg";
import Head from "next/head";

const Audrey = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Audrey</title>
      </Head>
      <img
        src={audrey.src}
        alt="audrey"
        className="rounded-lg shadow-lg max-w-full h-auto"
      />
    </div>
  );
};

export default Audrey;
