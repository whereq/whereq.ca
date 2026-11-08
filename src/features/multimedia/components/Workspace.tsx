import { useMultimediaStore } from "@/features/multimedia/store/multimediaStore";
import { SectionType } from "@/features/multimedia/models/MultimediaEnum";
// YouTubeCapture is intentionally not imported: the sidebar hides
// it (see Sidebar.tsx) until the embed-blocked-network issue is
// resolved. Leaving the import here would bundle the iframe
// loader + reachability check + ffmpeg-style error states for
// a tool the user can't reach.
import BackgroundRemover from "@/features/multimedia/components/BackgroundRemover";
import ImageFormatConverter from "@/features/multimedia/components/ImageFormatConverter";
import VideoToGif from "@/features/multimedia/components/VideoToGif";
import GifCompressor from "@/features/multimedia/components/GifCompressor";
import VideoSplitter from "@/features/multimedia/components/VideoSplitter";
import AudioVideoMerger from "@/features/multimedia/components/AudioVideoMerger";
import GifMaker from "@/features/multimedia/components/GifMaker";

const Workspace = () => {
    const { activeSection } = useMultimediaStore();

    return (
        <div className="flex-1 bg-gray-800 h-full overflow-hidden">
            {/* YouTube Capture is hidden; if a stale state value
                somehow lands here, render nothing rather than
                pulling in the disabled component. */}
            {activeSection === SectionType.BACKGROUND_REMOVER && <BackgroundRemover />}
            {activeSection === SectionType.IMAGE_FORMAT_CONVERTER && <ImageFormatConverter />}
            {activeSection === SectionType.VIDEO_TO_GIF && <VideoToGif />}
            {activeSection === SectionType.GIF_COMPRESSOR && <GifCompressor />}
            {activeSection === SectionType.VIDEO_SPLITTER && <VideoSplitter />}
            {activeSection === SectionType.AUDIO_VIDEO_MERGER && <AudioVideoMerger />}
            {activeSection === SectionType.GIF_MAKER && <GifMaker />}
        </div>
    );
};

export default Workspace;