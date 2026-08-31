// Certificaciones LinkedIn (linkedin.com/in/victortrisac) — todas Anthropic, expedidas may. 2026
const certList = (date) => [
  "Model Context Protocol: Advanced Topics",
  "Introduction to Model Context Protocol",
  "Introduction to Subagents",
  "Claude Code in Action",
  "Claude with Google Cloud's Vertex AI",
  "Claude in Amazon Bedrock",
  "Introduction to Agent Skills",
  "Claude Code 101",
  "Introduction to Claude Cowork",
  "Teaching the AI Fluency Framework"
].map(name => ({ name, issuer: "Anthropic", date }));

export const dataES = {
  name: "VÍCTOR TRISAC",
  title: "Senior AI Engineer | AI Ops & Observabilidad",
  profile: "Senior AI Engineer de perfil híbrido IA + operación: IA generativa aplicada en producción (agentes, RAG, tool use, MCP) sobre una base sólida de Kubernetes, Docker y observabilidad con Dynatrace. Python como lenguaje principal, control de versiones con Git/GitHub y CI/CD con GitHub Actions sobre Azure y GCP. Entrega para grandes cuentas (BBVA, Iberia, Telefónica, Decathlon, KFC) con correlación de eventos, runbooks operativos y mentoring de equipos de ingeniería.",
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
        "Liderazgo técnico construyendo agentes y copilotos LLM en producción sobre Claude, integrando RAG, tool use, MCP y orquestación multi-agente.",
        "Observabilidad y correlación de eventos con Dynatrace sobre los servicios en producción, con alertado y buenas prácticas de MLOps y seguridad de modelos.",
        "Arquitectura de plataformas de IA en Azure y GCP sobre contenedores, con FastAPI, vector stores y pipelines de evaluación automática."
      ],
      tech: ["Python", "Dynatrace", "Kubernetes", "Claude (Anthropic)", "MCP", "LangChain", "Azure OpenAI", "GCP Vertex", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Liderazgo en la automatización de flujos de trabajo operativos mediante microservicios, Kubernetes y LLMs.",
      achievements: [
        "Orquestación de servicios en Kubernetes sobre Azure/GCP, asegurando escalabilidad y alta disponibilidad.",
        "Implementación de pipelines CI/CD con GitHub Actions y Docker, con control de versiones en GitHub.",
        "Elaboración de runbooks operativos y diseño de flujos inteligentes en n8n, reduciendo tiempos de procesamiento manual."
      ],
      tech: ["Kubernetes", "Docker", "GitHub Actions", "CI/CD", "Python", "FastAPI", "Azure", "GCP", "n8n", "OpenAI"]
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
    ai_devops: ["Kubernetes", "Dynatrace", "Docker", "Git / GitHub", "GitHub Copilot", "CI/CD (GitHub Actions)", "Azure OpenAI / GCP", "LangChain / MCP", "n8n"],
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
  title: "Senior AI Engineer | AI Ops & Observability",
  profile: "Senior AI Engineer with a hybrid AI + operations profile: applied generative AI in production (agents, RAG, tool use, MCP) on a solid foundation of Kubernetes, Docker, and observability with Dynatrace. Python as primary language, version control with Git/GitHub, and CI/CD with GitHub Actions on Azure and GCP. Delivery for enterprise accounts (BBVA, Iberia, Telefónica, Decathlon, KFC) with event correlation, operational runbooks, and engineering team mentoring.",
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
        "Technical leadership building production LLM agents and copilots on Claude — RAG, tool use, MCP, and multi-agent orchestration.",
        "Observability and event correlation with Dynatrace across production services, with alerting and MLOps (Machine Learning Ops) and model security best practices.",
        "AI platform architecture on Azure and GCP over containers, using FastAPI, vector stores, and automated evaluation pipelines."
      ],
      tech: ["Python", "Dynatrace", "Kubernetes", "Claude (Anthropic)", "MCP", "LangChain", "Azure OpenAI", "GCP Vertex", "Docker", "RAG"]
    },
    {
      project: "EASO MAGNO",
      role: "DevOps & AI Full Stack Developer",
      dates: "Jul. 2025 - Nov. 2025",
      description: "Leadership in operational workflow automation through microservices, Kubernetes, and LLMs.",
      achievements: [
        "Service orchestration on Kubernetes over Azure/GCP, ensuring scalability and high availability.",
        "Implementation of CI/CD pipelines with GitHub Actions and Docker, with version control on GitHub.",
        "Authoring of operational runbooks and design of intelligent workflows in n8n, reducing manual processing times."
      ],
      tech: ["Kubernetes", "Docker", "GitHub Actions", "CI/CD", "Python", "FastAPI", "Azure", "GCP", "n8n", "OpenAI"]
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
    ai_devops: ["Kubernetes", "Dynatrace", "Docker", "Git / GitHub", "GitHub Copilot", "CI/CD (GitHub Actions)", "Azure OpenAI / GCP", "LangChain / MCP", "n8n"],
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
