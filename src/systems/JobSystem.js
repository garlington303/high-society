// src/systems/JobSystem.js
import Phaser from 'phaser';
import { JOB_BOARD_JOBS } from '../data/JobDatabase.js';

/**
 * Job System — state machine for the core gameplay loop.
 *
 * States: idle → accepted → traveling → encounter → returning → complete → idle
 */
export class JobSystem {
  constructor(scene) {
    this.scene = scene;

    // Current job lifecycle
    this.activeJob = null;
    this.jobState = 'idle'; // idle | accepted | traveling | encounter | returning
    this.encounterResult = null;

    // History
    this.completedJobIds = [];

    // Sync from registry on construction (supports scene transitions)
    const savedJobId = this.scene.registry.get('activeJobId');
    const savedState = this.scene.registry.get('jobState');
    if (savedJobId && savedState && savedState !== 'idle') {
      this.activeJob = JOB_BOARD_JOBS.find(j => j.id === savedJobId) || null;
      this.jobState = savedState;
    }
  }

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  /** Return all bounty-board jobs. Active job is flagged but still shown. */
  getAvailableJobs() {
    return JOB_BOARD_JOBS.map(job => ({
      ...job,
      isActive: this.activeJob?.id === job.id
    }));
  }

  hasActiveJob() {
    return this.activeJob !== null && this.jobState !== 'idle';
  }

  getActiveJob() {
    return this.activeJob;
  }

  getJobState() {
    return this.jobState;
  }

  // ------------------------------------------------------------------
  // State transitions
  // ------------------------------------------------------------------

  /** Player picks a job from the bounty board. */
  acceptJob(jobId) {
    if (this.hasActiveJob()) return false;

    const job = JOB_BOARD_JOBS.find(j => j.id === jobId);
    if (!job) return false;

    this.activeJob = job;
    this.jobState = 'accepted';
    this.encounterResult = null;
    this._syncRegistry();

    this.scene.events.emit('jobAccepted', job);
    try { this.scene.registry.events.emit('jobAccepted', job); } catch (e) {}

    return true;
  }

  /** Player leaves town toward the job destination. */
  beginTravel() {
    if (this.jobState !== 'accepted') return;
    this.jobState = 'traveling';
    this._syncRegistry();
  }

  /** Called by EncounterScene when the encounter resolves.
   *  @param {object} result  { success, rewards: {gold,xp,fame,infamy}, fled }
   */
  onEncounterComplete(result) {
    this.encounterResult = result;
    this.jobState = 'returning';
    this._syncRegistry();
  }

  /** Apply rewards / penalties and finish the job. */
  completeJob() {
    if (!this.activeJob) return null;

    const job = this.activeJob;
    const result = this.encounterResult || {};
    const rewards = result.rewards || job.rewards;
    console.log('[JobSystem] completeJob - rewards:', JSON.stringify(rewards));

    // Apply gold
    if (rewards.gold) {
      const cur = this.scene.registry.get('gold') || 0;
      const newGold = cur + rewards.gold;
      console.log(`[JobSystem] Applying gold: ${cur} + ${rewards.gold} = ${newGold}`);
      this.scene.registry.set('gold', newGold);
      try { this.scene.registry.events.emit('goldChanged', { amount: rewards.gold }); } catch (e) {}
    }

    // Apply XP
    if (rewards.xp) {
      const cur = this.scene.registry.get('xp') || 0;
      const newXP = cur + rewards.xp;
      console.log(`[JobSystem] Applying XP: ${cur} + ${rewards.xp} = ${newXP}`);
      this.scene.registry.set('xp', newXP);
      try {
        this.scene.events.emit('xpGained', { amount: rewards.xp });
        this.scene.registry.events.emit('xpGained', { amount: rewards.xp });
      } catch (e) {}
    }

    // Apply fame
    if (rewards.fame && rewards.fame !== 0) {
      console.log(`[JobSystem] Applying fame: ${rewards.fame}`);
      if (this.scene.fameSystem && this.scene.fameSystem.add) {
        console.log('[JobSystem] Using FameSystem.add()');
        this.scene.fameSystem.add(rewards.fame, 'job');
      } else {
        const cur = this.scene.registry.get('fame') || 0;
        const newFame = cur + rewards.fame;
        console.log(`[JobSystem] Fallback: ${cur} + ${rewards.fame} = ${newFame}`);
        this.scene.registry.set('fame', newFame);
      }
    }

    // Apply infamy
    if (rewards.infamy && rewards.infamy !== 0) {
      console.log(`[JobSystem] Applying infamy: ${rewards.infamy}`);
      if (rewards.infamy > 0) {
        if (this.scene.infamySystem && this.scene.infamySystem.add) {
          console.log('[JobSystem] Using InfamySystem.add()');
          this.scene.infamySystem.add(rewards.infamy, 'job');
        } else {
          const cur = this.scene.registry.get('infamy') || 0;
          const newInfamy = cur + rewards.infamy;
          console.log(`[JobSystem] Fallback: ${cur} + ${rewards.infamy} = ${newInfamy}`);
          this.scene.registry.set('infamy', newInfamy);
        }
      } else {
        // Negative infamy = reduction
        if (this.scene.infamySystem && this.scene.infamySystem.reduce) {
          console.log('[JobSystem] Using InfamySystem.reduce()');
          this.scene.infamySystem.reduce(Math.abs(rewards.infamy));
        } else {
          const cur = this.scene.registry.get('infamy') || 0;
          const newInfamy = Math.max(0, cur + rewards.infamy);
          console.log(`[JobSystem] Fallback reduction: ${cur} + ${rewards.infamy} = ${newInfamy}`);
          this.scene.registry.set('infamy', newInfamy);
        }
      }
    }

    // Track completion
    this.completedJobIds.push(job.id);
    const saved = this.scene.registry.get('completedJobs') || [];
    saved.push(job.id);
    this.scene.registry.set('completedJobs', saved);

    // Emit events
    this.scene.events.emit('jobCompleted', { job, result, rewards });
    try { this.scene.registry.events.emit('jobCompleted', { job, result, rewards }); } catch (e) {}

    // Reset state
    this.activeJob = null;
    this.jobState = 'idle';
    this.encounterResult = null;
    this._syncRegistry();

    // Notify UI
    this._emitUIUpdate();

    return { job, rewards };
  }

  /** Player abandons the active job. */
  abandonJob() {
    if (!this.hasActiveJob()) return;

    const job = this.activeJob;

    // Minor infamy penalty for abandoning
    const penalty = 2;
    if (this.scene.infamySystem && this.scene.infamySystem.add) {
      this.scene.infamySystem.add(penalty, 'abandon');
    } else {
      const cur = this.scene.registry.get('infamy') || 0;
      this.scene.registry.set('infamy', cur + penalty);
    }

    this.activeJob = null;
    this.jobState = 'idle';
    this.encounterResult = null;
    this._syncRegistry();

    this.scene.events.emit('jobAbandoned', job);
    this._emitUIUpdate();
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  _syncRegistry() {
    this.scene.registry.set('activeJobId', this.activeJob?.id || null);
    this.scene.registry.set('jobState', this.jobState);
  }

  _emitUIUpdate() {
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene) {
      uiScene.events.emit('updateJobUI', this.activeJob, this.jobState);
    }
  }
}
