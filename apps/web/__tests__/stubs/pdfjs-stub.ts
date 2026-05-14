// Stub for pdfjs-dist/legacy/build/pdf.js in test environments.
// The real module is a Node.js-only native module; this stub prevents
// vite:import-analysis from trying to resolve it during unit tests.
export const GlobalWorkerOptions = { workerSrc: '' };
export const OPS = { paintImageXObject: 14 };
export function getDocument() {
  return {
    promise: Promise.resolve({
      numPages: 0,
      getPage: async () => ({
        getOperatorList: async () => ({ fnArray: [], argsArray: [] }),
        objs: { get: (_name: string, cb: (img: null) => void) => cb(null) },
        cleanup: () => {},
      }),
    }),
  };
}
