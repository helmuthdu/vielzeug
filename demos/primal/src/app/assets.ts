/** Resolves a `/public` path against the deployment base so assets work under `/demos/primal/`. */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
