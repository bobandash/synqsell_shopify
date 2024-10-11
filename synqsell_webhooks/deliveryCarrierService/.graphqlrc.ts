import fs from 'fs';
import { LATEST_API_VERSION } from '@shopify/shopify-api';
import { shopifyApiProject, ApiType } from '@shopify/api-codegen-preset';
import type { IGraphQLConfig } from 'graphql-config';

function getConfig() {
    const config: IGraphQLConfig = {
        projects: {
            default: shopifyApiProject({
                apiType: ApiType.Storefront,
                apiVersion: LATEST_API_VERSION,
                documents: ['./graphql/storefront/*.{js,ts,jsx,tsx}'],
                outputDir: './types/storefront',
            }),
            admin: shopifyApiProject({
                apiType: ApiType.Admin,
                apiVersion: LATEST_API_VERSION,
                documents: ['./*.{js,ts,jsx,tsx}'],
                outputDir: './types/admin',
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
