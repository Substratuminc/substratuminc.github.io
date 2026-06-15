// src/engine/AchievementChecker.ts

import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS } from '../store/achievements';
import { eventBus } from './EventBus';

/**
 * Checks all lock states of achievements and unlocks those whose conditions are met.
 * Also broadcasts a notification for each newly unlocked achievement.
 */
export function checkAchievements(): void {
  const state = useGameStore.getState();
  const unlocked = [...state.unlockedAchievements];
  let updated = false;

  for (const ach of ACHIEVEMENTS) {
    if (!unlocked.includes(ach.id)) {
      try {
        if (ach.unlockCondition(state)) {
          unlocked.push(ach.id);
          updated = true;
          
          // Emit notification
          eventBus.emit('notification', {
            message: `[${ach.icon}] ${ach.title}: ${ach.description}`,
            type: 'achievement',
          });
        }
      } catch (err) {
        console.error(`Error checking achievement condition for ${ach.id}:`, err);
      }
    }
  }

  if (updated) {
    useGameStore.setState({ unlockedAchievements: unlocked });
  }
}

/**
 * Force-unlocks a specific achievement by ID programmatically (e.g. for events/combat).
 */
export function unlockAchievement(id: string): void {
  const state = useGameStore.getState();
  const unlocked = [...state.unlockedAchievements];
  
  if (!unlocked.includes(id)) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
      unlocked.push(id);
      useGameStore.setState({ unlockedAchievements: unlocked });
      
      eventBus.emit('notification', {
        message: `[${ach.icon}] ${ach.title}: ${ach.description}`,
        type: 'achievement',
      });
    }
  }
}
