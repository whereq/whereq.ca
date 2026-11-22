import { CountryFlag } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

/**
 * The flags on show. `code` is the short form — the one you would put in
 * a table — and `name` the country it stands for. The two are shown
 * together, because the code is what you look up and the name is what
 * you read.
 */
const FLAGS = [
    { country: "ca", code: "CA", name: "Canada" },
    { country: "cn", code: "CN", name: "China" },
    { country: "us", code: "USA", name: "United States" },
    { country: "gb", code: "UK", name: "United Kingdom" },
    { country: "jp", code: "JP", name: "Japan" },
    { country: "fr", code: "FR", name: "France" },
    { country: "de", code: "DE", name: "Germany" },
    { country: "eu", code: "EU", name: "Europe" },
];

/** Child page 6 — country flags, drawn as inline SVG. */
export const CountryFlagSection = () => {
    const { showCode } = useReactStore();

    return (
        <div>
            <span className="wq-react__label">Live</span>
            <div className="wq-react__demo">
                <div className="wq-react__row">
                    {FLAGS.map((flag) => (
                        <span
                            key={flag.country}
                            style={{
                                display: "inline-flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 10,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: "var(--color-metro-text-dim)",
                            }}
                        >
                            <CountryFlag country={flag.country} size={28} shape="rounded" />
                            {flag.code} - {flag.name}
                        </span>
                    ))}
                </div>

                <p className="wq-react__note">
                    Flags are inline SVG from a small built-in registry — no image
                    request, no flag CDN, nothing to block on.
                </p>
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { CountryFlag } from '@whereq/react'

<CountryFlag country="ca" size={28} shape="rounded" />`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default CountryFlagSection;
