// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
  interface FileWithProgress {
    name: string;
    originalFileName: string;
    size: number;
    type: string;
    progress: number;
    preview?: string;
    videoPreview?: Blob;
    file: File;
  }
  interface photos {
    id?: number;
    name: string;
    photoBlob: Blob;
  }
}

export {};
