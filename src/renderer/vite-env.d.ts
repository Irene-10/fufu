/// <reference types="vite/client" />

import type { FufuApi } from "../preload";

declare global {
  interface Window {
    fufu: FufuApi;
  }
}
