/**
 * Fame System - Positive reputation mechanic
 * Tracks player's fame (renown) and emits events for UI updates.
 */
export class FameSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // --- Town-scoped fame (per-town reputation) ---
  getTownFame(townId) {
    const towns = this.scene.registry.get('townRelations') || {};
    return towns[townId] || 0;
  }

  setTownFame(townId, value) {
    const towns = this.scene.registry.get('townRelations') || {};
    towns[townId] = Math.max(0, Math.min(this.scene.registry.get('maxFame') || 100, value));
    this.scene.registry.set('townRelations', towns);
    this.scene.events.emit('townRelationChanged', { townId, value: towns[townId] });
  }

  addTownFame(townId, amount, source) {
    const cur = this.getTownFame(townId);
    this.setTownFame(townId, cur + amount);
    this.scene.events.emit('fameChanged', { fame: this.scene.registry.get('fame'), change: amount, source, townId });
  }

  add(amount, source) {
    const current = this.scene.registry.get('fame') || 0;
    const maxFame = this.scene.registry.get('maxFame') || 100;
    const newFame = Math.min(current + amount, maxFame);
    this.scene.registry.set('fame', newFame);
    // Emit on registry.events so UIScene listeners receive it
    this.scene.registry.events.emit('fameChanged', { fame: newFame, change: amount, source });
  }

  reduce(amount, source = 'decay') {
    const current = this.scene.registry.get('fame') || 0;
    const newFame = Math.max(current - amount, 0);
    this.scene.registry.set('fame', newFame);
    // Emit on registry.events so UIScene listeners receive it
    this.scene.registry.events.emit('fameChanged', { fame: newFame, change: -amount, source });
  }

  getFameLevel() {
    const fame = this.scene.registry.get('fame') || 0;
    if (fame >= 80) return 'legendary';
    if (fame >= 60) return 'renowned';
    if (fame >= 40) return 'respected';
    if (fame >= 20) return 'known';
    return 'unknown';
  }
}
