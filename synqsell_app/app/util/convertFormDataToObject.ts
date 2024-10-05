function convertFormDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  formData.forEach((value, key) => {
    if (value === 'true' || value === 'false') {
      obj[key] = value === 'true';
    } else if (!isNaN(Number(value))) {
      obj[key] = Number(value);
    } else if (Date.parse(value as string)) {
      obj[key] = new Date(value as string);
    } else if (typeof value === 'string') {
      try {
        obj[key] = JSON.parse(value);
      } catch {
        obj[key] = value;
      }
    } else {
      obj[key] = value;
    }
  });
  return obj;
}

export default convertFormDataToObject;
