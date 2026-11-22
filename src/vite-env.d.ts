interface ImportMetaEnv {
  readonly VITE_BETTER_AUTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** A picture Vite serves beside the app, its address as a string. */
declare module "*.jpg" {
  const src: string;
  export default src;
}
