import { BsYinYang } from "react-icons/bs";
import PageLayout from "@/layouts/PageLayout";
import styles from "./About.module.css";

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
    logo: "https://whereq.github.io/images/logo/whereq-com.png",
  },
  {
    name: "WhereQ — LLM",
    description: "AI/LLM integrated platform",
    url: "https://www.whereq.cc",
    logo: "https://whereq.github.io/images/logo/whereq-cc.png",
    disabled: true,
    comingSoon: true,
  },
  {
    name: "Key To Marvel",
    description: "Unified identity & access management platform",
    url: "https://www.keytomarvel.com",
    icon: <BsYinYang className="metro-icon" />,
  },
  {
    name: "FlowDesk",
    description:
      "Deep, structured & intelligent stock analysis powered by AI. Explore companies, investigate investment ideas, and have professional-grade conversations about stocks.",
    url: "https://www.flowdesk.top",
    logo: "/logos/flowdesk.svg",
  },
  {
    name: "whereq",
    description:
      "Discover the world beyond the map — location-based guides, neighbourhood stories, hidden histories, and social connections for any place you drop a pin.",
    url: "https://www.whereq.com",
    logo: "/logos/whereq-com.svg",
  },
  {
    name: "CatoBigato",
    description:
      "Your chubby cat tutor for K-12 to college. Catobi listens, thinks, and shows the work — explanations, quizzes, and graphs across math, science, and the humanities.",
    url: "https://www.catobigato.com",
    logo: "/logos/catobigato.png",
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
                  <img
                    src="https://whereq.github.io/images/pod/bacon-with-hat-transparent-bg.png"
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
              Founded WhereQ Inc., specializing in web 2.0 applications for the Real
              Estate Industry. Additionally, offering OpenAI integration and practical
              applications.
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
            <p className={styles.stack}>
              <strong>Technical Environment:</strong>
              <br />
              Amazon EC2, RDS, S3, Spring WebFlux, React, Keycloak, Angular, GIS,
              Google Map, MapStruct, Git, CI/CD, Social Login
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
