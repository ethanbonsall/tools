import Courses from "../components/Portfolio/classes";
import Header from "../components/Portfolio/headerNew";
import Web from "../components/Portfolio/projects";
import Education from "../components/Portfolio/education";
import Skills from "../components/Portfolio/skills";
import Experience from "../components/Portfolio/experience";
import NavBar from "../components/Portfolio/navbar";
import Head from "next/head";

const Portfolio = () => {
  return (
    <div
      className="bg-background flex flex-col items-center font-robot min-h-screen"
      id="home"
    >
      <Head>
        <title>Ethan Bonsall</title>
        <meta
          name="description"
          content="Ethan Bonsall's personal portfolio website showcasing education, experience, skills, and projects."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NavBar />
      <Header />
      <Experience />
      <Web />
      <Education />
      <Courses />
      <Skills />
    </div>
  );
};

export default Portfolio;
