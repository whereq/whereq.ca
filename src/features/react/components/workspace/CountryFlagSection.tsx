import { CountryFlag } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

/**
 * The flags on show. `code` is the short form — the one you would put in
 * a table — and `name` the country it stands for. The code is what the
 * demo shows; the name is what a hover gives you.
 *
 * The library's registry knows 65 countries; this is the row the demo puts
 * on screen — the ones a reader is most likely to look for, and the ones
 * that show the range of shapes the registry can draw: tricolors, cantons,
 * a crescent, a chakra, a taegeuk, a serrated band.
 */
const FLAGS = [
    { country: "ca", code: "CA", name: "Canada" },
    { country: "cn", code: "CN", name: "China" },
    { country: "us", code: "USA", name: "United States" },
    { country: "gb", code: "UK", name: "United Kingdom" },
    { country: "fr", code: "FR", name: "France" },
    { country: "de", code: "DE", name: "Germany" },
    { country: "it", code: "IT", name: "Italy" },
    { country: "es", code: "ES", name: "Spain" },
    { country: "mx", code: "MX", name: "Mexico" },
    { country: "br", code: "BR", name: "Brazil" },
    { country: "jp", code: "JP", name: "Japan" },
    { country: "kr", code: "KR", name: "South Korea" },
    { country: "in", code: "IN", name: "India" },
    { country: "pk", code: "PK", name: "Pakistan" },
    { country: "sg", code: "SG", name: "Singapore" },
    { country: "ru", code: "RU", name: "Russia" },
    { country: "tr", code: "TR", name: "Turkey" },
    { country: "eg", code: "EG", name: "Egypt" },
    { country: "za", code: "ZA", name: "South Africa" },
    { country: "au", code: "AU", name: "Australia" },
    { country: "nl", code: "NL", name: "Netherlands" },
    { country: "se", code: "SE", name: "Sweden" },
    { country: "pl", code: "PL", name: "Poland" },
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
                            title={flag.name}
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
                            {flag.code}
                        </span>
                    ))}
                </div>

                <p className="wq-react__note">
                    Flags are inline SVG from a built-in registry of 65 countries —
                    no image request, no flag CDN, nothing to block on.
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
