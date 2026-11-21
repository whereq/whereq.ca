import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FaGithub } from "react-icons/fa";

import { SectionType } from "@/features/react/models/ReactEnum";
import { useReactStore } from "@/features/react/store/reactStore";
import { SECTION_META } from "@/features/react/utils/sections";
import { LIBRARY_PACKAGE, LIBRARY_REPO, LIBRARY_NPM } from "@/features/react/utils/constants";

/**
 * The documentation panel of the demo.
 *
 * It introduces the library, links out to its source, and then shows
 * the child page of whichever primitive is selected.
 */
export const WhereqReact = () => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useReactStore();
    const meta = SECTION_META[activeSection];

    /** Open the workspace on a primitive. */
    const openSection = (section: SectionType) => {
        setActiveSection(section);
        if (!isWorkspaceVisible) {
            toggleWorkspace();
        }
    };

    return (
        <main className="wq-react__main">
            <p className="wq-react__kicker">Open source · npm package</p>
            <h1 className="wq-react__title">{LIBRARY_PACKAGE}</h1>
            <p className="wq-react__lede">
                WhereQ&apos;s shared React component library — the accessible,
                themeable primitives every WhereQ app is built from. This page is
                the live demo: every child page on the left renders the real
                component from the published package, not a screenshot of it.
            </p>

            <div className="wq-react__install">
                <span>Install</span>
                <code>{`yarn add ${LIBRARY_PACKAGE}`}</code>
            </div>

            <div className="wq-react__links">
                <a className="wq-react__link" href={LIBRARY_REPO} target="_blank" rel="noreferrer">
                    <FaGithub /> Source
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
                </a>
                <a className="wq-react__link" href={LIBRARY_NPM} target="_blank" rel="noreferrer">
                    npm
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
                </a>
            </div>

            <div className="wq-react__index">
                {Object.values(SectionType).map((section) => {
                    const item = SECTION_META[section];
                    return (
                        <button
                            key={section}
                            type="button"
                            className="wq-react__primitive"
                            onClick={() => openSection(section)}
                        >
                            <span className="wq-react__primitive-icon">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            <span>
                                <span className="wq-react__primitive-name">{item.title}</span>
                                <span className="wq-react__primitive-blurb">{item.blurb}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <section className="wq-react__child">
                <h2 className="wq-react__child-title">
                    <FontAwesomeIcon icon={meta.icon} />
                    {meta.title}
                </h2>
                <p className="wq-react__child-blurb">{meta.blurb}</p>
            </section>
        </main>
    );
};

export default WhereqReact;
