import { useState } from "react";
import { SearchBox } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";
import { DEMO_SEARCH_THEME } from "@/features/react/utils/theme";

const PRIMITIVES = [
    { key: "search-box", label: "SearchBox", description: "Combobox with a suggestion list" },
    { key: "tag", label: "Tag", description: "Inline chip, four variants" },
    { key: "toast", label: "Toast", description: "Notification stack" },
    { key: "avatar", label: "Avatar", description: "Initials, image or presence dot" },
    { key: "scrollbar", label: "Scrollbar", description: "Thin, themeable scroll container" },
    { key: "country-flag", label: "CountryFlag", description: "Inline SVG flags" },
];

/** Child page 1 — the shared search box, live. */
export const SearchBoxSection = () => {
    const { showCode } = useReactStore();
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<string | null>(null);

    // The library shows the list whenever there are suggestions, so the demo
    // only offers the ones that match the query — otherwise the dropdown
    // would sit open the whole time.
    const suggestions = query.trim()
        ? PRIMITIVES.filter((primitive) =>
              `${primitive.label} ${primitive.description}`.toLowerCase().includes(query.trim().toLowerCase())
          )
        : [];

    return (
        <div>
            <span className="wq-react__label">Live</span>
            <div className="wq-react__demo">
                <SearchBox
                    inputId="demoSearch"
                    value={query}
                    onChange={setQuery}
                    placeholder="Search the primitives"
                    label="Search the primitives"
                    theme={DEMO_SEARCH_THEME}
                    suggestions={suggestions}
                    onSelect={(suggestion) => {
                        setPicked(String(suggestion.label));
                        setQuery("");
                    }}
                    emptyText="No primitive matches that name."
                />
                {picked && (
                    <p className="wq-react__note">
                        Picked <b>{picked}</b> — arrow keys move, Enter picks, Escape closes.
                    </p>
                )}
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { SearchBox } from '@whereq/react'

<SearchBox
  value={query}
  onChange={setQuery}
  placeholder="Search the primitives"
  suggestions={primitives}
  onSelect={(suggestion) => console.log(suggestion)}
  theme={theme}
/>`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default SearchBoxSection;
