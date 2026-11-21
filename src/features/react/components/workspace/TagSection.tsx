import { Tag } from "@whereq/react";

import { useReactStore } from "@/features/react/store/reactStore";
import { CodeBlock } from "@/features/react/components/workspace/CodeBlock";

/** Child page 2 — the inline tag, in every variant. */
export const TagSection = () => {
    const { showCode } = useReactStore();

    return (
        <div>
            <span className="wq-react__label">Variants</span>
            <div className="wq-react__demo">
                <div className="wq-react__row">
                    <Tag>subtle</Tag>
                    <Tag variant="link">link</Tag>
                    <Tag variant="dot" dotColor="#4da8f0">dot</Tag>
                    <Tag variant="solid" solidColor="#4da8f0">solid</Tag>
                </div>

                <div className="wq-react__row mt-4">
                    <Tag size="md">medium</Tag>
                    <Tag size="md" variant="link">medium link</Tag>
                </div>

                <p className="wq-react__note">
                    The chip colours come from the app&apos;s own theme variables, so a
                    tag looks native wherever the library is used.
                </p>
            </div>

            {showCode && (
                <div className="mt-4">
                    <CodeBlock>{`import { Tag } from '@whereq/react'

<Tag>subtle</Tag>
<Tag variant="link">link</Tag>
<Tag variant="dot" dotColor="#4da8f0">dot</Tag>
<Tag variant="solid" solidColor="#4da8f0">solid</Tag>`}</CodeBlock>
                </div>
            )}
        </div>
    );
};

export default TagSection;
