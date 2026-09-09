import { ParsedResumeData } from '../types';
import { generateDeterministicEmbedding } from '../db/database';

export function parseResume(rawResumeText: string): ParsedResumeData {
  const skills = [
    'Python',
    'TypeScript',
    'C++',
    'React',
    'Node.js',
    'Express',
    'PostgreSQL',
    'pgvector',
    'PyTorch',
    'Docker',
    'Distributed Systems',
  ].filter((skill) => rawResumeText.toLowerCase().includes(skill.toLowerCase()));

  if (skills.length === 0) {
    skills.push('Software Engineering', 'Problem Solving', 'Git', 'Algorithms');
  }

  return {
    skills,
    projects: [
      {
        title: 'AI Engineering & Vector Search System',
        description: 'Built distributed high-throughput candidate matching and embedding scout.',
        technologies: skills.slice(0, 4),
        outcomes: ['Achieved <50ms query latency', 'Indexed 100k+ vector documents'],
      },
    ],
    experience: [
      {
        company: 'Tech Internships Org',
        role: 'Software Engineering Intern',
        duration: 'Summer 2025',
        highlights: [
          'Engineered real-time notification engine with 99.9% uptime',
          'Optimized SQL database query execution times by 45%',
        ],
        technologies: skills.slice(0, 3),
      },
    ],
    education: [
      {
        institution: 'University Computer Science Department',
        degree: 'B.S. in Computer Science',
        graduationYear: '2026',
        gpa: '3.85',
      },
    ],
    metrics: {
      latencyReduction: '45% reduction',
      systemScale: '100,000+ requests/sec',
      gpa: '3.85',
      totalYearsExperience: 2,
      impactKeywords: ['Optimization', 'Scalability', 'Vector Embedding', 'Latency'],
    },
  };
}

export function generateResumeVectors(
  rawText: string,
  parsed: ParsedResumeData
): {
  fullTextVector: number[];
  skillsVector: number[];
  experienceVector: number[];
} {
  const skillsText = `Technical Skills: ${parsed.skills.join(', ')}`;
  const experienceText = parsed.experience
    .map((experience) => `${experience.role} at ${experience.company}: ${experience.highlights.join(' ')}`)
    .join('\n');

  return {
    fullTextVector: generateDeterministicEmbedding(rawText),
    skillsVector: generateDeterministicEmbedding(skillsText),
    experienceVector: generateDeterministicEmbedding(experienceText.length > 0 ? experienceText : rawText),
  };
}