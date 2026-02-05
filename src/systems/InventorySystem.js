/**
 * Inventory System
 * 
 * Manages a slot-based inventory with stacking support.
 * Emits events for UI synchronization.
 */

import { getItem, itemExists } from '../data/ItemDatabase.js';

export class InventorySystem {
  /**
   * @param {Phaser.Scene} scene - The scene this system belongs to
   * @param {Object} config - Configuration options
   */
  constructor(scene, config = {}) {
    this.scene = scene;
    
    // Configuration
    this.maxSlots = config.maxSlots || 20;
    
    // Initialize slots (null = empty slot)
    this.slots = new Array(this.maxSlots).fill(null);
    
    // Gold is separate from inventory slots
    this.gold = config.initialGold || 0;
    
    // Sync gold with registry
    try {
      const registryGold = scene.registry.get('gold');
      if (typeof registryGold === 'number') {
        this.gold = registryGold;
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════════════════

  /**
   * Add item to inventory
   * @param {string} itemId - Item ID from ItemDatabase
   * @param {number} quantity - Amount to add (default: 1)
   * @returns {Object} Result with success, added, overflow
   */
  addItem(itemId, quantity = 1) {
    if (!itemExists(itemId) || quantity <= 0) {
      return { success: false, added: 0, overflow: quantity };
    }

    const itemDef = getItem(itemId);
    let remaining = quantity;
    let totalAdded = 0;

    // Phase 1: Try to stack with existing slots
    if (itemDef.stackable) {
      for (let i = 0; i < this.slots.length && remaining > 0; i++) {
        const slot = this.slots[i];
        if (slot && slot.itemId === itemId) {
          const canAdd = itemDef.maxStack - slot.quantity;
          const toAdd = Math.min(canAdd, remaining);
          if (toAdd > 0) {
            slot.quantity += toAdd;
            remaining -= toAdd;
            totalAdded += toAdd;
          }
        }
      }
    }

    // Phase 2: Fill empty slots
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (this.slots[i] === null) {
        const toAdd = itemDef.stackable 
          ? Math.min(itemDef.maxStack, remaining) 
          : 1;
        
        this.slots[i] = {
          itemId: itemId,
          quantity: toAdd
        };
        
        remaining -= toAdd;
        totalAdded += toAdd;
        
        // Non-stackable items take one slot per item
        if (!itemDef.stackable && remaining > 0) {
          continue;
        }
      }
    }

    // Emit event for UI
    this.emitChange();

    return {
      success: totalAdded > 0,
      added: totalAdded,
      overflow: remaining
    };
  }

  /**
   * Remove item from inventory
   * @param {string} itemId - Item ID to remove
   * @param {number} quantity - Amount to remove
   * @returns {Object} Result with success, removed
   */
  removeItem(itemId, quantity = 1) {
    if (!itemExists(itemId) || quantity <= 0) {
      return { success: false, removed: 0 };
    }

    let remaining = quantity;
    let totalRemoved = 0;

    // Remove from slots (prefer partial stacks first)
    const sortedIndices = this.slots
      .map((slot, index) => ({ slot, index }))
      .filter(s => s.slot && s.slot.itemId === itemId)
      .sort((a, b) => a.slot.quantity - b.slot.quantity);

    for (const { slot, index } of sortedIndices) {
      if (remaining <= 0) break;
      
      const toRemove = Math.min(slot.quantity, remaining);
      slot.quantity -= toRemove;
      remaining -= toRemove;
      totalRemoved += toRemove;
      
      // Clear empty slots
      if (slot.quantity <= 0) {
        this.slots[index] = null;
      }
    }

    this.emitChange();

    return {
      success: totalRemoved >= quantity,
      removed: totalRemoved
    };
  }

  /**
   * Remove item from specific slot
   * @param {number} slotIndex 
   * @param {number} quantity 
   */
  removeFromSlot(slotIndex, quantity = 1) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) return false;
    
    const slot = this.slots[slotIndex];
    if (!slot) return false;

    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      this.slots[slotIndex] = null;
    }

