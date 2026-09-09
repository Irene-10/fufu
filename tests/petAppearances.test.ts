import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  getCustomPetAssetDefinition,
  getPetAssetDefinition,
  hasRequiredCustomPetAssets,
  petAppearanceOptions,
  resolvePetAppearanceId
} from "../src/shared/petAppearances";
import type { CustomPetAppearance, PetAppearanceId, PetState } from "../src/shared/types";

const petStates: PetState[] = [
  "idle",
  "sitting",
  "happy",
  "breakPrompt",
  "breakRunning",
  "breakDone",
  "hydrationPrompt",
  "drinking",
  "hydrationDone",
  "focusGuard",
  "focusAlert",
  "focusDone",
  "sad",
  "sleeping"
];

function pathsFor(appearanceId: PetAppearanceId, state: PetState): string[] {
  const asset = getPetAssetDefinition(appearanceId, state);
  return Array.isArray(asset.path) ? asset.path : [asset.path];
}

export const tests = [
  {
    name: "petAppearanceOptions includes Xiao Ji Mao",
    run(): void {
      assert.equal(
        petAppearanceOptions("zh-CN").some((option) => option.value === "xiaoJiMao"),
        true
      );
      assert.equal(
        petAppearanceOptions("en").some((option) => option.value === "xiaoJiMao"),
        true
      );
    }
  },
  {
    name: "resolvePetAppearanceId accepts Xiao Ji Mao",
    run(): void {
      assert.equal(resolvePetAppearanceId("xiaoJiMao"), "xiaoJiMao");
    }
  },
  {
    name: "custom pet assets require idle and fall back to idle for missing states",
    run(): void {
      const custom: CustomPetAppearance = {
        name: "Custom",
        assets: {
          idle: {
            relativePath: "custom_pet_assets/idle/idle.gif",
            originalName: "idle.gif",
            updatedAt: 1
          }
        }
      };

      assert.equal(hasRequiredCustomPetAssets(custom), true);
      assert.deepEqual(getCustomPetAssetDefinition(custom, "focusAlert"), {
        path: "custom_pet_assets/idle/idle.gif",
        isPlaceholder: true
      });
    }
  },
  {
    name: "Xiao Ji Mao asset paths exist for all pet states",
    run(): void {
      for (const state of petStates) {
        for (const path of pathsFor("xiaoJiMao", state)) {
          assert.equal(existsSync(resolve(process.cwd(), path)), true, path);
        }
      }
    }
  }
];
