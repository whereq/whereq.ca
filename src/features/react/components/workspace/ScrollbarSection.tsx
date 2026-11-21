import { Scrollbar } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

const ROWS = Array.from({ length: 24 }, (_, index) => ({
    id: index,
    label: `Row ${String(index + 1).padStart(2, "0")}`,
    detail: "A scrollable row inside the library's own scroll container.",
}));

/** Child page 5 — the thin, themeable scroll container. */
export const ScrollbarSection = () => {
    const { showCode } = useReactStore();

    return (
        <div>
            <span className="wq-react__label">Live</span>
            <div className="wq-react__demo">
                <Scrollbar
                    theme="neutral"
                    size={5}
                    radius={3}
                    autoHide
                    style={{ height: 220, overflowY: "auto" }}
                >
                    {ROWS.map((row) => (
                        <div
                            key={row.id}
                            style={{
                                padding: "10px 2px",
                                borderBottom: "1px solid var(--color-metro-border)",
                                fontSize: 12,
                            }}
                        >
                            <span style={{ color: "var(--color-metro-text)" }}>{row.label}</span>
                            <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "var(--color-metro-text-dim)" }}>
                                {row.detail}
                            </span>
                        </div>
                    ))}
                </Scrollbar>
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { Scrollbar } from '@whereq/react'

<Scrollbar theme="neutral" size={5} autoHide style={{ height: 220 }}>
  {rows.map((row) => <div key={row.id}>{row.label}</div>)}
</Scrollbar>`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default ScrollbarSection;
