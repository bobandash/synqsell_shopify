import fs from 'fs';
import { shopifyApiProject, ApiType } from '@shopify/api-codegen-preset';
import type { IGraphQLConfig } from 'graphql-config';
import { ApiVersion } from '@shopify/shopify-api';

function getConfig() {
  const config: IGraphQLConfig = {
    projects: {
      default: shopifyApiProject({
        apiType: ApiType.Admin,
        apiVersion: ApiVersion.July24,
        documents: ['./app/**/*.{js,ts,jsx,tsx}'],
        outputDir: './app/types',
      }),
    },
  };

  let extensions: string[] = [];
  try {
    extensions = fs.readdirSync('./extensions');
  } catch {
    // ignore if no extensions
  }

  for (const entry of extensions) {
    const extensionPath = `./extensions/${entry}`;
    const schema = `${extensionPath}/schema.graphql`;
    if (!fs.existsSync(schema)) {
      continue;
    }
    config.projects[entry] = {
      schema,
      documents: [`${extensionPath}/**/*.graphql`],
    };
  }

  return config;
}

module.exports = getConfig();
