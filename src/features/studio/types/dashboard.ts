/** The five setup steps of CP-04, in the order the checklist shows them. */
export type SetupStepId =
  'basics' | 'firstTier' | 'firstPost' | 'payout' | 'publish'

/**
 * What the dashboard knows about the signed-in creator, read from the backend
 * on every visit. Nothing here is stored or counted on the client.
 */
export type SetupFacts = {
  /** The claimed username (`alias`); `null` until the account sets one. */
  username: string | null
  hasTier: boolean
  hasPost: boolean
  hasPayoutDetails: boolean
  isPublished: boolean
}

export type SetupStep = {
  id: SetupStepId
  done: boolean
}
