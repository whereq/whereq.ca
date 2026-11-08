import React from "react";
import mathAnimationSvg from "./svg/math-animation.svg";

interface MathAnimationIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

const MathAnimationIcon: React.FC<MathAnimationIconProps> = ({ className, ...props }) => {
  return (
    <img
      src={mathAnimationSvg}
      alt="Math Animation Icon"
      className={className}
      {...props}
    />
  );
};

export default MathAnimationIcon;