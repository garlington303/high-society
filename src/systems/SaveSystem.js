/**
 * Simple SaveSystem using localStorage to persist selected registry keys.
 */
export const SAVE_KEY = 'highsociety_save_v1';

export function saveGame(scene) {
  try {
    const data = {
      gold: scene.registry.get('gold'),
      playerXP: scene.registry.get('playerXP') || scene.registry.get('xp'),
      playerLevel: scene.registry.get('playerLevel') || scene.registry.get('level'),
      townRelations: scene.registry.get('townRelations') || {},
      townInfamy: scene.registry.get('townInfamy') || {},
      townBounties: scene.registry.get('townBounties') || {},
      mainTownId: scene.registry.get('mainTownId') || null,
      mainTownName: scene.registry.get('mainTownName') || null,
      stats: scene.registry.get('stats') || {}
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('SaveSystem: failed to save', e);
    return false;
  }
}

export function loadGame(scene) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Merge into registry
    if (data.gold !== undefined) scene.registry.set('gold', data.gold);
    if (data.playerXP !== undefined) scene.registry.set('playerXP', data.playerXP);
    if (data.playerLevel !== undefined) scene.registry.set('playerLevel', data.playerLevel);
    if (data.playerXP !== undefined) scene.registry.set('xp', data.playerXP);
    if (data.playerLevel !== undefined) scene.registry.set('level', data.playerLevel);
    if (data.townRelations) scene.registry.set('townRelations', data.townRelations);
    if (data.townInfamy) scene.registry.set('townInfamy', data.townInfamy);
    if (data.townBounties) scene.registry.set('townBounties', data.townBounties);
    if (data.mainTownId) scene.registry.set('mainTownId', data.mainTownId);
    if (data.mainTownName) scene.registry.set('mainTownName', data.mainTownName);
    if (data.stats) scene.registry.set('stats', data.stats);
    return data;
  } catch (e) {
    console.warn('SaveSystem: failed to load', e);
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); return true; } catch (e) { return false; }
}
