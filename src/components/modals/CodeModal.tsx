import React, { useEffect } from "react";
import Modal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faTimes } from "@fortawesome/free-solid-svg-icons"; // Added faTimes for close icon
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // Dark theme for syntax highlighting
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-java";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-xml-doc";

interface CodeModalProps {
  isOpen: boolean;
  title?: string;
  content: string; // The structured text or code to display
  language?: string; // Optional: Specify the language for syntax highlighting (e.g., "json", "python")
  onRequestClose: () => void;
}

const CodeModal: React.FC<CodeModalProps> = ({
  isOpen,
  title = "Code Viewer",
  content,
  language = "plaintext", // Default to plaintext if no language is specified
  onRequestClose,
}) => {
  // Highlight syntax whenever content or language changes
  useEffect(() => {
    Prism.highlightAll();
  }, [content, language]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="bg-gray-900 p-4 border border-gray-700 font-firacode max-w-3xl w-full mx-4"
      overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center"
    >
      {/* Title Area with Close Icon */}
      <div className="flex justify-between items-center mb-4 text-orange-500 
                      font-bold text-xl border-b border-gray-700 pb-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCode} className="text-lg" />
          {title}
        </div>
        <button
          onClick={onRequestClose}
          className="text-orange-500 hover:text-orange-600 transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faTimes} className="text-lg" />
        </button>
      </div>

      {/* Code Content Area */}
      <div className="overflow-auto max-h-[70vh] bg-gray-800 p-4">
        <pre className="text-sm text-orange-300 whitespace-pre-wrap">
          <code className={`language-${language}`}>{content}</code>
        </pre>
      </div>
    </Modal>
  );
};

export default CodeModal;