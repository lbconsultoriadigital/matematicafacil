import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".vercel/**",
    "android/.gradle/**",
    "android/app/build/**",
    "android/app/src/main/assets/**",
    "android/capacitor-cordova-android-plugins/**",
    "android/build/**",
    "next-env.d.ts",
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;
