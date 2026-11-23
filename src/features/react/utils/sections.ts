import {
    faMagnifyingGlass,
    faTag,
    faBell,
    faUser,
    faArrowsUpDown,
    faFlag,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { SectionType } from "@/features/react/models/ReactEnum";

/** The copy and the icon of every child page of the demo. */
export const SECTION_META: Record<SectionType, { title: string; blurb: string; icon: IconDefinition }> = {
    [SectionType.SEARCH_BOX]: {
        title: "SearchBox",
        blurb: "A combobox with a suggestion list, keyboard navigation and a clear button — the control behind every search field in the WhereQ universe.",
        icon: faMagnifyingGlass,
    },
    [SectionType.TAG]: {
        title: "Tag",
        blurb: "One inline chip for every label, badge and status pill, in four variants and two sizes.",
        icon: faTag,
    },
    [SectionType.TOAST]: {
        title: "Toast",
        blurb: "A toast stack with a small imperative API — notify, success, warning, error — anywhere in the app.",
        icon: faBell,
    },
    [SectionType.AVATAR]: {
        title: "Avatar",
        blurb: "Initials or an image, in a circle, a rounded square or a square, with an optional presence dot.",
        icon: faUser,
    },
    [SectionType.SCROLLBAR]: {
        title: "Scrollbar",
        blurb: "A thin, themeable scroll container that works with the browser's own scrollbar as a fallback.",
        icon: faArrowsUpDown,
    },
    [SectionType.COUNTRY_FLAG]: {
        title: "CountryFlag",
        blurb: "Country flags drawn as inline SVG from a built-in registry of 65 countries — no image requests, no flag CDN.",
        icon: faFlag,
    },
};
