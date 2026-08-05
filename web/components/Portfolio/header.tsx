/* eslint-disable @next/next/no-img-element */
import linkedinLogo from "@/public/assets/logos/linkedin-logo.jpeg";
import githubLogo from "@/public/assets/logos/github-logo.png";
import profilePic from "@/public/assets/image.jpeg";
import ThemeToggle from "@/components/toggle";

const Header = () => {
  return (
    <div className="flex justify-between items-center w-full bg-secondary text-text p-5 border-accent border-y-2">
      <div className="flex flex-col pl-5">
        <h1 className="m-1 text-4xl font-bold">Ethan Bonsall</h1>
        <h4 className="m-1 text-2xl">
          UNC Chapel Hill Sophomore | Software Developer
        </h4>
        <h4 className="m-1">
          Philadelphia, Harrisburg & Pittsburgh, PA | Chapel Hill & Charlotte,
          NC
        </h4>
        <ThemeToggle></ThemeToggle>
      </div>
      <div className="flex gap-4 items-center pr-10">
        <a
          href="https://www.linkedin.com/in/ethanbonsall/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={linkedinLogo.src}
            alt="LinkedIn"
            className="image-hover w-24 h-auto"
          />
        </a>
        <a
          href="https://github.com/ethanbonsall"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={githubLogo.src}
            alt="GitHub"
            className="image-hover w-14 h-auto rounded-full"
          />
        </a>
        <img
          src={profilePic.src}
          alt="Profile"
          className="image-hover w-40 h-40 rounded-full ml-6 border-accent border-2"
        />
      </div>
    </div>
  );
};

export default Header;
