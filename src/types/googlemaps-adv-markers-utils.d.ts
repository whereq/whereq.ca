declare module "@googlemaps/adv-markers-utils" {
  export class PinElement {
    constructor(options: {
      background?: string;
      borderColor?: string;
      glyphColor?: string;
      scale?: number;
    });
    element: HTMLElement;
  }
}