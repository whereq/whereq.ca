import { useReactStore } from "@/features/react/store/reactStore";

/**
 * The demo's settings panel.
 *
 * One switch today: whether the code snippets stay visible under each
 * live demo. It is a real setting (it changes what the visitor sees),
 * so it lives in the feature store with the rest of the demo state.
 */
export const SettingPanel = ({ onClose }: { onClose: () => void }) => {
    const { showCode, toggleShowCode } = useReactStore();

    return (
        <aside className="wq-react__settings" aria-label="Demo settings">
            <h3>Settings</h3>
            <p className="wq-react__note">Tune the demo itself — the library is unchanged.</p>

            <label className="wq-react__toggle">
                <input
                    type="checkbox"
                    checked={showCode}
                    onChange={toggleShowCode}
                />
                Show code snippets
            </label>

            <div className="mt-6">
                <button type="button" className="wq-react__button" onClick={onClose}>
                    Close
                </button>
            </div>
        </aside>
    );
};

export default SettingPanel;
