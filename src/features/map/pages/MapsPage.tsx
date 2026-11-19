import { useState, useCallback } from "react";
import { Sidebar } from "@/features/map/components/sidebar/Sidebar";
import { SettingPanel } from "@/features/map/components/sidebar/settings-panel/SettingsPanel";
import { Workspace } from "@/features/map/components/workspace/Workspace";
import Maps from "@/features/map/components/Maps";
import PageLayout from "@/layouts/PageLayout";
import { useMapStore } from "@/features/map/store/mapStore";
import { readGoogleMapCredentials } from "@/features/map/utils/mapCredentials";
// Load the new Google Maps API via the official @vis.gl/react-google-maps
// <APIProvider> rather than the legacy @react-google-maps/api <LoadScript>.
// The new library registers the gmp-* web-components and uses the same
// global `google.maps.*` API the rest of this page already calls.
import { APIProvider } from "@vis.gl/react-google-maps";

const MapsPage = () => {
    const { isWorkspaceVisible } = useMapStore(); // Get workspace visibility from the store

    // Read the credentials synchronously, during the first render.
    //
    // <APIProvider> loads the Maps JavaScript API exactly once, on mount. It
    // never reloads it, so an API key that arrives later (for example from an
    // effect) is too late: the script is requested without a key and the API
    // then rejects every call with "ApiProjectMapError".
    const [credentials, setCredentials] = useState(readGoogleMapCredentials);
    const [isSettingPanelVisible, setIsSettingPanelVisible] = useState(() => !credentials.apiKey);

    // The settings panel writes to local storage; re-read afterwards so a
    // freshly saved API key is picked up.
    const refreshCredentials = useCallback(() => {
        setCredentials(readGoogleMapCredentials());
    }, []);

    const toggleSettingPanel = () => setIsSettingPanelVisible((visible) => !visible);

    const closeSettingPanel = useCallback(() => {
        setIsSettingPanelVisible(false);
        refreshCredentials();
    }, [refreshCredentials]);

    return (
        <PageLayout>
            <div className="maps-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
                {/* Side Bar */}
                <Sidebar
                    openSettings={toggleSettingPanel}
                />

                {/* Workspace */}
                {isWorkspaceVisible && <Workspace />}

                {/* Main Panel */}
                <div
                    className="flex-1 bg-gray-800 text-orange-300 h-full"
                >
                    {credentials.apiKey ? (
                        <APIProvider apiKey={credentials.apiKey} libraries={["places", "marker", "geometry"]}>
                            <Maps />
                        </APIProvider>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                            <p className="max-w-md text-sm text-gray-300">
                                The map needs a Google Maps API key before it can load.
                                Add your key in the settings panel and the map will appear here.
                            </p>
                            <button
                                onClick={() => setIsSettingPanelVisible(true)}
                                className="rounded border border-orange-400 px-4 py-2 text-sm text-orange-400 hover:bg-orange-400 hover:text-gray-900"
                            >
                                Open settings
                            </button>
                        </div>
                    )}
                </div>

                {/* Settings Panel */}
                {isSettingPanelVisible && <SettingPanel onClose={closeSettingPanel} />}
            </div>
        </PageLayout>
    );
};

export default MapsPage;
