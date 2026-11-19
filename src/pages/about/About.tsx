import { BsYinYang } from "react-icons/bs";
import {
    FaBroadcastTower,
    FaClock,
    FaCloud,
    FaCoins,
    FaGamepad,
    FaImages,
    FaTruck,
} from "react-icons/fa";
import PageLayout from "@/layouts/PageLayout";
import styles from "./About.module.css";
// The whereq.ca favicon — used as the logo for the WhereQ Lab and
// WhereQ LLM cards. Imported through the bundler so it is served from
// this origin (the previous remote logos were blocked by COEP).
import favicon from "@/assets/favicon.ico";

type Project = {
  name: string;
  description: string;
  url: string;
  /** Inline React node — used for icon-based logos (react-icons / SVG) */
  icon?: React.ReactNode;
  /** Image src — used for raster logo files (PNG / SVG via <img>) */
  logo?: string;
  disabled?: boolean;
  comingSoon?: boolean;
};

const projects: Project[] = [
  {
    name: "WhereQ Lab",
    description:
      "The research station of the WhereQ Universe — an all-in-one decentralized app hub for productivity, education & personal management where every idea is tested first. No cloud storage, no tracking.",
    url: "https://www.whereq.ca",
    logo: favicon,
  },
  {
    name: "WhereQ — LLM",
    description:
      "A common interface for large language models — one API for OpenAI, Gemini and friends, with SSE streaming, Swagger docs and a mock service for testing without a real backend.",
    url: "https://github.com/whereq/whereq-llm-api",
    logo: favicon,
  },
  {
    name: "Key To Marvel",
    description: "Unified identity & access management platform",
    url: "https://www.keytomarvel.com",
    icon: <BsYinYang className="metro-icon" />,
  },
  {
    name: "whereq",
    description:
      "Discover the world beyond the map — location-based guides, neighbourhood stories, hidden histories, and social connections for any place you drop a pin.",
    url: "https://www.whereq.com",
    logo: "/logos/whereq-com.svg",
  },
  {
    name: "Chroniq",
    description:
      "The temporal engine — events, scheduling, booking and calendar intelligence. The clock the rest of the universe sets its time by.",
    url: "https://www.chroniq.cc",
    icon: <FaClock className="metro-icon" />,
  },
  {
    name: "whereq.github.io",
    description:
      "Mission control — the public voice of the universe. News, announcements, releases and changelogs broadcast from here.",
    url: "https://whereq.github.io",
    icon: <FaBroadcastTower className="metro-icon" />,
  },
  {
    name: "WhereQ Cloud",
    description:
      "The data platform beneath the products — one shared schema and one source of truth for every market feed, metric and collection job.",
    url: "https://whereq.cloud",
    icon: <FaCloud className="metro-icon" />,
  },
  {
    name: "FlowDesk",
    description:
      "Deep, structured & intelligent stock analysis powered by AI. Explore companies, investigate investment ideas, and have professional-grade conversations about stocks.",
    url: "https://www.flowdesk.top",
    logo: "/logos/flowdesk.svg",
  },
  {
    name: "CCBus",
    description:
      "An all-in-one Web3 toolkit — custom token creation with 11+ tokenomics models, presale launches, liquidity management and wallet tools across BSC, Ethereum and Polygon.",
    url: "https://www.ccbus.cc",
    icon: <FaCoins className="metro-icon" />,
  },
  {
    name: "CatoBigato",
    description:
      "Your chubby cat tutor for K-12 to college. Catobi listens, thinks, and shows the work — explanations, quizzes, and graphs across math, science, and the humanities.",
    url: "https://www.catobigato.com",
    logo: "/logos/catobigato.png",
  },
  {
    name: "WhereQ.cc",
    description:
      "The private gallery — a strictly-local photo vault that encrypts your originals in your own browser, with on-demand AI to enhance, describe and animate a single image.",
    url: "https://www.whereq.cc",
    icon: <FaImages className="metro-icon" />,
  },
  {
    name: "QHaul",
    description:
      "The freight engine — a B2B marketplace connecting Canadian businesses with local driver supply. Freight, courier and small moves across the GTA and beyond.",
    url: "https://qhaul.ca",
    icon: <FaTruck className="metro-icon" />,
  },
  {
    name: "WhereQ-DOSBox",
    description:
      "The time machine — a native Android port of DOSBox with an on-screen keyboard, a touch mouse and save states that restore the whole machine. Stands alone: it depends on no other planet.",
    url: "https://github.com/whereq/whereq-dosbox",
    icon: <FaGamepad className="metro-icon" />,
  },
];

