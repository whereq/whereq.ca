import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faVideo,
    faImagePortrait,
    faRightLeft,
    faFilm,
    faCompress,
    faScissors,
    faCirclePlus,
    faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { SectionType } from "@/features/multimedia/models/MultimediaEnum";
import { useMultimediaStore } from "@/features/multimedia/store/multimediaStore";

const TOOLS: { section: SectionType; icon: typeof faVideo; label: string }[] = [
    // HIDDEN: YouTube Capture is temporarily disabled because the
    // embed fails on networks where `youtube.com` is blocked
    // (mainland China, corporate firewalls, etc.) and the
    // local-first design has no fallback. Re-enable when we
    // decide on a real solution (e.g., a backend proxy the user
    // is willing to accept, or a different video source).
    // { section: SectionType.YOUTUBE_CAPTURE, icon: faVideo, label: "YouTube Capture" },
    { section: SectionType.BACKGROUND_REMOVER, icon: faImagePortrait, label: "Background Remover" },
    { section: SectionType.IMAGE_FORMAT_CONVERTER, icon: faRightLeft, label: "Image Format Converter" },
    { section: SectionType.VIDEO_TO_GIF, icon: faFilm, label: "Video to GIF" },
    { section: SectionType.GIF_COMPRESSOR, icon: faCompress, label: "GIF Compressor" },
    { section: SectionType.VIDEO_SPLITTER, icon: faScissors, label: "Video Splitter" },
    { section: SectionType.AUDIO_VIDEO_MERGER, icon: faCirclePlus, label: "Audio + Video Merger" },
    { section: SectionType.GIF_MAKER, icon: faWandMagicSparkles, label: "GIF Maker" },
];

export const Sidebar = () => {
    const { activeSection, setActiveSection, isWorkspaceVisible, toggleWorkspace } = useMultimediaStore();

    const handleClick = (section: SectionType) => {
        setActiveSection(section);
        if (!isWorkspaceVisible) toggleWorkspace();
    };

    return (
        <div className="multimedia-sidebar w-16 bg-gray-800 flex flex-col items-center pt-4 text-orange-300 h-full font-fira-code border-r border-orange-700">
            {TOOLS.map(({ section, icon, label }) => (
                <button
                    key={section}
                    className={`mb-4 w-10 h-10 flex items-center justify-center rounded-md transition ${
                        activeSection === section
                            ? "bg-orange-500 text-white"
                            : "hover:text-orange-400 hover:bg-gray-700"
                    }`}
                    onClick={() => handleClick(section)}
                    title={label}
                >
                    <FontAwesomeIcon icon={icon} size="lg" />
                </button>
            ))}
        </div>
    );
};

export default Sidebar;
