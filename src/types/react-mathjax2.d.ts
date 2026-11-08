declare module 'react-mathjax2' {
  import { ReactNode } from 'react';

  export interface MathJaxProps {
    inline?: boolean;
    children: ReactNode;
  }

  export const MathJaxContext: React.ComponentType<object>;
  export const MathJax: React.ComponentType<MathJaxProps>;
}
