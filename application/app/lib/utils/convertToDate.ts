function convertToDate(date: string) {
  const parsedDate = new Date(date).toString();
  if (parsedDate === 'Invalid Date') {
    throw new Error('Invalid date format');
  }
  return parsedDate;
}

export default convertToDate;
