const PhysicsMechanicsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    {/* Background with rounded corners */}
    <rect width="100" height="100" fill="#fdba74" rx="10" ry="10"/>

    {/* Large Gear */}
    <circle cx="30" cy="30" r="15" stroke="#1f2937" strokeWidth="2" fill="none"/>
    <circle cx="30" cy="30" r="5" fill="#1f2937"/>
    <line x1="30" y1="15" x2="30" y2="10" stroke="#1f2937" strokeWidth="2"/>
    <line x1="30" y1="45" x2="30" y2="50" stroke="#1f2937" strokeWidth="2"/>
    <line x1="15" y1="30" x2="10" y2="30" stroke="#1f2937" strokeWidth="2"/>
    <line x1="45" y1="30" x2="50" y2="30" stroke="#1f2937" strokeWidth="2"/>

    {/* Small Gear */}
    <circle cx="70" cy="30" r="10" stroke="#1f2937" strokeWidth="2" fill="none"/>
    <circle cx="70" cy="30" r="4" fill="#1f2937"/>
    <line x1="70" y1="20" x2="70" y2="15" stroke="#1f2937" strokeWidth="2"/>
    <line x1="70" y1="40" x2="70" y2="45" stroke="#1f2937" strokeWidth="2"/>

    {/* Pulley System */}
    <line x1="30" y1="60" x2="30" y2="80" stroke="#1f2937" strokeWidth="2"/>
    <circle cx="30" cy="80" r="5" fill="#1f2937"/>
    <line x1="30" y1="80" x2="60" y2="80" stroke="#1f2937" strokeWidth="2"/>
    <circle cx="60" cy="80" r="5" fill="#1f2937"/>
    <line x1="60" y1="80" x2="60" y2="60" stroke="#1f2937" strokeWidth="2"/>

    {/* Label "MECH" in Fira Code */}
    <text x="25" y="95" fontFamily="'Fira Code', monospace" fontSize="10" fill="#1f2937">MECH</text>
  </svg>
);

export default PhysicsMechanicsIcon;