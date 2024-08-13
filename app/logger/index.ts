import developmentLogger from "./developmentLogger";

let logger = developmentLogger;

if (process.env.NODE_ENV == "development") {
  logger = developmentLogger;
}

export default logger;
