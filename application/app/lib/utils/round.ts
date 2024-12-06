function round(value: number, decimals: number): number {
  if (decimals < 0) {
    throw new Error('Rounded decimals have to be greater than or equal to 0.');
  }

  const factor = Math.pow(10, decimals);
  const roundedValue = Math.round(value * factor) / factor;
  return roundedValue;
}

export default round;
