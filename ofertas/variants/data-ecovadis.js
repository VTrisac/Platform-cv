// Variante tailored: EcoVadis — Senior AI/ML Engineer (ofertas/2026-07-14-ecovadis-senior-ai-ml-engineer.md)
// Certificaciones LinkedIn (linkedin.com/in/victortrisac) — todas Anthropic, expedidas may. 2026
const certList = (date) => [
  "Claude with Google Cloud's Vertex AI",
  "Claude in Amazon Bedrock",
  "Model Context Protocol: Advanced Topics",
  "Introduction to Model Context Protocol",
  "Introduction to Subagents",
  "Introduction to Agent Skills",
  "Claude Code in Action",
  "Introduction to Claude Cowork",
  "Teaching the AI Fluency Framework",
  "Claude Code 101"
].map(name => ({ name, issuer: "Anthropic", date }));

export const dataES = {
  name: "VÍCTOR TRISAC",
  title: "Senior AI/ML Engineer | Full Stack Developer",
  profile: "Senior AI/ML Engineer especializado en diseñar, desplegar y mantener sistemas de IA/ML escalables en producción con Python, Azure y GCP. Construyo pipelines de IA end-to-end con buenas prácticas de MLOps y LLMOps: orquestación, vector stores y evaluación automática. Experiencia llevando agentes y copilotos LLM a producción para grandes clientes. Tecnología que convierte datos en decisiones de negocio.",
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
      description: "Diseño y despliegue de sistemas de IA generativa y agéntica con Claude (Anthropic) para grandes clientes (BBVA, Iberia, Telefónica, Decathlon, KFC) dentro de la unidad Tech & Data.",
      achievements: [
        "Arquitectura de plataformas de IA en Azure y GCP con FastAPI, vector stores y pipelines de evaluación automática.",
        "Liderazgo técnico construyendo agentes y copilotos LLM en producción sobre Claude, integrando RAG, tool use y orquestación multi-agente.",
        "Mentoring del equipo de ingeniería y definición de buenas prácticas de MLOps, observabilidad y seguridad de modelos."
      ],
      tech: ["Python", "Azure AI", "GCP Vertex", "FastAPI", "RAG", "Claude (Anthropic)", "LangChain", "OpenAI", "Docker"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Automatización de flujos de trabajo empresariales mediante microservicios y LLMs.",
      achievements: [
        "Orquestación de servicios mediante contenedores para asegurar escalabilidad y alta disponibilidad.",
        "Implementación de pipelines CI/CD con GitHub Actions y Docker en Azure/GCP.",
        "Diseño de flujos inteligentes en n8n reduciendo tiempos de procesamiento manual significativamente."
      ],
      tech: ["Python", "Docker", "Azure", "GCP", "FastAPI", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Desarrollo de ecosistema digital basado en IA y APIs de alta disponibilidad.",
      achievements: [
        "Creación de APIs REST con FastAPI para el procesamiento de datos en tiempo real.",
        "Integración de modelos de IA para la automatización de tareas críticas internas.",
        "Desarrollo de SPAs con Vue.js optimizadas para una experiencia de usuario fluida."
      ],
      tech: ["Python", "FastAPI", "PostgreSQL", "Docker", "Vue.js"]
    },
    {
      project: "Proaltus Capital Partners",
      role: "Full Stack Developer",
      dates: "Jul. 2024 - Nov. 2024",
      description: "Desarrollo de una Wallet Financiera a medida para la gestión de activos y carteras de inversión.",
      achievements: [
        "Arquitectura del backend con Django REST Framework y seguridad avanzada JWT.",
        "Gestión de bases de datos PostgreSQL con enfoque en integridad y rendimiento masivo.",
        "Integración de pasarelas de datos y servicios externos financieros altamente seguros."
      ],
      tech: ["Django", "PostgreSQL", "REST API", "JWT", "Vue.js"]
    },
    {
      project: "Solé Diesel",
      role: "Software Engineer (Backend)",
      dates: "May 2023 - Sept. 2023",
      description: "Diseño y construcción integral de un ERP industrial propio, desarrollado sin frameworks para control total.",
      achievements: [
        "Automatización de reportes mediante scripts avanzados de Python, eliminando errores manuales.",
        "Desarrollo de lógica de negocio compleja para trazabilidad total de producción industrial.",
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
    backend: ["Python (Experto)", "FastAPI", "Django", "Node.js", "Java/SpringBoot"],
    frontend: ["Vue.js", "React.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["GCP/Azure", "OpenAI API", "Docker", "CI/CD", "n8n (Automatización)"],
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
  title: "Senior AI/ML Engineer | Full Stack Developer",
  profile: "Senior AI/ML Engineer specialized in designing, deploying, and maintaining scalable AI/ML systems in production with Python, Azure, and GCP. I build end-to-end AI pipelines applying MLOps and LLMOps best practices: orchestration, vector stores, and automated evaluation. Experience shipping LLM agents and copilots to production for large enterprise clients. Technology that turns data into business decisions.",
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
      description: "Design and deployment of generative and agentic AI systems powered by Claude (Anthropic) for enterprise clients (BBVA, Iberia, Telefónica, Decathlon, KFC) within the Tech & Data unit.",
      achievements: [
        "AI platform architecture on Azure and GCP using FastAPI, vector stores, and automated evaluation pipelines.",
        "Technical leadership building production LLM agents and copilots on Claude — RAG, tool use, and multi-agent orchestration.",
        "Engineering mentoring and definition of MLOps, observability, and model security best practices."
      ],
      tech: ["Python", "Azure AI", "GCP Vertex", "FastAPI", "RAG", "Claude (Anthropic)", "LangChain", "OpenAI", "Docker"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Enterprise workflow automation through microservices and LLMs.",
      achievements: [
        "Service orchestration through containers ensuring scalability and high availability.",
        "Implementation of CI/CD pipelines with GitHub Actions and Docker on Azure/GCP.",
        "Design of intelligent workflows in n8n significantly reducing manual processing times."
      ],
      tech: ["Python", "Docker", "Azure", "GCP", "FastAPI", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Development of AI-based digital ecosystem and high-availability APIs.",
      achievements: [
        "Creation of REST APIs with FastAPI for real-time data processing.",
        "Integration of AI models for automation of critical internal tasks.",
        "Development of SPAs with Vue.js optimized for smooth user experience."
      ],
      tech: ["Python", "FastAPI", "PostgreSQL", "Docker", "Vue.js"]
    },
    {
      project: "Proaltus Capital Partners",
      role: "Full Stack Developer",
      dates: "Jul. 2024 - Nov. 2024",
      description: "Development of a custom Financial Wallet for asset and investment portfolio management.",
      achievements: [
        "Backend architecture with Django REST Framework and advanced JWT security.",
        "PostgreSQL database management focused on integrity and massive performance.",
        "Integration of highly secure financial data gateways and external services."
      ],
      tech: ["Django", "PostgreSQL", "REST API", "JWT", "Vue.js"]
    },
    {
      project: "Solé Diesel",
      role: "Software Engineer (Backend)",
      dates: "May 2023 - Sept. 2023",
      description: "Full design and construction of a proprietary industrial ERP, developed without frameworks for total control.",
      achievements: [
        "Report automation through advanced Python scripts, eliminating manual errors.",
        "Development of complex business logic for complete industrial production traceability.",
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
    backend: ["Python (Expert)", "FastAPI", "Django", "Node.js", "Java/SpringBoot"],
    frontend: ["Vue.js", "React.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["GCP/Azure", "OpenAI API", "Docker", "CI/CD", "n8n (Automation)"],
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
