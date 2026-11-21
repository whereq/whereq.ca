import { CountryFlag } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

const FLAGS = [
    { country: "ca", name: "Canada" },
    { country: "cn", name: "China" },
    { country: "us", name: "United States" },
    { country: "gb", name: "United Kingdom" },
    { country: "jp", name: "Japan" },
    { country: "fr", name: "France" },
    { country: "de", name: "Germany" },
    { country: "eu", name: "Europe" },
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
                            {flag.name}
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
