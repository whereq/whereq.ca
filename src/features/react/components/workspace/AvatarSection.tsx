import { Avatar, AvatarGroup } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

const TEAM = [
    { name: "WhereQ Lab" },
    { name: "KeyToMarvel" },
    { name: "Chroniq" },
    { name: "FlowDesk" },
];

/** Child page 4 — avatars, alone and in a group. */
export const AvatarSection = () => {
    const { showCode } = useReactStore();

    return (
        <div>
            <span className="wq-react__label">Live</span>
            <div className="wq-react__demo">
                <div className="wq-react__row">
                    <Avatar name="WhereQ Lab" size={44} />
                    <Avatar name="WhereQ Lab" size={44} shape="rounded" />
                    <Avatar name="WhereQ Lab" size={44} shape="square" />
                    <Avatar name="WhereQ Lab" size={44} status="online" />
                    <Avatar size={44} fallback={<span>WQ</span>} />
                </div>

                <div className="wq-react__row mt-5">
                    <AvatarGroup max={4} spacing={-8}>
                        {TEAM.map((member) => (
                            <Avatar key={member.name} name={member.name} size={36} />
                        ))}
                    </AvatarGroup>
                </div>

                <p className="wq-react__note">
                    An avatar falls back to initials when there is no picture, so a
                    missing image never leaves a hole in the layout.
                </p>
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { Avatar, AvatarGroup } from '@whereq/react'

<Avatar name="WhereQ Lab" size={44} status="online" />
<AvatarGroup max={4}>{team.map((m) => <Avatar key={m.name} name={m.name} />)}</AvatarGroup>`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default AvatarSection;
