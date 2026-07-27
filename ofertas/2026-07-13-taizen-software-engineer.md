# Software Engineer — Taizen

- URL: https://www.linkedin.com/jobs/view/4439310062/
- Ubicación: Barcelona, presencial mínimo 4 días/semana (junto a los founders)
- **Banda salarial publicada: 40.000–55.000 € + equity**
- Enviada por Easy Apply el 13 jul. 2026. El formulario NO preguntó salario; solo: autorizado a trabajar en España (Sí), en Barcelona (Sí), años de experiencia (4)
- **Entrevista: 14 jul. 2026**

## La empresa

Startup pre-seed fundada por **dos ex-ingenieros de Spotify** ("shipped and scaled software used by millions"), con funding y clientes reales cada semana. Infraestructura SOC2 e ISO 27001 pese a ser pre-seed. Construyen **agentes de IA para equipos de go-to-market** (Product Marketing, Sales Enablement, Revenue): "the AI execution layer where agents do the work, not just answer questions". Los agentes se conectan a Gong, Salesforce, HubSpot y Slack y ejecutan workflows recurrentes de forma proactiva, sin esperar prompt.

## Producto (4 líneas de agentes)

- **Competitive intelligence:** monitorizan actividad de competidores y llamadas → informes, battlecards actualizadas y talk tracks automáticos
- **Deal & account intelligence:** muestran a sales leaders qué deals avanzan o se estancan; ayudan a BDRs a investigar territorios y cuentas
- **AI roleplay:** los reps practican contra compradores de IA por voz, basados en deals y objeciones reales
- **AI win/loss interviews:** entrevistan a compradores tras el deal y estructuran los insights

## Stack

- Frontend: React
- Backend: 2 servicios — core en Node/TypeScript + **servicio de agentes en Python**
- Retrieval: **vector store propio escrito en Rust**, late-interaction SOTA (la evolución del retrieval layer es una cuestión abierta en la que participarías)
- Datos: Postgres + MongoDB
- Agentes: **harness propio, model-agnostic** (no framework off-the-shelf)
- ML: modelos propios y open-source; **Modal** para GPU
- Infra: AWS (RDS, EC2, CloudFront, S3, ECR, ECS, ElastiCache, Lambda), MongoDB Atlas, Grafana + Prometheus, GitHub Actions

## Qué harás

- Features end-to-end: de problema de cliente a diseño, deploy e iteración (decisiones de arquitectura incluidas)
- Servicios backend y workflows detrás de los agentes
- Superficies de producto en la web app y en Slack
- Modelos de datos e infra para tipos de datos muy distintos, optimizados para lecturas/escrituras rápidas
- Ownership de calidad: testing, monitoring, observabilidad, incident response
- Pipeline de delivery: CI/CD, deployments, higiene de infra

## Qué buscan

- CS degree (Bachelor/Master) **o equivalente**
- 4+ años shipping producción con ownership (side projects compensan)
- Problem-solving y fundamentos de CS > lista de frameworks
- Cómodo con TypeScript/React y Python/Node, o rápido aprendiéndolos
- CI/CD, deployments y observabilidad, con ganas de más ownership
- High agency, equipo pequeño cross-funcional
- Nice-to-haves: features con LLM/IA ✓✓, retrieval/sistemas distribuidos, integraciones con APIs de terceros ✓, aprender rápido

## Filosofía que repiten (útil para la entrevista)

"Agents can write boilerplate faster than any human. What they can't do is untangle a vague problem, design a data model that holds up, or debug the unexpected. That's what we're hiring for — **judgment**." Además: "almost unlimited token budget", producto AI-native (no chatbot wrapper), ownership de arquitectura real.

## Notas de encaje

- Fuerte: agentes LLM en producción en WeAi (RAG, tool use, orquestación multi-agente ≈ su harness propio), Python, React, CI/CD, observabilidad, integraciones
- Formulario: se respondió "4 años" de experiencia
- Salario: nuestro estándar del lote era 55.000 € → es el TOPE de su banda publicada (40-55k). El equity compensa; son pre-seed
- ⚠️ Presencial 4 días/semana en Barcelona
