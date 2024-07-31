import developmentLogger from "./developmentLogger";

let logger = null;

if (process.env.NODE_ENV == "development") {
  logger = developmentLogger;
}

export default logger;