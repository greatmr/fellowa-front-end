/**
 * Creator onboarding (FE-ONB-01). Request shapes are the fields this flow sends
 * of `UpdatePersonalDto` and `UpdateAboutDto`; anything left out is untouched by
 * the backend, so a saved phone number or bio survives.
 */
export type OnboardingNames = {
  firstName: string
  lastName: string
}

export type SocialField = 'instagramLink' | 'youtubeLink' | 'twitterLink'

/** An absolute URL, or `null` to clear the link. */
export type SocialLinks = Record<SocialField, string | null>

export type OnboardingData = OnboardingNames & {
  viewerId: number
  alias: string | null
  links: SocialLinks
}
