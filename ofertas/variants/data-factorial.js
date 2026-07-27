// Variante tailored: Factorial HR — Staff AI Engineer, API & Integrations (ofertas/2026-07-14-factorial-staff-ai-engineer.md)
// Certificaciones LinkedIn (linkedin.com/in/victortrisac) — todas Anthropic, expedidas may. 2026
const certList = (date) => [
  "Model Context Protocol: Advanced Topics",
  "Introduction to Model Context Protocol",
  "Introduction to Agent Skills",
  "Introduction to Subagents",
  "Claude Code in Action",
  "Introduction to Claude Cowork",
  "Claude with Google Cloud's Vertex AI",
  "Claude in Amazon Bedrock",
  "Teaching the AI Fluency Framework",
  "Claude Code 101"
].map(name => ({ name, issuer: "Anthropic", date }));

export const dataES = {
  name: "VÍCTOR TRISAC",
  title: "Senior AI Engineer | Full Stack Developer",
  profile: "Senior AI Engineer construyendo producto con la IA en el centro: agentes LLM, workflows agénticos y RAG en producción para grandes clientes. Diseño capacidades de IA reutilizables con tool use, orquestación multi-agente y pipelines de evaluación automática (evals), expuestas vía APIs con FastAPI. Mentalidad product-first: del problema al despliegue, monitorización e iteración. Certificado por Anthropic en MCP, subagentes y agent skills.",
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
      description: "Diseño y despliegue de producto de IA generativa y agéntica con Claude (Anthropic) para grandes clientes (BBVA, Iberia, Telefónica, Decathlon, KFC) dentro de la unidad Tech & Data.",
      achievements: [
        "Liderazgo técnico construyendo agentes y copilotos LLM en producción sobre Claude, integrando RAG, tool use y orquestación multi-agente.",
        "Arquitectura de plataformas de IA en Azure y GCP con FastAPI, vector stores y pipelines de evaluación automática (evals).",
        "Mentoring del equipo de ingeniería y definición de buenas prácticas de MLOps, observabilidad y seguridad de modelos."
      ],
      tech: ["Python", "Claude (Anthropic)", "RAG", "LangChain", "FastAPI", "OpenAI", "Azure AI", "GCP Vertex", "Docker"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Automatización de flujos de trabajo empresariales integrando microservicios y LLMs.",
      achievements: [
        "Diseño de flujos e integraciones inteligentes en n8n reduciendo tiempos de procesamiento manual significativamente.",
        "Implementación de pipelines CI/CD con GitHub Actions y Docker en Azure/GCP.",
        "Orquestación de servicios mediante contenedores para asegurar escalabilidad y alta disponibilidad."
      ],
      tech: ["Python", "n8n", "OpenAI", "FastAPI", "Docker", "GCP", "Azure"]
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
      tech: ["Python", "FastAPI", "PostgreSQL", "Vue.js", "Docker"]
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
      tech: ["Django", "REST API", "PostgreSQL", "JWT", "Vue.js"]
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
        "Desarrollo de herramientas de gestión interna para la eficiencia operativa del grupo.",
        "Optimización de rendimiento web, mantenimiento proactivo y mejora de la experiencia de usuario (UX)."
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
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["OpenAI API", "n8n (Automatización)", "GCP/Azure", "Docker", "CI/CD"],
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
  title: "Senior AI Engineer | Full Stack Developer",
  profile: "Senior AI Engineer building product with AI at the core: production LLM agents, agentic workflows, and RAG for large enterprise clients. I design reusable AI capabilities with tool use, multi-agent orchestration, and automated evaluation pipelines (evals), exposed through FastAPI-based APIs. Product-first mindset: from problem definition to shipping, monitoring, and iteration. Anthropic-certified in MCP, subagents, and agent skills.",
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
      description: "Design and shipping of generative and agentic AI product powered by Claude (Anthropic) for enterprise clients (BBVA, Iberia, Telefónica, Decathlon, KFC) within the Tech & Data unit.",
      achievements: [
        "Technical leadership building production LLM agents and copilots on Claude — RAG, tool use, and multi-agent orchestration.",
        "AI platform architecture on Azure and GCP using FastAPI, vector stores, and automated evaluation pipelines (evals).",
        "Engineering mentoring and definition of MLOps, observability, and model security best practices."
      ],
      tech: ["Python", "Claude (Anthropic)", "RAG", "LangChain", "FastAPI", "OpenAI", "Azure AI", "GCP Vertex", "Docker"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Enterprise workflow automation integrating microservices and LLMs.",
      achievements: [
        "Design of intelligent workflows and integrations in n8n significantly reducing manual processing times.",
        "Implementation of CI/CD pipelines with GitHub Actions and Docker on Azure/GCP.",
        "Service orchestration through containers ensuring scalability and high availability."
      ],
      tech: ["Python", "n8n", "OpenAI", "FastAPI", "Docker", "GCP", "Azure"]
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
      tech: ["Python", "FastAPI", "PostgreSQL", "Vue.js", "Docker"]
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
      tech: ["Django", "REST API", "PostgreSQL", "JWT", "Vue.js"]
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
        "Development of internal management tools for group operational efficiency.",
        "Web performance optimization, proactive maintenance, and UX improvement."
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
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["OpenAI API", "n8n (Automation)", "GCP/Azure", "Docker", "CI/CD"],
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
