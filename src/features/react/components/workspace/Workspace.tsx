import { Resizable } from "re-resizable";

import { useReactStore } from "@/features/react/store/reactStore";
import { SectionType } from "@/features/react/models/ReactEnum";
import { SearchBoxSection } from "@/features/react/components/workspace/SearchBoxSection";
import { TagSection } from "@/features/react/components/workspace/TagSection";
import { ToastSection } from "@/features/react/components/workspace/ToastSection";
import { AvatarSection } from "@/features/react/components/workspace/AvatarSection";
import { ScrollbarSection } from "@/features/react/components/workspace/ScrollbarSection";
import { CountryFlagSection } from "@/features/react/components/workspace/CountryFlagSection";

/**
 * The live workspace — the child page of the selected primitive.
 *
 * It is a resizable panel (like the other Lab features) so a visitor
 * can widen the demo or give the documentation the room instead.
 *
 * It starts wide on purpose: the demo and the example code are what the
 * visitor came for, and the code has to stay on one line to be readable.
 * The width is a share of the page rather than a fixed number of pixels,
 * so the demo keeps its room on a big screen and on a small one.
 */
export const Workspace = () => {
    const { activeSection } = useReactStore();

    return (
        <Resizable
            defaultSize={{ width: "58%", height: "100%" }}
            minWidth={420}
            maxWidth="74%"
            enable={{ right: true }}
            className="wq-react__workspace"
            handleStyles={{
                right: {
                    cursor: "ew-resize",
                    width: "3px",
                },
            }}
            handleClasses={{ right: "bg-blue-500 hover:bg-blue-700" }}
        >
            {activeSection === SectionType.SEARCH_BOX && <SearchBoxSection />}
            {activeSection === SectionType.TAG && <TagSection />}
            {activeSection === SectionType.TOAST && <ToastSection />}
            {activeSection === SectionType.AVATAR && <AvatarSection />}
            {activeSection === SectionType.SCROLLBAR && <ScrollbarSection />}
            {activeSection === SectionType.COUNTRY_FLAG && <CountryFlagSection />}
        </Resizable>
    );
};

export default Workspace;
