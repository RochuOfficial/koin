# Koin - Full Mobile Application Transition Plan

This document outlines the final steps to transform the Koin project from a hybrid web/mobile structure into a standalone, fully mobile application based on React Native and Expo.

## Objective
Consolidate the codebase by making the root directory the primary Expo project, removing the legacy web infrastructure, and ensuring all assets and logic are fully ported to the mobile version.

---

## Phase 1: Pre-Migration Audit

- [x] 1. **Verify Logic Porting**
   - [x] Ensure `src/lib/store.ts` (web) logic is fully captured in `koin-mobile/src/lib/store.ts` (mobile), specifically the XP calculation and goal tracking logic.
   - [x] Confirm that the AI Coach webhook URL and prompt logic are consistent.

- [x] 2. **Asset Inventory**
   - [x] Identify any unique images or icons in `public/` or `src/assets/` that are not yet in `koin-mobile/assets/`.
   - [x] List custom fonts (if any) currently used in the web version to be registered in `koin-mobile/app/_layout.tsx`.

---

## Phase 2: Structural Reorganization
23: 
24: - [x] 1. **Clean Root Directory**
25:    - [x] Delete web-specific configuration files:
26:      - `vite.config.ts`
27:      - `index.html`
28:      - `postcss.config.js`
29:      - `components.json` (shadcn/ui config)
30:    - [x] Delete web-specific source directories:
31:      - `src/` (The original web source)
32:      - `public/` (Web static assets)
33: 
34: - [x] 2. **Move Mobile Project to Root**
35:    - [x] Move all contents of the `koin-mobile/` directory to the root directory.
36:    - [x] Delete the now-empty `koin-mobile/` directory.
37: 
38: - [x] 3. **Update Gitignore**
39:    - [x] Merge the `.gitignore` from `koin-mobile` into the root `.gitignore`.
40:    - [x] Ensure mobile-specific patterns (e.g., `.expo/`, `dist/`, `ios/`, `android/`) are preserved.

---

## Phase 3: Dependency & Configuration Consolidation

- [ ] 1. **Consolidate `package.json`**
   - [ ] Replace the root `package.json` dependencies and scripts with those from `koin-mobile/package.json`.
   - [ ] **Important**: Keep the project name and versioning consistent.
   - [ ] Remove web-only dependencies:
     - `@radix-ui/*`
     - `react-router-dom`
     - `lucide-react` (replaced by `lucide-react-native`)
     - `framer-motion` (replaced by `moti` / `reanimated`)

- [ ] 2. **Update TypeScript Config**
   - [ ] Replace root `tsconfig.json` with the mobile version.
   - [ ] Ensure path aliases (`@/*`) correctly point to the new root-level `src/` directory.

- [ ] 3. **Environment & EAS Config**
   - [ ] Ensure `app.json` and `eas.json` are at the root level for proper Expo Application Services (EAS) integration.

---

## Phase 4: Asset & Styling Finalization

- [ ] 1. **NativeWind Integration**
   - [ ] Ensure `tailwind.config.js` is correctly configured for NativeWind v4 in the root.
   - [ ] Verify that `global.css` is imported in `app/_layout.tsx`.

- [ ] 2. **Iconography**
   - [ ] Standardize on `lucide-react-native` across all components.
   - [ ] Ensure `expo-constants` is used for status bar heights and other native metrics.

---

## Phase 5: Verification & Testing

- [ ] 1. **Local Development**
   - [ ] Run `npm install` (or `bun install`) at the root.
   - [ ] Run `npx expo start` to verify the app launches in the Expo Go app.

- [ ] 2. **Build Validation**
   - [ ] Run `npx expo prebuild` to ensure native directories (`ios`, `android`) can be generated correctly from the root.
   - [ ] Verify that EAS builds still trigger correctly: `eas build --platform ios --local`.

- [ ] 3. **Cleanup**
   - [ ] Remove the `implementations/` directory if no longer needed, or keep it for historical context.
