export interface HistogramSeriesDto {
  /** ISO timestamps for the x-axis */
  timestamps: string[];

  /** Map of outcome → array of counts aligned with timestamps */
  series: Record<string, number[]>;
}
