import {defineBlueprint, defineRobotToken, defineScheduledFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineRobotToken({
      name: 'paxon-questions',
      label: 'Paxon: questions from Insights',
      memberships: [{resourceType: 'project', resourceId: 'jitb27qd', roleNames: ['editor']}],
    }),
    // Classifies help-chat conversations and turns content gaps into customer questions.
    // SANITY_ORGANIZATION_TOKEN and OPENROUTER_API_KEY are added with `sanity functions env add`.
    defineScheduledFunction({
      name: 'classify-conversations',
      event: {expression: '0 * * * *'},
      timezone: 'Europe/Brussels',
      timeout: 300,
      robotToken: '$.resources.paxon-questions.token',
      env: {
        SANITY_ORGANIZATION_ID: 'objVdfY4N',
        SANITY_PROJECT_ID: 'jitb27qd',
        SANITY_DATASET: 'production',
      },
    }),
  ],
})
