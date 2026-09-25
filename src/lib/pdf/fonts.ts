"use client";

import { Font } from "@react-pdf/renderer";

export const PDF_FONT = "Poppins";

let registered = false;

/** Poppins local — mesma família da interface, nos PDFs gerados no browser. */
export function registerPdfFonts() {
  if (registered) return;
  registered = true;
  Font.register({
    family: PDF_FONT,
    fonts: [
      { src: "/fonts/Poppins-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/Poppins-Medium.ttf", fontWeight: 500 },
      { src: "/fonts/Poppins-SemiBold.ttf", fontWeight: 600 },
      { src: "/fonts/Poppins-Bold.ttf", fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}
