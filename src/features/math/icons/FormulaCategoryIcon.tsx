import React from "react";
import formulaCategorySvg from "./svg/formula-category.svg";

interface FormulaCategoryIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

const FormulaCategoryIcon: React.FC<FormulaCategoryIconProps> = ({ className, ...props }) => {
  return (
    <img
      src={formulaCategorySvg}
      alt="Formula Category Icon"
      className={className}
      {...props}
    />
  );
};

export default FormulaCategoryIcon;