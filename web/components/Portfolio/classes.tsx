const Courses = () => {
  const courses = [
    {
      name: "Foundations of Programming",
      description:
        "Learned how to reason about how my code is structured, identify whether a given structure is effective in a given context, and look at ways of organizing units of code that support larger programs.",
    },
    {
      name: "Introduction to Machine Learning",
      description:
        "Studied machine learning methods applied to speech recognition, tracking, collaborative filtering, and recommendation systems. Covered classification, regression, support vector machines, hidden Markov models, principal component analysis, and deep learning.",
    },
    {
      name: "Modern Web Programming",
      description:
        "Built full-stack web apps using Next.js, TypeScript, and Tailwind CSS. Gained hands-on experience with frontend and backend development, deploying multiple websites from scratch or starter code, and learning scalable web architecture and responsive design.",
    },
    {
      name: "Foundations of Software Engineering",
      description:
        "Completed multiple software projects in an Agile environment, learning collaboration, version control, testing, and software design principles. Gained experience with team workflows, coding standards, and writing maintainable, well-documented code.",
    },
    {
      name: "Software Engineering Lab",
      description:
        "Collaborated with a company to design, build, and deliver a complete software product. Gained experience in requirement analysis, architecture design, implementation, testing, deployment, and stakeholder communication.",
    },
    {
      name: "Mobile Computing Systems",
      description:
        "Developed Android apps using Java in Android Studio, gaining experience with UI design, activity lifecycle, data storage, API integration, and debugging. Completed multiple projects emphasizing collaboration, agile workflows, and user-friendly app development.",
    },
  ];

  type Course = {
    name: string;
    description: string;
  };

  const CourseList = ({ courses }: { courses: Course[] }) => {
    return (
      <div className="pb-12 md:pb-16 lg:pb-20 bg-background w-full max-w-full overflow-hidden px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-bold mb-4">
          <span className="gradient-text">Coursework</span>
        </h1>
        <div className="w-full overflow-x-auto py-4 md:py-6 custom-scrollbar">
          <div className="flex overflow-y-visible space-x-3 md:space-x-4 w-fit">
            {courses.map((course, index) => (
              <div
                key={index}
                className="flex-shrink-0 glass-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 w-[85vw] sm:w-[70vw] md:w-[350px] 2xl:w-[400px] transition-all duration-300 group"
              >
                <h3 className="text-primary font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl mb-3 md:mb-4 group-hover:gradient-text transition-all break-words">
                  {course.name}
                </h3>
                <p className="text-text text-sm sm:text-base md:text-lg 2xl:text-xl leading-relaxed">
                  {course.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  return <CourseList courses={courses} />;
};

export default Courses;
