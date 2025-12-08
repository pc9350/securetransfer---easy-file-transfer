/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEERJS_HOST: string;
  readonly VITE_PEERJS_PORT: string;
  readonly VITE_PEERJS_SECURE: string;
  readonly VITE_ROOM_CODE_EXPIRY_MINUTES: string;
  readonly VITE_MAX_FILE_SIZE_MB: string;
  readonly VITE_MAX_SESSION_SIZE_MB: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