    this.emitChange();
    return true;
  }

  /**
   * Move item between slots (or swap)
   * @param {number} fromIndex 
   * @param {number} toIndex 
   */
  moveSlot(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.maxSlots) return false;
    if (toIndex < 0 || toIndex >= this.maxSlots) return false;
    if (fromIndex === toIndex) return false;

    const fromSlot = this.slots[fromIndex];
    const toSlot = this.slots[toIndex];

    // If destination is empty, simple move
    if (!toSlot) {
      this.slots[toIndex] = fromSlot;
      this.slots[fromIndex] = null;
      this.emitChange();
      return true;
    }

    // If same item and stackable, try to merge
    if (fromSlot && toSlot && fromSlot.itemId === toSlot.itemId) {
      const itemDef = getItem(fromSlot.itemId);
      if (itemDef && itemDef.stackable) {
        const canAdd = itemDef.maxStack - toSlot.quantity;
        const toMove = Math.min(canAdd, fromSlot.quantity);
        
        if (toMove > 0) {
          toSlot.quantity += toMove;
          fromSlot.quantity -= toMove;
          
          if (fromSlot.quantity <= 0) {
            this.slots[fromIndex] = null;
          }
          
          this.emitChange();
          return true;
        }
      }
    }

    // Otherwise swap
    this.slots[fromIndex] = toSlot;
    this.slots[toIndex] = fromSlot;
    this.emitChange();
    return true;
  }

  /**
   * Split stack into another slot
   * @param {number} slotIndex 
   * @param {number} splitAmount 
   * @param {number} targetSlot - Optional specific target slot
   */
  splitStack(slotIndex, splitAmount, targetSlot = null) {
    const slot = this.slots[slotIndex];
    if (!slot || splitAmount <= 0 || splitAmount >= slot.quantity) {
      return false;
    }

    // Find empty slot if not specified
    let emptyIndex = targetSlot;
    if (emptyIndex === null) {
      emptyIndex = this.slots.findIndex(s => s === null);
    }
    
    if (emptyIndex === -1 || emptyIndex >= this.maxSlots) {
      return false;
    }

    // Create new stack
    this.slots[emptyIndex] = {
      itemId: slot.itemId,
      quantity: splitAmount
    };
    
    slot.quantity -= splitAmount;
    
    this.emitChange();
    return true;
  }

  // ═══════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════

  /**
   * Get slot data at index
   * @param {number} index 
   * @returns {Object|null}
   */
  getSlot(index) {
    if (index < 0 || index >= this.maxSlots) return null;
    return this.slots[index];
  }

  /**
   * Get slot with full item data
   * @param {number} index 
   * @returns {Object|null}
   */
  getSlotWithItem(index) {
    const slot = this.getSlot(index);
    if (!slot) return null;
    
    return {
      ...slot,
      item: getItem(slot.itemId)
    };
  }

  /**
   * Count total quantity of an item across all slots
   * @param {string} itemId 
   * @returns {number}
   */
  countItem(itemId) {
    return this.slots.reduce((total, slot) => {
      if (slot && slot.itemId === itemId) {
        return total + slot.quantity;
      }
      return total;
    }, 0);
  }

  /**
   * Check if inventory has at least X of an item
   * @param {string} itemId 
   * @param {number} quantity 
   */
  hasItem(itemId, quantity = 1) {
    return this.countItem(itemId) >= quantity;
  }

  /**
   * Get number of empty slots
   */
  getEmptySlotCount() {
    return this.slots.filter(s => s === null).length;
  }

  /**
   * Check if inventory is full
   */
  isFull() {
    return this.getEmptySlotCount() === 0;
  }

  /**
   * Get all slots as array (for UI iteration)
   */
  getAllSlots() {
    return this.slots.map((slot, index) => ({
      index,
      slot,
      item: slot ? getItem(slot.itemId) : null
    }));
  }

  // ═══════════════════════════════════════════════
  // GOLD MANAGEMENT
  // ═══════════════════════════════════════════════

  addGold(amount) {
    if (amount <= 0) return;
    this.gold += amount;
    this.syncGoldToRegistry();
    this.emitChange();
  }

  removeGold(amount) {
    if (amount <= 0 || amount > this.gold) return false;
    this.gold -= amount;
    this.syncGoldToRegistry();
    this.emitChange();
    return true;
  }

  getGold() {
    return this.gold;
  }

  syncGoldToRegistry() {
    try {
      this.scene.registry.set('gold', this.gold);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════
  // CONSUMPTION
  // ═══════════════════════════════════════════════

  /**
   * Use a consumable item from a specific slot
   * @param {number} slotIndex 
   * @returns {Object|null} Effect applied, or null if failed
   */
  useItem(slotIndex) {
    const slotData = this.getSlotWithItem(slotIndex);
    if (!slotData || !slotData.item) return null;

    const item = slotData.item;
    if (!item.consumable) return null;

    // Apply effect
    const effect = item.effect;
    this.applyEffect(effect);

    // Remove one from slot
    this.removeFromSlot(slotIndex, 1);

    // Emit use event
    try {
      this.scene.registry.events.emit('itemUsed', { 
        item, 
        effect,
        slotIndex 
      });
    } catch (e) {}

    return effect;
  }

  /**
   * Apply item effect
   * @param {Object} effect 
   */
  applyEffect(effect) {
    if (!effect) return;

    try {
      switch (effect.type) {
        case 'heal': {
          const player = this.getPlayer();
          if (player && typeof player.heal === 'function') {
            player.heal(effect.amount);
          } else {
            // Fallback to registry
            const current = this.scene.registry.get('playerHealth') || 0;
            const max = this.scene.registry.get('playerMaxHealth') || 100;
            this.scene.registry.set('playerHealth', Math.min(current + effect.amount, max));
          }
          break;
        }
        case 'stamina': {
          const player = this.getPlayer();
          if (player) {
            player.stamina = Math.min(player.stamina + effect.amount, player.maxStamina);
          }
          break;
        }
        case 'hunger': {
          const current = this.scene.registry.get('hunger') || 0;
          this.scene.registry.set('hunger', Math.min(current + effect.amount, 100));
          break;
        }
        case 'thirst': {
          const current = this.scene.registry.get('thirst') || 0;
          this.scene.registry.set('thirst', Math.min(current + effect.amount, 100));
          break;
        }
      }
    } catch (e) {}
  }

  getPlayer() {
    try {
      const gameScene = this.scene.scene.get('GameScene');
      if (gameScene && gameScene.player) return gameScene.player;
      
      const overworldScene = this.scene.scene.get('OverworldScene');
      if (overworldScene && overworldScene.player) return overworldScene.player;
    } catch (e) {}
    return null;
  }

  // ═══════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════

  /**
   * Export inventory state for saving
   */
  serialize() {
    return {
      slots: this.slots.map(slot => slot ? { ...slot } : null),
      gold: this.gold,
      maxSlots: this.maxSlots
    };
  }

  /**
   * Import inventory state from save
   */
  deserialize(data) {
    if (!data) return;
    
    if (data.slots) {
      this.slots = data.slots.map(slot => slot ? { ...slot } : null);
      // Ensure correct size
      while (this.slots.length < this.maxSlots) {
        this.slots.push(null);
      }
    }
    
    if (typeof data.gold === 'number') {
      this.gold = data.gold;
      this.syncGoldToRegistry();
    }
    
    this.emitChange();
  }

  // ═══════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════

  emitChange() {
    try {
      this.scene.registry.events.emit('inventoryChanged', {
        slots: this.getAllSlots(),
        gold: this.gold,
        emptySlots: this.getEmptySlotCount()
      });
    } catch (e) {}
  }
}

/**
 * Create a global inventory instance accessible across scenes
 */
export function createGlobalInventory(scene, config) {
  const inventory = new InventorySystem(scene, config);
  
  // Store reference in registry for cross-scene access
  scene.registry.set('inventorySystem', inventory);
  
  return inventory;
}

/**
 * Get the global inventory instance
 */
export function getGlobalInventory(scene) {
  return scene.registry.get('inventorySystem');
}
