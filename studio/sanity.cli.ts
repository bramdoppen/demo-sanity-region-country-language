/**
 * Sanity CLI Configuration
 * This file configures the Sanity CLI tool with project-specific settings
 * and customizes the Vite bundler configuration.
 * Learn more: https://www.sanity.io/docs/cli
 */

import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || '69zhjgro'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineCliConfig({
  api: {
    projectId,
    dataset,
    orgId: 'oWG141ewT',
  },
  studioHost: process.env.SANITY_STUDIO_STUDIO_HOST || '',
  deployment: {
    autoUpdates: true,
    appId: 'avtnqu9fh9t7khvdpe9jjhg1',
  },
  schemaExtraction: {},
  typegen: {
    path: './src/**/*.{ts,tsx,js,jsx}',
    schema: '../sanity.schema.json',
    generates: './sanity.types.ts',
    overloadClientMethods: true,
  },
})
