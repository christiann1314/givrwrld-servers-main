// Pterodactyl Configuration Cleanup
// Remove unused environment variables and consolidate configs

// Games with empty environment variables (can be removed)
const gamesWithEmptyEnv = [
  'terraria',
  'ark',
  'factorio',
  'mindustry',
  'rimworld',
  'vintage-story',
  'teeworlds'
]

// Games with minimal env vars (can be simplified)
const gamesWithMinimalEnv = [
  'among-us', // Only has VERSION
  'palworld' // Only has SERVER_NAME, MAX_PLAYERS
]

// Recommended cleanup:
// 1. Remove empty environment objects
// 2. Consolidate duplicate configs
// 3. Move egg IDs to database
// 4. Remove unused Pterodactyl attributes

export const cleanupRecommendations = {
  removeEmptyEnv: gamesWithEmptyEnv,
  simplifyEnv: gamesWithMinimalEnv,
  consolidateConfigs: [
    // These games have identical configs except for eggId
    ['mindustry', 'rimworld', 'vintage-story'] // All use java_17, same startup
  ],
  moveToDatabase: [
    'eggId', // Should be in plans or games table
    'dockerImage', // Can be derived from game type
    'startup' // Can be template-based
  ]
}

