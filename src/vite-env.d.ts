/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

interface Window {
  /** Optional override for the Notion publish endpoint (set before app boot). */
  PUBLISH_API_URL_OVERRIDE?: string;
}
