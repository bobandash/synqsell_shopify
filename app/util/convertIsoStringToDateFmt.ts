// TODO: For some reason, calling this function gives me a process error?
export default function convertIsoStringToDateFmt(isoString: string) {
  try {
    const dateInUTC = new Date(isoString);
    if (isNaN(dateInUTC.getTime())) {
      throw new Error("Invalid date string");
    }
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      month: "long",
      day: "numeric",
    };
    const formattedDate = dateInUTC.toLocaleString("en-US", options);
    console.log("Formatted date:", formattedDate);
    return formattedDate;
  } catch (error) {
    console.error("Error formatting date:", error);
    throw error;
  }
}
