import { toast } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

/** Child page 3 — the toast stack, fired from the imperative API. */
export const ToastSection = () => {
    const { showCode } = useReactStore();

    return (
        <div>
            <span className="wq-react__label">Live</span>
            <div className="wq-react__demo">
                <div className="wq-react__row">
                    <button
                        type="button"
                        className="wq-react__button"
                        onClick={() => toast.notify("Something happened")}
                    >
                        Notify
                    </button>
                    <button
                        type="button"
                        className="wq-react__button"
                        onClick={() => toast.success("Saved", { description: "Your changes are on this device." })}
                    >
                        Success
                    </button>
                    <button
                        type="button"
                        className="wq-react__button"
                        onClick={() => toast.warning("Careful", { description: "This one is a warning." })}
                    >
                        Warning
                    </button>
                    <button
                        type="button"
                        className="wq-react__button"
                        onClick={() => toast.error("It failed", { description: "And this one is an error." })}
                    >
                        Error
                    </button>
                </div>

                <p className="wq-react__note">
                    The stack appears in the corner of the window and fades on its own.
                    Hover a toast to hold it open.
                </p>
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { toast } from '@whereq/react'

toast.success('Saved', { description: 'Your changes are on this device.' })
toast.error('It failed')`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default ToastSection;
