/* eslint-disable @next/next/no-img-element */
import saksham from "@/public/assets/people/saksham.jpeg";
import Head from "next/head";

const Saksham = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Saksham</title>
      </Head>
      <img
        src={saksham.src}
        alt="loser"
        className="rounded-lg shadow-lg max-w-full h-auto"
      />
    </div>
  );
};

export default Saksham;
