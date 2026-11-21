import { useState } from "react";
import { ToastProvider, ToastViewport } from "@whereq/react";

import { Sidebar } from "@/features/react/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/react/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/react/components/workspace/Workspace";
import { WhereqReact } from "@/features/react/components/WhereqReact";
import { useReactStore } from "@/features/react/store/reactStore";
import "@/features/react/react.css";

/**
 * The @whereq/react demo.
 *
 * The rail on the left holds one button per primitive (the child
 * pages), the workspace shows the live demo of the selected one and
 * the panel on the right documents it.
 */
const ReactPage = () => {
    const { isWorkspaceVisible } = useReactStore();
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(false);

    const toggleSettingPanel = () => setIsSettingPanelVisible(!isSettingPanelVisible);

    return (
        <ToastProvider>
            <div className="wq-react">
                {/* Primitive rail */}
                <Sidebar openSettings={toggleSettingPanel} />

                {/* Live demo of the selected primitive */}
                {isWorkspaceVisible && <Workspace />}

                {/* Documentation panel */}
                <WhereqReact />

                {/* Settings panel */}
                {isSettingPanelVisible && <SettingPanel onClose={toggleSettingPanel} />}

                <ToastViewport position="bottom-right" />
            </div>
        </ToastProvider>
    );
};

export default ReactPage;
