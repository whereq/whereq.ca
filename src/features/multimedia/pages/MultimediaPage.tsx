import { Sidebar } from "@/features/multimedia/components/Sidebar";
import Workspace from "@/features/multimedia/components/Workspace";
import PageLayout from "@/layouts/PageLayout";

const MultimediaPage = () => {
    return (
        <PageLayout>
            <div className="multimedia-page flex h-full bg-gray-900 text-orange-300 font-fira-code">
                <Sidebar />
                <Workspace />
            </div>
        </PageLayout>
    );
};

export default MultimediaPage;
