export interface JwtPayload {
  sub: number;
  email: string;
}

export interface OnboardingJwtPayload {
  email: string;
  onboarding: true;
}
