function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const roundedValue = Math.round(value * factor) / factor;
  return roundedValue;
}

export default round;
