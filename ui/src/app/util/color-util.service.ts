import { Injectable } from '@angular/core';

export type Color = {
  r: number;
  g: number;
  b: number;
};

@Injectable({
  providedIn: 'root',
})
export class ColorUtilService {
  /**
   * Function to convert hex color to RGB.
   * @param hex The hex color string (e.g., '#ff5733').
   * @returns An object containing red, green, and blue values.
   */
  hexToRgb(hex: string): Color {
    // Remove the hash (#) if present
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
  }

  /**
   * Function to calculate the luminance of an RGB color.
   * @param rgb An object with r, g, b properties.
   * @returns The luminance value (0 to 1).
   */
  calculateLuminance(rgb: Color): number {
    const { r, g, b } = rgb;
    // Convert RGB values to the range of 0 to 1
    const rLinear = r / 255;
    const gLinear = g / 255;
    const bLinear = b / 255;

    // Calculate luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }
}
