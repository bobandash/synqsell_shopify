function convertObjectValuesToArr(obj: Record<string, any>) {
  let valuesArr = [];
  for (let [, v] of Object.entries(obj)) {
    valuesArr.push(v);
  }
  return valuesArr;
}

export default convertObjectValuesToArr;
