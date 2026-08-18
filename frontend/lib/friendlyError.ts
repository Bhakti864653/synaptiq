export function friendlyErrorMessage(e: unknown): string {
  if (e instanceof TypeError && e.message === "Failed to fetch") {
    return "Couldn't reach the server. It may be waking up from being idle — try again in a few seconds.";
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return "Something went wrong. Please try again.";
}
