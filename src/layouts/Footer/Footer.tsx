export const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[3.125rem]
      flex items-center justify-center
      bg-[#0A0E13] text-[#8b949e]
      font-medium font-fira-code text-sm
      border-t border-[rgba(168,190,216,0.12)] px-2">
      <p className="text-center truncate">
        &copy; 2026 WhereQ · The Research Station of the{" "}
        <a href="/" className="text-[#4DA8F0] hover:underline">
          WhereQ Universe
        </a>
      </p>
    </footer>
  );
};