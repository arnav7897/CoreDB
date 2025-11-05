import React from "react";
import {
  Linkedin,
  Github,
  Mail,
  Database,
  Code,
  Server,
  Cpu,
  Brain,
  Award,
} from "lucide-react";

// =======================
// Type Definitions
// =======================
interface Developer {
  id: number;
  name: string;
  role: string;
  specialization: string | string[];
  image: string;
  email: string;
  github: string;
  linkedin: string;
  bio: string;
  skills: string[];
  contributions: string[];
  projects: number;
}

interface Tech {
  name: string;
  icon: React.ElementType;
  color: string;
}

interface DeveloperCardProps {
  developer: Developer;
}

// =======================
// Developer Card
// =======================
const DeveloperCard: React.FC<DeveloperCardProps> = ({ developer }) => (
  <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden border border-gray-100">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10 p-6">
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
          {developer.name[0]}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{developer.name}</h3>
          <p className="text-blue-600 font-semibold text-sm">{developer.role}</p>
          <p className="text-gray-600 text-sm">
            {Array.isArray(developer.specialization)
              ? developer.specialization.join(", ")
              : developer.specialization}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{developer.bio}</p>

      {/* Skills */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Code className="w-4 h-4 mr-2" />
          Technical Skills
        </h4>
        <div className="flex flex-wrap gap-2">
          {developer.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Contributions */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Award className="w-4 h-4 mr-2" />
          Key Contributions
        </h4>
        <div className="space-y-2">
          {developer.contributions.map((task, index) => (
            <div key={index} className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              {task}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="flex justify-between items-center border-t pt-4 border-gray-100">
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{developer.projects}</span> projects
        </div>
        <div className="flex space-x-3">
          <a
            href={`mailto:${developer.email}`}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href={developer.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href={developer.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  </div>
);

// =======================
// Main Component
// =======================
const CoreDBTeam: React.FC = () => {
  const developmentTeam: Developer[] = [
    {
      id: 1,
      name: "Arnav Sharda",
      role: "Backend & Data Systems Engineer",
      specialization: "Python, SQL, DBMS, Lexical Analysis",
      image: "/Team/arnav.png",
      email: "asharda7898@gmail.com",
      github: "https://github.com/arnav7897",
      linkedin: "https://www.linkedin.com/in/arnav-sharda-bb281725a/",
      bio: "Focused on database systems, backend logic, and compiler-based lexical analysis integration for CoreDB.",
      skills: ["Python", "SQL", "Lexical Analyzer", "DBMS", "System Design"],
      contributions: [
        "Database schema design & normalization",
        "Lexical analyzer for query parsing",
        "Backend integration with React",
      ],
      projects: 8,
    },
    {
      id: 2,
      name: "Rohit Mehta",
      role: "Frontend & Integration Developer",
      specialization: "React, DBMS Interface Design",
      image: "/Team/rohit.png",
      email: "rohitmehta@example.com",
      github: "https://github.com/rohit-coredb",
      linkedin: "https://www.linkedin.com/in/rohit-mehta/",
      bio: "Frontend developer specializing in database visualization and React integration with Python-based APIs.",
      skills: ["React", "Tailwind CSS", "API Integration", "SQL", "DBMS"],
      contributions: [
        "Frontend interface for query execution",
        "Dynamic result visualization",
        "API integration with backend",
      ],
      projects: 7,
    },
  ];

  const techStack: Tech[] = [
    { name: "Python", icon: Cpu, color: "text-yellow-600" },
    { name: "Lexical Analyzer", icon: Brain, color: "text-purple-600" },
    { name: "React", icon: Code, color: "text-blue-600" },
    { name: "SQL", icon: Database, color: "text-green-600" },
    { name: "DBMS", icon: Server, color: "text-gray-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Tech Stack Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">CoreDB Tech Stack</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            Technologies powering CoreDB — a lightweight database management and query analysis system
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {techStack.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Icon className={`w-8 h-8 ${tech.color}`} />
                  </div>
                  <p className="font-semibold text-gray-700">{tech.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Meet the CoreDB Team</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            The CoreDB project is developed by a focused two-member team combining
            backend systems and frontend design for a complete DBMS experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {developmentTeam.map((developer) => (
            <DeveloperCard key={developer.id} developer={developer} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Want to Learn More About CoreDB?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            CoreDB merges theory and practice — a hands-on project showcasing
            database internals, query parsing, and real-time data visualization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold">
              View Source Code
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-colors font-semibold">
              Contact Developers
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoreDBTeam;
