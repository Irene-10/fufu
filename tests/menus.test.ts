import assert from "node:assert/strict";
import { i18n } from "../src/shared/i18n";
import { buildApplicationMenuTemplate, buildPetContextMenuTemplate, buildTrayMenuTemplate } from "../src/main/menus";

type Item = Electron.MenuItemConstructorOptions;

export const tests = [
  {
    name: "all menus expose localized summon and follow actions, including when the pet is hidden",
    run(): void {
      for (const language of ["zh-CN", "en"] as const) {
        for (const enabled of [false, true]) {
          let summoned = 0;
          let toggled = 0;
          const noop = (): void => {};
          const actions = {
            toggleDog: noop,
            hideDog: noop,
            summonPet: () => { summoned += 1; },
            toggleFollowCursor: () => { toggled += 1; },
            startFocus: noop,
            stopFocusFromMenu: noop,
            stopFocusFromContext: noop,
            openSettings: noop,
            quit: noop,
            triggerDemo: noop
          };
          const state = {
            appName: "Fufu", dogVisible: false, focusActive: false,
            isPackaged: true, followCursorEnabled: enabled
          };
          const labels = i18n(language).menu;
          const application = buildApplicationMenuTemplate(labels, state, actions);
          const menus = [
            application[0].submenu as Item[],
            buildTrayMenuTemplate(labels, state, actions),
            buildPetContextMenuTemplate(labels, state, actions)
          ];
          for (const menu of menus) {
            const summon = menu.find((item) => item.label === labels.summonPet);
            const follow = menu.find((item) => item.label === labels.followCursor);
            assert.ok(summon?.click);
            assert.ok(follow?.click);
            assert.equal(follow.type, "checkbox");
            assert.equal(follow.checked, enabled);
            assert.notEqual(summon.enabled, false);
            summon.click(undefined as never, undefined as never, undefined as never);
            follow.click(undefined as never, undefined as never, undefined as never);
          }
          assert.equal(summoned, 3);
          assert.equal(toggled, 3);
        }
      }
    }
  }
];
