const Education = () => {
  return (
    <section
      className="bg-background text-text px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-12 md:py-16 w-full max-w-full overflow-hidden scroll-mt-24"
      id="education"
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-bold mb-4">
        <span className="gradient-text">Education</span>
      </h1>

      <div className="glass-card rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl w-full">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl font-bold text-primary mb-2 break-words">
              University of North Carolina at Chapel Hill
            </h2>
            <p className="text-base sm:text-lg md:text-xl 2xl:text-2xl mb-2 break-words">
              Bachelor of Science in Computer Science & Data Science
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base mt-2 text-text/80">
              <span>Aug 2023 – May 2027</span>
             
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-4 text-text/80 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <span className="font-semibold">GPA: 3.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Education;
