import { motion } from "framer-motion";
import { Briefcase, Code } from "lucide-react";

const Experience = () => {
  return (
    <section
      className="bg-background text-text px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-6 md:pt-8 pb-12 md:pb-16 w-full max-w-full overflow-hidden scroll-mt-24"
      id="experience"
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-bold mb-4">
        <span className="gradient-text">Experience</span>
      </h1>

      <div className="relative border-l-2 md:border-l-4 border-primary pl-4 md:pl-6 ml-2 space-y-6 md:space-y-10 w-full max-w-full">
        {/* Data Science Intern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-full"
        >
          <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full -left-[1.15rem] md:-left-[1.4rem] top-4" />
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="text-primary w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary break-words">
              Data Science Intern
            </h2>
          </div>
          <p className="text-base sm:text-lg md:text-xl font-medium">
            Marsh McLennan Agency
            <span className="text-text/70"> • Raleigh, NC (hybrid)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base mt-2">
            <span>May 2026 – Jul 2026</span>
            <span className="bg-primary text-background px-2 py-0.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
              3 mos
            </span>
          </div>
          <ul className="list-disc pl-4 sm:pl-5 mt-3 text-sm sm:text-base md:text-lg text-text/80 space-y-1 md:space-y-2">
            <li>
              Developed a{" "}
              <strong className="text-text font-semibold">
                full-stack prototype analytics dashboard
              </strong>{" "}
              using{" "}
              <strong className="text-text font-semibold">
                React, TypeScript, Node.js, and FastAPI
              </strong>{" "}
              to help internal teams better understand patient data. Built
              user-facing features, cleaned and transformed data, implemented{" "}
              <strong className="text-text font-semibold">
                optimistic updates and caching
              </strong>
              , optimized database performance with{" "}
              <strong className="text-text font-semibold">
                precomputed tables
              </strong>
              , and reduced perceived load times through{" "}
              <strong className="text-text font-semibold">
                background data loading
              </strong>
              .
            </li>
            <li className="font-semibold text-primary mt-2 break-words">
              Skills: React, TypeScript, Node.js, FastAPI, Data Cleaning, Caching
            </li>
          </ul>
        </motion.div>

        {/* Data Engineer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.03 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-full"
        >
          <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full -left-[1.15rem] md:-left-[1.4rem] top-4" />
          <div className="flex items-center gap-2 mb-2">
            <Code className="text-primary w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary break-words">
              Data Engineer
            </h2>
          </div>
          <p className="text-base sm:text-lg md:text-xl font-medium">
            The University of North Carolina at Chapel Hill
            <span className="text-text/70">
              {" "}
              • Brain Computer Interface Lab
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base mt-2">
            <span>Feb 2026 – May 2026</span>
            <span className="bg-primary text-background px-2 py-0.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
              4 mos
            </span>
          </div>
          <ul className="list-disc pl-4 sm:pl-5 mt-3 text-sm sm:text-base md:text-lg text-text/80 space-y-1 md:space-y-2">
            <li>
              Built{" "}
              <strong className="text-text font-semibold">
                RTL verification infrastructure
              </strong>{" "}
              using{" "}
              <strong className="text-text font-semibold">
                SystemVerilog, SVUnit, and UVM-style testbenches
              </strong>{" "}
              to validate processor modules and ensure functional correctness
              across core hardware components.
            </li>
            <li>
              Developed automated simulation and regression workflows with{" "}
              <strong className="text-text font-semibold">
                Questa and Python
              </strong>{" "}
              scripting, improving test coverage, debugging efficiency, and
              overall verification reliability.
            </li>
            <li>
              Implemented reproducible data processing and verification
              workflows with{" "}
              <strong className="text-text font-semibold">Pandas</strong> and
              version-controlled datasets, ensuring consistency, traceability,
              and usability of collected data across experiments.
            </li>
            <li className="font-semibold text-primary mt-2 break-words">
              Skills: SystemVerilog, SVUnit, UVM, Questa, Python, Pandas
            </li>
          </ul>
        </motion.div>

        {/* Software Engineer Intern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-full"
        >
          <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full -left-[1.15rem] md:-left-[1.4rem] top-4" />
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="text-primary w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary break-words">
              Software Engineer Intern
            </h2>
          </div>
          <p className="text-base sm:text-lg md:text-xl font-medium">
            Sheetz
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base mt-2">
            <span>May 2025 – Feb 2026</span>
            <span className="bg-primary text-background px-2 py-0.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
              10 mos
            </span>
          </div>
          <ul className="list-disc pl-4 sm:pl-5 mt-3 text-sm sm:text-base md:text-lg text-text/80 space-y-1 md:space-y-2">
            <li>
              Migrated loyalty data pipelines from legacy streaming tables to{" "}
              <strong className="text-text font-semibold">
                Delta Live Tables in Databricks
              </strong>
              , enabling the Ignite loyalty platform.
            </li>
            <li>
              Updated{" "}
              <strong className="text-text font-semibold">Python</strong>{" "}
              services to integrate the Sheetz mobile app with the new Ignite
              loyalty backend.
            </li>
            <li>
              Built{" "}
              <strong className="text-text font-semibold">CI/CD</strong>{" "}
              automation with{" "}
              <strong className="text-text font-semibold">
                GitLab and ServiceNow
              </strong>{" "}
              to create incident tickets when pipeline or data quality checks
              failed.
            </li>
            <li>
              Developed Python automation to audit{" "}
              <strong className="text-text font-semibold">
                2,000+ database tables
              </strong>{" "}
              for metadata compliance and improve data governance.
            </li>
            <li>
              Reduced Databricks job costs by{" "}
              <strong className="text-text font-semibold">15%</strong> by
              analyzing pipeline utilization with{" "}
              <strong className="text-text font-semibold">SQL and Python</strong>{" "}
              and identifying unused jobs.
            </li>
            <li>
              Created{" "}
              <strong className="text-text font-semibold">Power BI</strong>{" "}
              dashboards and SQL reports to monitor pipeline health and data
              quality.
            </li>
            <li className="font-semibold text-primary mt-2 break-words">
              Skills: Python, SQL, Databricks, Git, GitLab, Power BI
            </li>
          </ul>
        </motion.div>

        {/* Freelance Web Developer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.07 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-full"
        >
          <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full -left-[1.15rem] md:-left-[1.4rem] top-4" />
          <div className="flex items-center gap-2 mb-2">
            <Code className="text-primary w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary break-words">
              Freelance Web Developer
            </h2>
          </div>
          <p className="text-base sm:text-lg md:text-xl font-medium">
            Self Employed
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base mt-2">
            <span>Jul 2023 – Jan 2026</span>
            <span className="bg-primary text-background px-2 py-0.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
              2 yrs 7 mos
            </span>
          </div>
          <ul className="list-disc pl-4 sm:pl-5 mt-3 text-sm sm:text-base md:text-lg text-text/80 space-y-1 md:space-y-2">
            <li>
              Designed, developed, and deployed custom{" "}
              <strong className="text-text font-semibold">
                full-stack web applications
              </strong>{" "}
              using{" "}
              <strong className="text-text font-semibold">
                Next.js, React, TypeScript, PostgreSQL, and Tailwind CSS
              </strong>
              .
            </li>
            <li>
              Built responsive,{" "}
              <strong className="text-text font-semibold">SEO-optimized</strong>{" "}
              websites with features including appointment scheduling, content
              management, e-commerce, and interactive{" "}
              <strong className="text-text font-semibold">3D</strong>{" "}
              experiences.
            </li>
            <li>
              Collaborated with clients and healthcare professionals to deliver
              tailored solutions, including a{" "}
              <strong className="text-text font-semibold">
                HIPAA-compliant
              </strong>{" "}
              application that automated pediatric nutrient calculations.
            </li>
            <li>
              Managed projects from requirements gathering through deployment
              and ongoing maintenance.
            </li>
            <li className="font-semibold text-primary mt-2 break-words">
              Skills: Next.js, React, TypeScript, PostgreSQL, Tailwind CSS
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
};

export default Experience;
