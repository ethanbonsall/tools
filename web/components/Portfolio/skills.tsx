/* eslint-disable @next/next/no-img-element */
import java from "@/public/assets/logos/java.png";
import python from "@/public/assets/logos/python.png";
import javascript from "@/public/assets/logos/javaScript.png";
import typescript from "@/public/assets/logos/typeScript.png";
import cpp from "@/public/assets/logos/cpp.png";
import sql from "@/public/assets/logos/sql.png";
import react from "@/public/assets/logos/react-1.svg";
import angular from "@/public/assets/logos/angular.png";
import expressjs from "@/public/assets/logos/expressjs.png";
import nextjs from "@/public/assets/logos/nextjs.png";
import pandas from "@/public/assets/logos/pandas.svg";
import postgres from "@/public/assets/logos/postgres.png";
import supabase from "@/public/assets/logos/supabase.jpg";
import tableau from "@/public/assets/logos/tableau.png";
import tensorflow from "@/public/assets/logos/tensorflow.png";
import css from "@/public/assets/logos/css.svg";
import html from "@/public/assets/logos/html.png";
const Skills = () => {
  return (
    <section className="bg-background text-text px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12 md:py-16 w-full max-w-full overflow-hidden">
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-bold mb-4">
        <span className="gradient-text">Skills & Technologies</span>
      </h1>
   
      {/* Programming Languages */}
      <div className="mb-8 md:mb-12 w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-6">
          Programming Languages
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 w-full">
          {[
            { src: java, name: "Java" },
            { src: python, name: "Python" },
            { src: javascript, name: "JavaScript" },
            { src: typescript, name: "TypeScript" },
            { src: cpp, name: "C++" },
            { src: sql, name: "SQL" },
          ].map((tech, index) => (
            <div key={index} className="glass-card rounded-lg md:rounded-xl p-3 md:p-4 flex flex-col items-center justify-center group w-full max-w-full">
              <img
                src={tech.src.src}
                alt={tech.name}
                className="w-10 sm:w-12 md:w-16 lg:w-20 h-auto transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xs sm:text-sm mt-2 text-text/70 text-center break-words">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frameworks & Libraries */}
      <div className="mb-8 md:mb-12 w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-6">
          Frameworks & Libraries
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 w-full">
          {[
            { src: react, name: "React" },
            { src: nextjs, name: "Next.js", bg: true },
            { src: angular, name: "Angular" },
            { src: supabase, name: "Supabase" },
            { src: tensorflow, name: "TensorFlow" },
            { src: expressjs, name: "Express.js" },
            { src: postgres, name: "PostgreSQL" },
            { src: pandas, name: "Pandas", bg: true },
          ].map((tech, index) => (
            <div key={index} className="glass-card rounded-lg md:rounded-xl p-3 md:p-4 flex flex-col items-center justify-center group w-full max-w-full">
              <img
                src={tech.src.src}
                alt={tech.name}
                className={`w-10 sm:w-12 md:w-16 lg:w-20 h-auto transition-transform duration-300 group-hover:scale-110 ${tech.bg ? 'bg-white/10 rounded-lg p-1' : ''}`}
              />
              <span className="text-xs sm:text-sm mt-2 text-text/70 text-center break-words">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tools, Platforms & Others */}
      <div className="w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-6">
          Tools & Others
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 w-full">
          {[
            { src: tableau, name: "Tableau" },
            { src: css, name: "CSS" },
            { src: html, name: "HTML", bg: true },
          ].map((tech, index) => (
            <div key={index} className="glass-card rounded-lg md:rounded-xl p-3 md:p-4 flex flex-col items-center justify-center group w-full max-w-full">
              <img
                src={tech.src.src}
                alt={tech.name}
                className={`w-10 sm:w-12 md:w-16 lg:w-20 h-auto transition-transform duration-300 group-hover:scale-110 ${tech.bg ? 'bg-white/10 rounded-lg p-1' : ''}`}
              />
              <span className="text-xs sm:text-sm mt-2 text-text/70 text-center break-words">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
