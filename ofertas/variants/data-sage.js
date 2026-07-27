// Variante tailored: Sage — Software Engineering Graduate (ofertas/2026-07-14-sage-graduate-swe.md)
// Certificaciones LinkedIn (linkedin.com/in/victortrisac) — todas Anthropic, expedidas may. 2026
const certList = (date) => [
  "Claude Code 101",
  "Claude Code in Action",
  "Introduction to Model Context Protocol",
  "Introduction to Agent Skills",
  "Introduction to Subagents",
  "Introduction to Claude Cowork",
  "Teaching the AI Fluency Framework",
  "Model Context Protocol: Advanced Topics",
  "Claude with Google Cloud's Vertex AI",
  "Claude in Amazon Bedrock"
].map(name => ({ name, issuer: "Anthropic", date }));

export const dataES = {
  name: "VÍCTOR TRISAC",
  title: "Software Engineer | Full Stack Developer",
  profile: "Ingeniero de software full-stack formado en desarrollo con Python (nota media 9,5/10), con experiencia en todo el ciclo de vida: del diseño al despliegue y mantenimiento, con control de versiones y CI/CD. Uso IA a diario y la integro en productos reales para mejorar calidad y productividad. Fundamentos sólidos, curiosidad y motivación por aprender nuevas tecnologías y lenguajes.",
  contact: {
    phone: "+34 663 769 539",
    email: "victorperez694@gmail.com",
    location: "Barcelona, España",
    linkedin: "linkedin.com/in/victortrisac",
    portfolio: "vtrisac-dev.netlify.app"
  },
  experience: [
    {
      project: "WeAi",
      role: "Senior AI Engineer",
      dates: "Feb. 2026 - Actualidad",
      description: "Diseño y despliegue de soluciones de IA generativa y agéntica con Claude (Anthropic) para grandes clientes (BBVA, Iberia, Telefónica, Decathlon, KFC) dentro de la unidad Tech & Data.",
      achievements: [
        "Construcción de agentes y copilotos LLM en producción sobre Claude, integrando RAG, tool use y orquestación multi-agente.",
        "Arquitectura de plataformas de IA en Azure y GCP con FastAPI, vector stores y pipelines de evaluación automática.",
        "Mentoring del equipo de ingeniería y definición de buenas prácticas de MLOps, observabilidad y seguridad de modelos."
      ],
      tech: ["Python", "Claude (Anthropic)", "FastAPI", "LangChain", "OpenAI", "Azure AI", "GCP Vertex", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Automatización de flujos de trabajo empresariales mediante microservicios y LLMs.",
      achievements: [
        "Implementación de pipelines CI/CD con GitHub Actions y Docker en Azure/GCP.",
        "Diseño de flujos inteligentes en n8n reduciendo tiempos de procesamiento manual significativamente.",
        "Orquestación de servicios mediante contenedores para asegurar escalabilidad y alta disponibilidad."
      ],
      tech: ["Python", "FastAPI", "Docker", "GCP", "Azure", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Desarrollo de ecosistema digital basado en IA y APIs de alta disponibilidad.",
      achievements: [
        "Creación de APIs REST con FastAPI para el procesamiento de datos en tiempo real.",
        "Desarrollo de SPAs con Vue.js optimizadas para una experiencia de usuario fluida.",
        "Integración de modelos de IA para la automatización de tareas críticas internas."
      ],
      tech: ["Python", "FastAPI", "Vue.js", "PostgreSQL", "Docker"]
    },
    {
      project: "Proaltus Capital Partners",
      role: "Full Stack Developer",
      dates: "Jul. 2024 - Nov. 2024",
      description: "Desarrollo de una Wallet Financiera a medida para la gestión de activos y carteras de inversión.",
      achievements: [
        "Arquitectura del backend con Django REST Framework y seguridad avanzada JWT.",
        "Integración de pasarelas de datos y servicios externos financieros altamente seguros.",
        "Gestión de bases de datos PostgreSQL con enfoque en integridad y rendimiento masivo."
      ],
      tech: ["Django", "Vue.js", "PostgreSQL", "JWT", "REST API"]
    },
    {
      project: "Solé Diesel",
      role: "Software Engineer (Backend)",
      dates: "May 2023 - Sept. 2023",
      description: "Diseño y construcción integral de un ERP industrial propio, desarrollado sin frameworks para control total.",
      achievements: [
        "Desarrollo de lógica de negocio compleja para trazabilidad total de producción industrial.",
        "Automatización de reportes mediante scripts avanzados de Python, eliminando errores manuales.",
        "Optimización de la cadena de suministro mediante módulos de gestión de inventario personalizados."
      ],
      tech: ["Python Nativo", "SQL", "Data Architecture", "Industrial Automation"]
    },
    {
      project: "Majestic Hotel Group",
      role: "Web Developer",
      dates: "Jun. 2022 - May 2023",
      description: "Desarrollo de webs corporativas y herramientas internas de gestión hotelera.",
      achievements: [
        "Implementación de paneles administrativos avanzados utilizando React y JavaScript.",
        "Optimización de rendimiento web, mantenimiento proactivo y mejora de la experiencia de usuario (UX).",
        "Desarrollo de herramientas de gestión interna para la eficiencia operativa del grupo."
      ],
      tech: ["React", "JavaScript", "HTML5", "CSS3"]
    }
  ],
  education: [
    {
      degree: "Master Full-Stack Developer",
      center: "ConquerX - Conquer Blocks",
      dates: "Abr. 2024 - Sept. 2024",
      note: "Nota Media: 8.5/10",
      details: "Especialización en React, Node.js y arquitecturas escalables."
    },
    {
      degree: "Grado Superior en Aplicaciones con Python",
      center: "CEPI-BASE, S.L.",
      dates: "Oct. 2020 - Mar. 2023",
      note: "Nota Media: 9.5/10",
      details: "Enfoque profundo en estructuras de datos y optimización de algoritmos."
    }
  ],
  skills: {
    backend: ["Python (Experto)", "Django", "FastAPI", "Node.js", "Java/SpringBoot"],
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["CI/CD", "Docker", "OpenAI API", "GCP/Azure", "n8n (Automatización)"],
    databases: ["PostgreSQL", "SQL Server", "MySQL", "MariaDB", "MongoDB"]
  },
  languages: ["Castellano (Nativo)", "Catalán (Nativo)", "Inglés (Técnico)"],
  certifications: certList("may. 2026"),
  labels: {
    technologies: "Tecnologías",
    backend: "Backend",
    frontend: "Frontend",
    aiDevops: "AI & DevOps",
    databases: "Bases de Datos",
    education: "Educación",
    experience: "Experiencia Profesional",
    languages: "Idiomas",
    certifications: "Certificaciones"
  }
};

export const dataEN = {
  name: "VÍCTOR TRISAC",
  title: "Software Engineer | Full Stack Developer",
  profile: "Full-stack software engineer trained in Python development (GPA 9.5/10), with experience across the full development lifecycle: from design to delivery and maintenance, with version control and CI/CD. I use AI daily and integrate it into real products to improve quality and productivity. Solid fundamentals, curiosity, and motivation to learn new technologies and languages.",
  contact: {
    phone: "+34 663 769 539",
    email: "victorperez694@gmail.com",
    location: "Barcelona, Spain",
    linkedin: "linkedin.com/in/victortrisac",
    portfolio: "vtrisac-dev.netlify.app"
  },
  experience: [
    {
      project: "WeAi",
      role: "Senior AI Engineer",
      dates: "Feb. 2026 - Present",
      description: "Design and deployment of generative and agentic AI solutions powered by Claude (Anthropic) for enterprise clients (BBVA, Iberia, Telefónica, Decathlon, KFC) within the Tech & Data unit.",
      achievements: [
        "Built production LLM agents and copilots on Claude — RAG, tool use, and multi-agent orchestration.",
        "AI platform architecture on Azure and GCP using FastAPI, vector stores, and automated evaluation pipelines.",
        "Engineering mentoring and definition of MLOps, observability, and model security best practices."
      ],
      tech: ["Python", "Claude (Anthropic)", "FastAPI", "LangChain", "OpenAI", "Azure AI", "GCP Vertex", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Enterprise workflow automation through microservices and LLMs.",
      achievements: [
        "Implementation of CI/CD pipelines with GitHub Actions and Docker on Azure/GCP.",
        "Design of intelligent workflows in n8n significantly reducing manual processing times.",
        "Service orchestration through containers ensuring scalability and high availability."
      ],
      tech: ["Python", "FastAPI", "Docker", "GCP", "Azure", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Development of AI-based digital ecosystem and high-availability APIs.",
      achievements: [
        "Creation of REST APIs with FastAPI for real-time data processing.",
        "Development of SPAs with Vue.js optimized for smooth user experience.",
        "Integration of AI models for automation of critical internal tasks."
      ],
      tech: ["Python", "FastAPI", "Vue.js", "PostgreSQL", "Docker"]
    },
    {
      project: "Proaltus Capital Partners",
      role: "Full Stack Developer",
      dates: "Jul. 2024 - Nov. 2024",
      description: "Development of a custom Financial Wallet for asset and investment portfolio management.",
      achievements: [
        "Backend architecture with Django REST Framework and advanced JWT security.",
        "Integration of highly secure financial data gateways and external services.",
        "PostgreSQL database management focused on integrity and massive performance."
      ],
      tech: ["Django", "Vue.js", "PostgreSQL", "JWT", "REST API"]
    },
    {
      project: "Solé Diesel",
      role: "Software Engineer (Backend)",
      dates: "May 2023 - Sept. 2023",
      description: "Full design and construction of a proprietary industrial ERP, developed without frameworks for total control.",
      achievements: [
        "Development of complex business logic for complete industrial production traceability.",
        "Report automation through advanced Python scripts, eliminating manual errors.",
        "Supply chain optimization through custom inventory management modules."
      ],
      tech: ["Native Python", "SQL", "Data Architecture", "Industrial Automation"]
    },
    {
      project: "Majestic Hotel Group",
      role: "Web Developer",
      dates: "Jun. 2022 - May 2023",
      description: "Development of corporate websites and internal hotel management tools.",
      achievements: [
        "Implementation of advanced admin panels using React and JavaScript.",
        "Web performance optimization, proactive maintenance, and UX improvement.",
        "Development of internal management tools for group operational efficiency."
      ],
      tech: ["React", "JavaScript", "HTML5", "CSS3"]
    }
  ],
  education: [
    {
      degree: "Master Full-Stack Developer",
      center: "ConquerX - Conquer Blocks",
      dates: "Apr. 2024 - Sept. 2024",
      note: "GPA: 8.5/10",
      details: "Specialization in React, Node.js and scalable architectures."
    },
    {
      degree: "Higher Degree in Python Applications",
      center: "CEPI-BASE, S.L.",
      dates: "Oct. 2020 - Mar. 2023",
      note: "GPA: 9.5/10",
      details: "Deep focus on data structures and algorithm optimization."
    }
  ],
  skills: {
    backend: ["Python (Expert)", "Django", "FastAPI", "Node.js", "Java/SpringBoot"],
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["CI/CD", "Docker", "OpenAI API", "GCP/Azure", "n8n (Automation)"],
    databases: ["PostgreSQL", "SQL Server", "MySQL", "MariaDB", "MongoDB"]
  },
  languages: ["Spanish (Native)", "Catalan (Native)", "English (Technical)"],
  certifications: certList("May 2026"),
  labels: {
    technologies: "Technologies",
    backend: "Backend",
    frontend: "Frontend",
    aiDevops: "AI & DevOps",
    databases: "Databases",
    education: "Education",
    experience: "Professional Experience",
    languages: "Languages",
    certifications: "Certifications"
  }
};