const About = () => {
  return (
    <PageLayout>
      <div className={styles.page}>
        <h2 className={styles.title}>Time can fade everything</h2>
        <div className={styles.intro}>
          <table className={styles.profileTable}>
            <thead>
              <tr>
                <th className={styles.profileLeft}>
                  Dazhi Zhang (Tony) <br />
                  <strong>Phone:</strong> (416) 835-**** <br />
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:&#x67;&#x6f;&#x6f;&#x67;&#x6f;&#108;&#46;&#122;&#x68;&#97;&#x6e;&#x67;&#x40;&#103;&#109;&#x61;&#105;&#x6c;&#46;&#x63;&#x6f;&#x6d;"
                    className="text-blue-400 hover:underline"
                  >
                    &#x67;&#x6f;&#x6f;&#x67;&#x6f;&#108;&#46;&#122;&#x68;&#97;&#x6e;&#x67;&#x40;&#103;&#109;&#x61;&#105;&#x6c;&#46;&#x63;&#x6f;&#x6d;
                  </a>
                </th>
                <th className={styles.profileRight}>
                  {/* Served from this origin: the previous remote URL was
                      blocked by the COEP header in production. */}
                  <img
                    src="/images/profile/bacon-with-hat-transparent-bg.png"
                    alt="Profile"
                    width="49"
                  />
                </th>
              </tr>
            </thead>
          </table>

          <h2 className={styles.subtitle}>Senior Software Developer</h2>
          <p className={styles.lead}>
            A well-qualified software developer, a fast learner, a highly motivated
            self-starter, and a reliable person to work with.
          </p>

          <hr />

          <h2 className={styles.subtitle}>PROFESSIONAL EXPERIENCE</h2>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>
              <a href="https://www.whereq.com/" className="hover:underline">
                WhereQ Inc.
              </a>
            </h3>
            <p className={styles.lead}>
              <strong>Owner</strong> (2020 - Present)
              <br />
              Founded WhereQ Inc. — the company behind the{" "}
              <span className={styles.accent}>WhereQ Universe</span>: a family of
              independent products and platforms that share one identity, one map, one
              clock and one data backbone. Started with web 2.0 applications for the
              Real Estate Industry and OpenAI integration; today the portfolio spans
              geospatial, identity, scheduling, media tooling, DeFi, logistics,
              education, data and retro gaming.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>
                Implemented a <span className={styles.accent}>Java client</span> to
                interface with the Toronto Regional Real Estate Board (TREB) MLS for
                pulling selling data based on the IDX protocol.
              </li>
              <li>
                Constructed a scheduled batch service to retrieve selling data and
                display it on an integrated{" "}
                <span className={styles.accent}>Google Map</span> website.
              </li>
              <li>
                Designed and implemented a proprietary{" "}
                <span className={styles.accent}>image compression algorithm</span> to
                reduce Amazon S3 costs.
              </li>
              <li>
                Developed a <span className={styles.accent}>ChatGPT-like console</span>{" "}
                with categorized prompts and integrated Google Social Login.
              </li>
              <li>
                Built comprehensive API sets using{" "}
                <span className={styles.accent}>Spring WebFlux</span> for efficient
                communication with OpenAI endpoints.
              </li>
              <li>
                Established tech stack using{" "}
                <span className={styles.accent}>
                  jHipster, React, Spring WebFlux, PostgreSQL, and Keycloak
                </span>
                .
              </li>
              <li>
                Orchestrated infrastructure setup on{" "}
                <span className={styles.accent}>AWS EC2 and RDS</span> for production
                services.
              </li>
            </ul>
            <p className={styles.lead}>
              <strong>The WhereQ Universe portfolio:</strong>
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ</span> (whereq.com) — the
                geospatial engine: maps, routing, places and neighbourhood stories.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>KeyToMarvel</span> (keytomarvel.com) —
                the universal passport: SSO, MFA and identity for every product.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>Chroniq</span> (chroniq.cc) — the
                temporal engine: events, scheduling, booking and calendar intelligence.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ.ca Lab</span> (whereq.ca/lab) —
                the research station where every idea is built, tested and validated.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>whereq.github.io</span> — mission
                control: the public voice, releases and announcements.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ Cloud</span> (whereq.cloud) —
                the data platform: one schema and one source of truth for the family.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>FlowDesk</span> (flowdesk.top) — AI
                stock analysis, fronted by NOVA the trading guru.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>CCBus</span> (ccbus.cc) — the DeFi
                engine: token creation, presales and liquidity across three chains.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>CatoBigato</span> (catobigato.com) —
                the learning planet: vibe tutoring from K-12 to college.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ.cc</span> (whereq.cc) — the
                private gallery: a strictly-local, encrypted photo vault.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>QHaul</span> (qhaul.ca) — the freight
                engine: a B2B marketplace for Canadian shipping and local driver supply.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ-DOSBox</span> (whereq-dosbox) —
                the time machine: a native Android port of DOSBox with an on-screen
                keyboard and save states.
              </li>
              <li className={styles.listItem}>
                <span className={styles.accent}>WhereQ LLM API</span> (whereq-llm-api) —
                one interface for every large language model, with SSE streaming and a
                mock service for integration testing.
              </li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Amazon EC2, RDS, S3, Spring WebFlux, React, Keycloak, Angular, GIS,
              Google Map, MapStruct, Git, CI/CD, Social Login
              <br />
              <br />
              <strong>Product stack:</strong>
              <br />
              React 19, Vite, TypeScript, Tailwind CSS, Zustand, FFmpeg.wasm, ONNX
              Runtime Web, Pyodide, pdf-lib, Keycloak, PostgreSQL, Docker, Kubernetes,
              Git, Vercel
            </p>
          </div>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>Scotiabank</h3>
            <p className={styles.lead}>
              <strong>Lead Engineer</strong> (04/2019 – Present)
              <br />
              As a tech leader and solution architect, I design solutions for the BNS
              data platform, focusing on big data streaming, metric collection,
              performance tuning, and automation.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>
                Designed and implemented "{" "}
                <span className={styles.accent}>Spark as a Service</span>" and an
                Avro/JSON flattener service.
              </li>
              <li>
                Developed lightweight scaffolding using{" "}
                <span className={styles.accent}>Spring Boot, R2DBC, and MapStruct</span>{" "}
                to simplify API development.
              </li>
              <li>
                Led the end-to-end solution design for data consumption using{" "}
                <span className={styles.accent}>Presto</span>, connecting various data
                sources like HDFS, ElasticSearch, and PostgreSQL.
              </li>
              <li>
                Developed ElasticSearch metrics tools and centralized business calendar
                services using{" "}
                <span className={styles.accent}>Node.js and PostgreSQL</span>.
              </li>
              <li>
                Reengineered Credit 360 application, improving performance, codebase,
                and validation frameworks.
              </li>
              <li>
                Led architecture and delivery of enterprise AI initiatives including{" "}
                <span className={styles.accent}>Data GPT</span> and internal GenAI
                enablement platforms, achieving the{" "}
                <span className={styles.accent}>90-90 KPI</span>. Data GPT is an
                AI-powered query platform that uses OpenAI&apos;s GPT-3.5 Turbo model
                to deliver accurate and efficient data retrieval. The 90-90 KPI
                signifies that the platform attains a 90% query accuracy rate, with 90%
                of queries processed within 30 seconds, ensuring robust performance for
                enterprise-grade analytics.
              </li>
              <li>
                Evaluated and integrated emerging AI technologies, establishing reusable
                frameworks and best practices for enterprise adoption.
              </li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Kubernetes, Docker, Presto, Spark, Kafka, HDFS, ElasticSearch, Power BI,
              Java, Spring Boot, Angular, MongoDB, Jenkins, PostgreSQL, Git
            </p>
          </div>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>TD Bank</h3>
            <p className={styles.lead}>
              <strong>Senior Software Developer</strong> (11/2018 – 04/2019)
              <br />
              Developed new features and contributed to the EasyApply program, focusing
              on Java backend systems and automated testing frameworks.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>Introduced POJO generation from JSON schemas for validation purposes.</li>
              <li>
                Developed a retry module using Java 8's Functional Interfaces and
                template method design pattern.
              </li>
              <li>
                Built 10 new API endpoints within three months and refactored existing
                components.
              </li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Java, Spring, Oracle 12c, Jenkins, Postman, MQ, Git, Hibernate
            </p>
          </div>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>Rogers Communications Inc.</h3>
            <p className={styles.lead}>
              <strong>Senior Software Developer</strong> (08/2016 – 09/2018)
              <br />
              As a full-stack developer and architect, I led the evolution of the
              Enterprise Notification System (ENS), improving performance and
              introducing new features.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>
                Integrated an SMS Gateway using{" "}
                <span className={styles.accent}>SMPP protocol</span> to enhance SMS
                delivery performance.
              </li>
              <li>
                Re-architected the ENS for better scalability, handling over a million
                email notifications per hour.
              </li>
              <li>Introduced RESTful interfaces and optimized system performance.</li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              SMPP, Spring, Hibernate, WebLogic, Oracle, JUnit, Ant, Jenkins, SVN
            </p>
          </div>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>Citibank</h3>
            <p className={styles.lead}>
              <strong>Senior Consultant</strong> (09/2012 – 08/2016)
              <br />
              Collaborated with teams across the U.S. and India, leading multiple
              Java-based development projects for the Market Risk department.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>
                Developed portfolio management and reporting applications using{" "}
                <span className={styles.accent}>Adobe Flex and Java</span>.
              </li>
              <li>
                Built a report transformation engine using{" "}
                <span className={styles.accent}>JEXL</span> and designed batch jobs for
                intraday feed processing.
              </li>
              <li>
                Migrated Flex applications to single-page applications using{" "}
                <span className={styles.accent}>ExtJS and Spring Boot</span>.
              </li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Java, JMS, Kafka, Jenkins, ExtJS, Spring Boot, Hibernate, Oracle, AWS
            </p>
          </div>

          <div className={styles.jobBlock}>
            <h3 className={styles.subtitleSmall}>Rogers Communications Inc.</h3>
            <p className={styles.lead}>
              <strong>Senior Programmer Analyst</strong> (07/2010 – 07/2012)
              <br />
              Collaborated with project stakeholders to develop and deliver
              applications supporting business needs.
            </p>
            <p className={styles.lead}>
              <strong>Key Achievements:</strong>
            </p>
            <ul className={styles.list}>
              <li>Enhanced the ENS to support MMS delivery.</li>
              <li>
                Developed SMS/MMS template generators using{" "}
                <span className={styles.accent}>Apache Velocity and Java Regex</span>.
              </li>
            </ul>
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Java, Adobe LiveCycle, Oracle, Spring, Hibernate, WebLogic
            </p>
          </div>

          <hr />
          <h2 className={styles.subtitle}>PROJECTS</h2>
          <div className={styles.projects}>
            {projects.map((p) =>
              p.disabled ? (
                <div
                  key={p.url}
                  className="metro-card metro-card-disabled"
                  aria-disabled="true"
                >
                  {p.icon ? (
                    <span className="metro-icon-wrap">{p.icon}</span>
                  ) : (
                    <img src={p.logo} alt={p.name} className="metro-logo" />
                  )}
                  <div className="metro-info">
                    <span className="metro-name">{p.name}</span>
                    <span className="metro-desc">{p.description}</span>
                    {p.comingSoon && (
                      <span className={styles.comingSoon}>(Coming soon)</span>
                    )}
                  </div>
                </div>
              ) : (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metro-card"
                >
                  {p.icon ? (
                    <span className="metro-icon-wrap">{p.icon}</span>
                  ) : (
                    <img src={p.logo} alt={p.name} className="metro-logo" />
                  )}
                  <div className="metro-info">
                    <span className="metro-name">{p.name}</span>
                    <span className="metro-desc">{p.description}</span>
                  </div>
                </a>
              ),
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default About;
