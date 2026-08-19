// Certificaciones LinkedIn (linkedin.com/in/victortrisac) — todas Anthropic, expedidas may. 2026
const certList = (date) => [
  "Claude with Google Cloud's Vertex AI",
  "Claude in Amazon Bedrock",
  "Model Context Protocol: Advanced Topics",
  "Introduction to Model Context Protocol",
  "Claude Code in Action",
  "Introduction to Subagents",
  "Introduction to Agent Skills",
  "Claude Code 101",
  "Introduction to Claude Cowork",
  "Teaching the AI Fluency Framework"
].map(name => ({ name, issuer: "Anthropic", date }));

export const dataES = {
  name: "VÍCTOR TRISAC",
  title: "Senior AI Engineer | Full Stack Developer",
  profile: "Senior AI Engineer y Full Stack Developer con experiencia entregando proyectos para grandes cuentas (BBVA, Iberia, Telefónica, Decathlon, KFC). Combino agentes y copilotos LLM en producción con Claude y OpenAI con una base full stack sólida: Python, FastAPI, Django, Node.js, React y Vue. Despliegue y delivery en Azure y GCP con Docker y CI/CD. Experiencia en sectores industrial, financiero y hotelero, y en mentoring de equipos de ingeniería.",
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
      description: "Diseño y despliegue de soluciones de IA generativa y agénticas con Claude (Anthropic) para grandes clientes (BBVA, Iberia, Telefónica, Decathlon, KFC) dentro de la unidad Tech & Data.",
      achievements: [
        "Liderazgo técnico construyendo agentes y copilotos LLM en producción sobre Claude, integrando RAG, tool use y orquestación multi-agente.",
        "Arquitectura de plataformas de IA en Azure y GCP con FastAPI, vector stores y pipelines de evaluación automática.",
        "Mentoring del equipo y buenas prácticas de MLOps (Machine Learning Ops), observabilidad y seguridad de modelos."
      ],
      tech: ["Python", "Claude (Anthropic)", "Azure AI", "GCP Vertex", "FastAPI", "LangChain", "OpenAI", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Liderazgo en la automatización de flujos de trabajo empresariales mediante microservicios y LLMs.",
      achievements: [
        "Implementación de pipelines CI/CD con GitHub Actions y Docker en Azure/GCP.",
        "Orquestación de servicios mediante contenedores para asegurar escalabilidad y alta disponibilidad.",
        "Diseño de flujos inteligentes en n8n reduciendo tiempos de procesamiento manual significativamente."
      ],
      tech: ["Python", "FastAPI", "Azure", "GCP", "Docker", "CI/CD", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Desarrollo de ecosistema digital basado en IA y APIs de alta disponibilidad.",
      achievements: [
        "Desarrollo de SPAs con Vue.js optimizadas para una experiencia de usuario fluida.",
        "Creación de APIs REST con FastAPI para el procesamiento de datos en tiempo real.",
        "Integración de modelos de IA para la automatización de tareas críticas internas."
      ],
      tech: ["Python", "Vue.js", "FastAPI", "PostgreSQL", "Docker"]
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
      description: "Diseño y construcción integral de un ERP a medida para entorno de fabricación industrial, desarrollado sin frameworks para control total.",
      achievements: [
        "Trazabilidad total de producción industrial mediante lógica de negocio compleja a medida.",
        "Optimización de la cadena de suministro con módulos de gestión de inventario personalizados.",
        "Automatización de reportes mediante scripts avanzados de Python, eliminando errores manuales."
      ],
      tech: ["Python Nativo", "Industrial Automation", "Data Architecture", "SQL"]
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
      dates: "Abr. 2024 - Sept. 2025",
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
    backend: ["Python (Experto)", "FastAPI", "Django", "Java/SpringBoot", "Node.js"],
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["OpenAI API", "Azure (Microsoft)/GCP", "Docker", "CI/CD", "n8n (Automatización)"],
    databases: ["PostgreSQL", "SQL Server", "MongoDB", "MySQL", "MariaDB"]
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
  profile: "Senior AI Engineer and Full Stack Developer with a track record delivering projects for enterprise accounts (BBVA, Iberia, Telefónica, Decathlon, KFC). I combine production LLM agents and copilots on Claude and OpenAI with a solid full stack foundation: Python, FastAPI, Django, Node.js, React, and Vue. Deployment and delivery on Azure and GCP with Docker and CI/CD. Experience across industrial, financial, and hospitality sectors, plus engineering team mentoring.",
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
        "Technical leadership building production LLM agents and copilots on Claude — RAG, tool use, and multi-agent orchestration.",
        "AI platform architecture on Azure and GCP using FastAPI, vector stores, and automated evaluation pipelines.",
        "Team mentoring and MLOps (Machine Learning Ops), observability, and model security best practices."
      ],
      tech: ["Python", "Claude (Anthropic)", "Azure AI", "GCP Vertex", "FastAPI", "LangChain", "OpenAI", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Leadership in enterprise workflow automation through microservices and LLMs.",
      achievements: [
        "Implementation of CI/CD pipelines with GitHub Actions and Docker on Azure/GCP.",
        "Service orchestration through containers ensuring scalability and high availability.",
        "Design of intelligent workflows in n8n significantly reducing manual processing times."
      ],
      tech: ["Python", "FastAPI", "Azure", "GCP", "Docker", "CI/CD", "n8n", "OpenAI"]
    },
    {
      project: "Kauai",
      role: "AI Developer & Full Stack Engineer",
      dates: "Feb. 2025 - May 2025",
      description: "Development of AI-based digital ecosystem and high-availability APIs.",
      achievements: [
        "Development of SPAs with Vue.js optimized for smooth user experience.",
        "Creation of REST APIs with FastAPI for real-time data processing.",
        "Integration of AI models for automation of critical internal tasks."
      ],
      tech: ["Python", "Vue.js", "FastAPI", "PostgreSQL", "Docker"]
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
      description: "Full design and construction of a custom ERP for an industrial manufacturing environment, developed without frameworks for total control.",
      achievements: [
        "Complete industrial production traceability through custom complex business logic.",
        "Supply chain optimization through custom inventory management modules.",
        "Report automation through advanced Python scripts, eliminating manual errors."
      ],
      tech: ["Native Python", "Industrial Automation", "Data Architecture", "SQL"]
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
      dates: "Apr. 2024 - Sept. 2025",
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
    backend: ["Python (Expert)", "FastAPI", "Django", "Java/SpringBoot", "Node.js"],
    frontend: ["React.js", "Vue.js", "TypeScript", "Tailwind CSS"],
    ai_devops: ["OpenAI API", "Azure (Microsoft)/GCP", "Docker", "CI/CD", "n8n (Automation)"],
    databases: ["PostgreSQL", "SQL Server", "MongoDB", "MySQL", "MariaDB"]
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
