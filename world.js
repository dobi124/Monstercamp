// world.js — глобальная карта, локации и квесты

export const WORLD = {
  locations: [
    {
      id: "forest",
      name: "Лес духов",
      unlocked: true, // доступна сразу
      icon: "assets/locations/forest.png",

      quests: [
        {
          id: "forest_1",
          name: "Первая тренировка",
          description: "Сразись с летучей мышью в лесу.",
          enemyId: "void_bat",
          completed: false,
        },
        {
          id: "forest_2",
          name: "Защита леса",
          description: "Победи дикого волка, терроризирующего чащу.",
          enemyId: "forest_wolf",
          completed: false,
        },
        {
          id: "forest_boss",
          name: "Лесной босс",
          description: "Победи главного монстра леса.",
          enemyId: "forest_boss",
          completed: false,

          // После победы откроется вулкан
          unlockLocationId: "volcano",
        },
      ],
    },

    {
      id: "volcano",
      name: "Огненная гора",
      unlocked: false, // откроется после forest_boss
      icon: "assets/locations/volcano.png",

      quests: [
        {
          id: "volcano_1",
          name: "Огненный вызов",
          description: "Сразись с огненной ящерицей.",
          enemyId: "volcano_lizard",
          completed: false,
        },
        {
          id: "volcano_boss",
          name: "Огненный титан",
          description: "Победи древнего огненного голема.",
          enemyId: "fire_golem",
          completed: false,

          unlockLocationId: "ice_peak",
        },
      ],
    },

    {
      id: "ice_peak",
      name: "Ледяной пик",
      unlocked: false,
      icon: "assets/locations/ice_peak.png",

      quests: [
        {
          id: "ice_1",
          name: "Холодные духи",
          description: "Уничтожь ледяных призраков.",
          enemyId: "ice_ghost",
          completed: false,
        },
        {
          id: "ice_boss",
          name: "Ледяной владыка",
          description: "Сразись с хозяином ледяной вершины.",
          enemyId: "ice_lord",
          completed: false,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------
// Функции управления миром
// ---------------------------------------------------------

export function getLocations() {
  return WORLD.locations;
}

export function getLocationById(id) {
  return WORLD.locations.find((loc) => loc.id === id) || null;
}

export function getQuest(locationId, questId) {
  const loc = getLocationById(locationId);
  if (!loc) return null;
  return loc.quests.find((q) => q.id === questId) || null;
}

/**
 * Помечает квест выполненным.
 * Если у квеста есть unlockLocationId — новая локация открывается.
 *
 * Возвращает:
 * {
 *   quest,
 *   unlockedLocation
 * }
 */
export function completeQuest(locationId, questId) {
  const loc = getLocationById(locationId);
  if (!loc) return { quest: null, unlockedLocation: null };

  const quest = loc.quests.find((q) => q.id === questId);
  if (!quest) return { quest: null, unlockedLocation: null };

  quest.completed = true;

  // Проверяем, надо ли открыть новую локацию
  let unlockedLocation = null;

  if (quest.unlockLocationId) {
    unlockedLocation = getLocationById(quest.unlockLocationId);
    if (unlockedLocation) {
      unlockedLocation.unlocked = true;
    }
  }

  return { quest, unlockedLocation };
}
