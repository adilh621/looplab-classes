"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SiJavascript,
  SiPython,
  SiReact,
  SiCplusplus,
  SiScratch,
  SiHtml5,
} from "react-icons/si";

// Constants
const CODING_LANGUAGES = [
  { id: "none", label: "No experience", icon: null },
  { id: "javascript", label: "JavaScript", icon: SiJavascript },
  { id: "python", label: "Python", icon: SiPython },
  { id: "java", label: "React", icon: SiReact },
  { id: "cpp", label: "C++", icon: SiCplusplus },
  { id: "scratch", label: "Scratch", icon: SiScratch },
  { id: "htmlcss", label: "HTML/CSS", icon: SiHtml5 },
];

const MATH_SUBJECTS = [
  "Algebra",
  "Geometry",
  "Trigonometry",
  "Pre-Calc",
  "Calculus",
  "Other",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface FormErrors {
  studentName?: string;
  studentAge?: string;
  parentName?: string;
  parentEmail?: string;
  tutoringType?: string;
  codingLanguage?: string;
  mathSubject?: string;
  mathOther?: string;
}

export default function SignupPage() {
  // Form state
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState<number | "">("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [tutoringType, setTutoringType] = useState<"coding" | "math" | "">("");
  const [codingLanguage, setCodingLanguage] = useState<string>("");
  const [mathSubject, setMathSubject] = useState<string>("");
  const [mathOther, setMathOther] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [questions, setQuestions] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if parent/guardian fields are required
  const isUnder18 = typeof studentAge === "number" && studentAge < 18;
  const parentRequired = isUnder18;

  // Toggle availability day
  const toggleAvailability = (day: string) => {
    setAvailability((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!studentName.trim()) {
      newErrors.studentName = "Student name is required";
    }

    if (!studentAge || typeof studentAge !== "number" || studentAge < 1 || studentAge > 99) {
      newErrors.studentAge = "Please enter a valid age";
    }

    if (parentRequired) {
      if (!parentName.trim()) {
        newErrors.parentName = "Parent/Guardian name is required for students under 18";
      }
      if (!parentEmail.trim()) {
        newErrors.parentEmail = "Parent/Guardian email is required for students under 18";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        newErrors.parentEmail = "Please enter a valid email address";
      }
    } else if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      newErrors.parentEmail = "Please enter a valid email address";
    }

    if (!tutoringType) {
      newErrors.tutoringType = "Please select a tutoring type";
    } else if (tutoringType === "coding" && !codingLanguage) {
      newErrors.codingLanguage = "Please select a coding language";
    } else if (tutoringType === "math") {
      if (!mathSubject) {
        newErrors.mathSubject = "Please select a math subject";
      } else if (mathSubject === "Other" && !mathOther.trim()) {
        newErrors.mathOther = "Please specify the other subject";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    
    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const formData = {
      studentName,
      studentAge: typeof studentAge === "number" ? studentAge : 0,
      parentName: parentName || null,
      parentEmail: parentEmail || null,
      tutoringType,
      codingLanguage: tutoringType === "coding" ? codingLanguage : null,
      mathSubject: tutoringType === "math" ? mathSubject : null,
      mathOther: tutoringType === "math" && mathSubject === "Other" ? mathOther : null,
      availability,
      questions: questions || null,
    };

    console.log("Form submitted:", formData);
    
    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
        {/* Blue Steel Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-600 to-blue-800" />
        
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white/10 border border-white/15 rounded-3xl p-8 md:p-10 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Thanks! We&apos;ll reach out soon.
              </h1>
              <p className="text-white/70 mb-6">
                We&apos;ve received your information and will contact you shortly to set up your first session.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-gray-900 font-semibold hover:scale-[1.02] transition-transform duration-200"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Blue Steel Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-600 to-blue-800" />

      {/* Navigation Header */}
      <header className="relative z-20 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-xl text-white tracking-tight"
          >
            LoopLab<span className="text-blue-500"> Classes</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </header>

      {/* Centered Form Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Glass Card - no blur for performance */}
          <div className="bg-white/10 border border-white/15 rounded-3xl p-6 md:p-8 lg:p-10 shadow-xl">
            {/* Card Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Get started</h1>
              <p className="text-white/60">Tell us a bit about the student and what you need help with.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
            {/* Student Info */}
            <section>
              <h2 className="text-xl font-bold text-white/90 mb-4">Student Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="studentName" className="block text-sm font-medium text-white/80 mb-2">
                    Student Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 ${
                      errors.studentName ? "border-red-500/50" : "border-white/15"
                    }`}
                    placeholder="Enter student's full name"
                  />
                  {errors.studentName && (
                    <p className="mt-1 text-sm text-red-300">{errors.studentName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="studentAge" className="block text-sm font-medium text-white/80 mb-2">
                    Student Age <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    id="studentAge"
                    value={studentAge}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentAge(val === "" ? "" : parseInt(val, 10));
                    }}
                    min="1"
                    max="99"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 ${
                      errors.studentAge ? "border-red-500/50" : "border-white/15"
                    }`}
                    placeholder="Enter age"
                  />
                  {errors.studentAge && (
                    <p className="mt-1 text-sm text-red-300">{errors.studentAge}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Parent/Guardian */}
            <section>
              <h2 className="text-xl font-bold text-white/90 mb-4">
                Parent/Guardian Information
                {parentRequired && <span className="text-red-400 ml-1">*</span>}
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="parentName" className="block text-sm font-medium text-white/80 mb-2">
                    Parent/Guardian Name {parentRequired && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    id="parentName"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 ${
                      errors.parentName ? "border-red-500/50" : "border-white/15"
                    }`}
                    placeholder="Enter parent/guardian name"
                  />
                  {errors.parentName && (
                    <p className="mt-1 text-sm text-red-300">{errors.parentName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="parentEmail" className="block text-sm font-medium text-white/80 mb-2">
                    Parent/Guardian Email {parentRequired && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="email"
                    id="parentEmail"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 ${
                      errors.parentEmail ? "border-red-500/50" : "border-white/15"
                    }`}
                    placeholder="parent@example.com"
                  />
                  {errors.parentEmail && (
                    <p className="mt-1 text-sm text-red-300">{errors.parentEmail}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Tutoring Type */}
            <section>
              <h2 className="text-xl font-bold text-white/90 mb-4">
                Tutoring Type <span className="text-red-400">*</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setTutoringType("coding");
                    setMathSubject("");
                    setMathOther("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-colors duration-150 text-left ${
                    tutoringType === "coding"
                      ? "border-cyan-400/50 bg-white/10"
                      : "border-white/15 bg-white/5 hover:bg-white/10"
                  } ${errors.tutoringType ? "border-red-500/50" : ""}`}
                >
                  <div className="text-lg font-semibold text-white">Coding</div>
                  <div className="text-sm text-white/70 mt-1">Learn programming languages</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTutoringType("math");
                    setCodingLanguage("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-colors duration-150 text-left ${
                    tutoringType === "math"
                      ? "border-cyan-400/50 bg-white/10"
                      : "border-white/15 bg-white/5 hover:bg-white/10"
                  } ${errors.tutoringType ? "border-red-500/50" : ""}`}
                >
                  <div className="text-lg font-semibold text-white">Math</div>
                  <div className="text-sm text-white/70 mt-1">Math tutoring and support</div>
                </button>
              </div>
              {errors.tutoringType && (
                <p className="mt-2 text-sm text-red-300">{errors.tutoringType}</p>
              )}
            </section>

            {/* Coding Languages */}
            {tutoringType === "coding" && (
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  Coding Language <span className="text-red-400">*</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CODING_LANGUAGES.map((lang) => {
                    const Icon = lang.icon;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setCodingLanguage(lang.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors duration-150 text-left ${
                          codingLanguage === lang.id
                            ? "border-cyan-400/50 bg-white/10"
                            : "border-white/15 bg-white/5 hover:bg-white/10"
                        } ${errors.codingLanguage ? "border-red-500/50" : ""}`}
                      >
                        {Icon ? (
                          <Icon className="w-5 h-5 text-white flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/20 flex-shrink-0" />
                        )}
                        <span className="font-medium text-white">{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.codingLanguage && (
                  <p className="mt-2 text-sm text-red-300">{errors.codingLanguage}</p>
                )}
              </section>
            )}

            {/* Math Subjects */}
            {tutoringType === "math" && (
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  Math Subject <span className="text-red-400">*</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MATH_SUBJECTS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => {
                        setMathSubject(subject);
                        if (subject !== "Other") setMathOther("");
                      }}
                      className={`p-3 rounded-xl border-2 transition-colors duration-150 text-left ${
                        mathSubject === subject
                          ? "border-cyan-400/50 bg-white/10"
                          : "border-white/15 bg-white/5 hover:bg-white/10"
                      } ${errors.mathSubject ? "border-red-500/50" : ""}`}
                    >
                      <span className="font-medium text-white">{subject}</span>
                    </button>
                  ))}
                </div>
                {errors.mathSubject && (
                  <p className="mt-2 text-sm text-red-300">{errors.mathSubject}</p>
                )}

                {mathSubject === "Other" && (
                  <div className="mt-4">
                    <label htmlFor="mathOther" className="block text-sm font-medium text-white/80 mb-2">
                      Enter other subject <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="mathOther"
                      value={mathOther}
                      onChange={(e) => setMathOther(e.target.value)}
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 ${
                        errors.mathOther ? "border-red-500/50" : "border-white/15"
                      }`}
                      placeholder="e.g., Statistics, Linear Algebra"
                    />
                    {errors.mathOther && (
                      <p className="mt-1 text-sm text-red-300">{errors.mathOther}</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Availability */}
            <section>
              <h2 className="text-xl font-bold text-white/90 mb-1">Availability</h2>
              <p className="text-sm text-white/70 mb-4">(can always be set up later)</p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleAvailability(day)}
                    className={`px-4 py-2 rounded-full font-medium transition-colors duration-150 ${
                      availability.includes(day)
                        ? "bg-cyan-400/30 border border-cyan-400/50 text-white"
                        : "bg-white/5 border border-white/15 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </section>

            {/* Questions/Comments */}
            <section>
              <label htmlFor="questions" className="block text-sm font-medium text-white/80 mb-2">
                Questions / Comments
              </label>
              <textarea
                id="questions"
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200 resize-none"
                placeholder="Any questions or additional information you'd like to share..."
              />
            </section>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-full font-semibold text-base transition-transform duration-200 ${
                  submitting
                    ? "bg-white/30 text-white/60 cursor-not-allowed"
                    : "bg-white text-gray-900 hover:scale-[1.02]"
                }`}
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Get invite"
                )}
              </button>
            </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

