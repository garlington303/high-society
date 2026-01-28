// Deprecated shim for ThreeView
// The original 3D overlay was removed. Keep a small shim to avoid
// runtime errors if any leftover imports exist.

export class ThreeView {
  constructor() {
    console.warn('ThreeView is deprecated and has been removed.');
  }
  // No-op API to prevent runtime errors
  show() {}
  hide() {}
  generateCity() {}
  enablePointerLock() {}
  update() {}
  destroy() {}
}

    // Scene & camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Camera smoothing/lag configuration
    this.cameraTarget = new THREE.Vector3();
    this.cameraLerp = 0.12; // base lerp factor per ~16ms frame
    this.cameraLagFactor = 0.35; // how far ahead to look based on player velocity (in Three units)
    this.cameraShake = { amp: 0, time: 0 };

    // Basic lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 2, 1);
    this.scene.add(dir);

    // We'll generate ground/buildings from the CityGenerator when available
    this.generated = false;
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    // Placeholder player mesh
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x22aa22 });
    const playerGeo = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.position.y = 0.8; // half height so it sits on ground
    this.scene.add(this.playerMesh);

    // Vehicle meshes group and cache
    this.vehicleGroup = new THREE.Group();
    this.scene.add(this.vehicleGroup);
    this.vehicleMeshes = new Map(); // spriteId -> THREE.Mesh

    // Shared vehicle materials
    this.vehicleMaterials = {
      civilian: new THREE.MeshStandardMaterial({ color: 0x3498db }),
      police: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x0000ff, emissiveIntensity: 0.2 })
    };

    // NPC meshes group and cache
    this.npcGroup = new THREE.Group();
    this.scene.add(this.npcGroup);
    this.npcMeshes = new Map(); // spriteId -> THREE.Mesh

    // Shared NPC materials
    this.npcMaterials = {
      civilian: [
        new THREE.MeshStandardMaterial({ color: 0x3498db }), // blue
        new THREE.MeshStandardMaterial({ color: 0x2ecc71 }), // green
        new THREE.MeshStandardMaterial({ color: 0xe74c3c }), // red
        new THREE.MeshStandardMaterial({ color: 0x9b59b6 }), // purple
        new THREE.MeshStandardMaterial({ color: 0xf39c12 })  // orange
      ],
      police: new THREE.MeshStandardMaterial({ color: 0x2c3e50, emissive: 0x0000aa, emissiveIntensity: 0.1 }),
      policeAlert: new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0xff0000, emissiveIntensity: 0.3 }),
      dealer: new THREE.MeshStandardMaterial({ color: 0x8e44ad, emissive: 0x6c3483, emissiveIntensity: 0.2 }),
      customer: new THREE.MeshStandardMaterial({ color: 0xf39c12 }),
      customerServed: new THREE.MeshStandardMaterial({ color: 0x27ae60 })
    };

    // Shared NPC geometries
    this.npcGeometries = {
      body: new THREE.CapsuleGeometry(0.25, 0.8, 4, 8), // radius, length
      head: new THREE.SphereGeometry(0.2, 8, 8)
    };

    // Resize handling
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // Build a simple 3D representation of the city using the CityGenerator grid
  generateCity() {
    if (this.generated) return;
    const cg = this.phaserScene.cityGenerator;
    if (!cg || !cg.grid) return;

    const grid = cg.grid;
    const TILE_SIZE = 16; // pixels per tile; we scale to Three units

    // Materials
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x7f7f7f });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x8b6b4b });
    const alleyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const halfWidth = (cg.width * TILE_SIZE * this.scaleFactor) / 2;
    const halfHeight = (cg.height * TILE_SIZE * this.scaleFactor) / 2;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const tile = grid[y][x];
        const worldX = (x * TILE_SIZE + TILE_SIZE / 2) * this.scaleFactor - halfWidth;
        const worldZ = (y * TILE_SIZE + TILE_SIZE / 2) * this.scaleFactor - halfHeight;

        if (tile === 'road' || tile === 'road_h' || tile === 'road_v' || tile === 'road_cross') {
          const geo = new THREE.PlaneGeometry(this.scaleFactor * TILE_SIZE, this.scaleFactor * TILE_SIZE);
          const m = new THREE.Mesh(geo, roadMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(worldX, 0.001, worldZ);
          this.cityGroup.add(m);
        } else if (tile === 'sidewalk') {
          const geo = new THREE.PlaneGeometry(this.scaleFactor * TILE_SIZE, this.scaleFactor * TILE_SIZE);
          const m = new THREE.Mesh(geo, sidewalkMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(worldX, 0.002, worldZ);
          this.cityGroup.add(m);
        } else if (tile === 'grass') {
          const geo = new THREE.PlaneGeometry(this.scaleFactor * TILE_SIZE, this.scaleFactor * TILE_SIZE);
          const m = new THREE.Mesh(geo, grassMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(worldX, 0.001, worldZ);
          this.cityGroup.add(m);
        } else if (tile === 'alley' || tile === 'stash' || tile === 'safehouse') {
          const geo = new THREE.PlaneGeometry(this.scaleFactor * TILE_SIZE, this.scaleFactor * TILE_SIZE);
          const m = new THREE.Mesh(geo, alleyMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(worldX, 0.001, worldZ);
          this.cityGroup.add(m);
        } else if (tile === 'building') {
          // Random building height between 2 and 8 units
          const height = (2 + (x + y) % 6) * 0.6;
          const geo = new THREE.BoxGeometry(this.scaleFactor * TILE_SIZE * 0.9, height, this.scaleFactor * TILE_SIZE * 0.9);
          const m = new THREE.Mesh(geo, buildingMat);
          m.position.set(worldX, height / 2, worldZ);
          this.cityGroup.add(m);
        }
      }
    }

    this.generated = true;
  }

  // Pointer-lock and simple mouse-look for first-person
  enablePointerLock() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    this.yaw = 0;
    this.pitch = 0;
    this.pointerLocked = false;
    this.lookSensitivity = 0.0025;

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch -= e.movementY * this.lookSensitivity;
      const limit = Math.PI / 2 - 0.1;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });
    // WASD movement state
    this.moveState = { forward: false, back: false, left: false, right: false };
    this.movementSpeed = 120; // pixels per second (Phaser pixels)

    const onKey = (e, down) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.moveState.forward = down;
      if (code === 'KeyS' || code === 'ArrowDown') this.moveState.back = down;
      // Invert A/D strafing to match desired orientation
      if (code === 'KeyA' || code === 'ArrowLeft') this.moveState.right = down;
      if (code === 'KeyD' || code === 'ArrowRight') this.moveState.left = down;
    };

    document.addEventListener('keydown', (e) => onKey(e, true));
    document.addEventListener('keyup', (e) => onKey(e, false));
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // Show the overlay
  show() {
    this.enabled = true;
    this.renderer.domElement.style.display = 'block';
    // allow pointer events when in first-person (optional)
    this.renderer.domElement.style.pointerEvents = 'auto';
    // make sure background is opaque so Phaser doesn't show through
    try {
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.domElement.style.backgroundColor = '#000';
    } catch (e) {}
    // generate city geometry if not done
    this.generateCity();
    // ensure pointer lock controls are wired
    if (!this.pointerLockSetup) {
      this.enablePointerLock();
      this.pointerLockSetup = true;
    }
  }

  hide() {
    this.enabled = false;
    this.renderer.domElement.style.display = 'none';
    this.renderer.domElement.style.pointerEvents = 'none';
  }

  // Convert Phaser pixel coordinates to Three world units
  phaserToThree(x, y) {
    // Phaser origin top-left, Three uses X (right), Z (forward), Y up
    const tx = (x - this.phaserScene.worldWidth / 2) * this.scaleFactor;
    const tz = (y - this.phaserScene.worldHeight / 2) * this.scaleFactor;
    return { x: tx, z: tz };
  }

  update(delta) {
    if (!this.enabled) return;
    const player = this.phaserScene.player;
    if (!player || !player.sprite) return;

    // Map Phaser player position to Three coordinates
    const px = player.sprite.x;
    const py = player.sprite.y;
    const threePos = this.phaserToThree(px, py);

    // Update player mesh position
    this.playerMesh.position.x = threePos.x;
    this.playerMesh.position.z = threePos.z;

    // Position camera at player's eye height
    const eyeHeight = 0.9;
    // If pointer-lock active, use yaw/pitch for camera orientation
    // Smooth camera follow with slight lag based on player velocity
    {
      const px = this.playerMesh.position.x;
      const pz = this.playerMesh.position.z;

      // Read Phaser velocity (safe access)
      let vx = 0;
      let vy = 0;
      try {
        if (player.sprite && player.sprite.body && player.sprite.body.velocity) {
          vx = player.sprite.body.velocity.x || 0;
          vy = player.sprite.body.velocity.y || 0;
        }
      } catch (e) {}

      // Convert Phaser pixels velocity to Three units and apply lag factor
      const aheadX = vx * this.scaleFactor * this.cameraLagFactor;
      const aheadZ = vy * this.scaleFactor * this.cameraLagFactor;

      // Desired camera target (slightly ahead in movement direction)
      const desiredX = px + aheadX;
      const desiredY = eyeHeight;
      const desiredZ = pz + aheadZ + 0.05; // small offset so camera isn't exactly centered
      this.cameraTarget.set(desiredX, desiredY, desiredZ);

      // Compute lerp alpha based on delta (delta is likely ms from Phaser)
      const frame = Math.max(1, delta || 16);
      const alpha = Math.min(1, this.cameraLerp * (frame / 16));

      // Lerp camera position towards target
      this.camera.position.lerp(this.cameraTarget, alpha);

      // Compute look target (slightly forward of player)
      const lookAt = new THREE.Vector3(px + aheadX, desiredY, pz + aheadZ + 0.2);
      this.camera.lookAt(lookAt);
    }

    // Sync vehicles from Phaser to Three.js
    this.syncVehicles();

    // Sync NPCs from Phaser to Three.js
    this.syncNPCs();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Apply WASD movement to Phaser player while pointer-locked
    if (this.pointerLocked && player && player.sprite) {
      // Build forward/right vectors in Phaser pixel space
      // forward in three: (fx, fz) where fx = sin(yaw), fz = cos(yaw)
      const yaw = this.yaw || 0;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      // Right vector is perpendicular
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);

      let mvx = 0;
      let mvy = 0;
      if (this.moveState.forward) {
        mvx += fx;
        mvy += fz;
      }
      if (this.moveState.back) {
        mvx -= fx;
        mvy -= fz;
      }
      if (this.moveState.left) {
        mvx -= rx;
        mvy -= rz;
      }
      if (this.moveState.right) {
        mvx += rx;
        mvy += rz;
      }

      // Normalize
      const len = Math.hypot(mvx, mvy) || 1;
      mvx = (mvx / len) * this.movementSpeed;
      mvy = (mvy / len) * this.movementSpeed;

      // Phaser y axis is downwards; our fz corresponds to Phaser y, so set velocities directly
      player.sprite.setVelocity(mvx, mvy);
    }
  }

  // Sync vehicle positions/rotations from Phaser world to Three.js
  syncVehicles() {
    const vehicles = this.phaserScene.vehicles;
    if (!vehicles) return;

    const activeIds = new Set();

    vehicles.getChildren().forEach((sprite) => {
      if (!sprite || !sprite.active) return;
      const id = sprite.getData('__threeId') || `v_${Math.random().toString(36).slice(2,9)}`;
      sprite.setData('__threeId', id);
      activeIds.add(id);

      let mesh = this.vehicleMeshes.get(id);
      if (!mesh) {
        // Create new vehicle mesh (box representing car)
        const entity = sprite.getData('entity');
        const isPolice = entity && entity.type === 'police';
        const mat = isPolice ? this.vehicleMaterials.police : this.vehicleMaterials.civilian;
        const geo = new THREE.BoxGeometry(0.8, 0.5, 1.4); // width, height, length
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.25; // half height
        this.vehicleGroup.add(mesh);
        this.vehicleMeshes.set(id, mesh);
      }

      // Update position
      const pos = this.phaserToThree(sprite.x, sprite.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;

      // Update rotation based on direction
      const entity = sprite.getData('entity');
      const dir = entity ? entity.direction : 'down';
      switch (dir) {
        case 'up': mesh.rotation.y = Math.PI; break;
        case 'down': mesh.rotation.y = 0; break;
        case 'left': mesh.rotation.y = Math.PI / 2; break;
        case 'right': mesh.rotation.y = -Math.PI / 2; break;
        default: mesh.rotation.y = 0; break;
      }
    });

    // Remove meshes for vehicles that no longer exist
    for (const [id, mesh] of this.vehicleMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.vehicleGroup.remove(mesh);
        mesh.geometry.dispose();
        this.vehicleMeshes.delete(id);
      }
    }
  }

  // Create a simple humanoid mesh (body + head)
  createNPCMesh(material) {
    const group = new THREE.Group();

    // Body (capsule)
    const body = new THREE.Mesh(this.npcGeometries.body, material);
    body.position.y = 0.65; // capsule center
    group.add(body);

    // Head (sphere)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d6ba }); // skin color
    const head = new THREE.Mesh(this.npcGeometries.head, headMat);
    head.position.y = 1.25;
    group.add(head);

    return group;
  }

  // Sync all NPC types from Phaser to Three.js
  syncNPCs() {
    const activeIds = new Set();

    // Sync civilians
    this.syncEntityGroup(
      this.phaserScene.civilians,
      'civilian',
      activeIds,
      (entity) => {
        const variant = entity?.variant || 0;
        return this.npcMaterials.civilian[variant % this.npcMaterials.civilian.length];
      }
    );

    // Sync police
    this.syncEntityGroup(
      this.phaserScene.police,
      'police',
      activeIds,
      (entity) => {
        const isChasing = entity?.isChasing || false;
        return isChasing ? this.npcMaterials.policeAlert : this.npcMaterials.police;
      }
    );

    // Sync dealers
    this.syncEntityGroup(
      this.phaserScene.dealers,
      'dealer',
      activeIds,
      () => this.npcMaterials.dealer
    );

    // Sync customers
    this.syncEntityGroup(
      this.phaserScene.customers,
      'customer',
      activeIds,
      (entity) => {
        const served = entity?.served || false;
        return served ? this.npcMaterials.customerServed : this.npcMaterials.customer;
      }
    );

    // Remove meshes for NPCs that no longer exist
    for (const [id, mesh] of this.npcMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.npcGroup.remove(mesh);
        // Dispose children geometries if any
        mesh.traverse((child) => {
          if (child.geometry && child.geometry !== this.npcGeometries.body && child.geometry !== this.npcGeometries.head) {
            child.geometry.dispose();
          }
        });
        this.npcMeshes.delete(id);
      }
    }
  }

  // Helper to sync a group of entities
  syncEntityGroup(group, type, activeIds, getMaterial) {
    if (!group) return;

    group.getChildren().forEach((sprite) => {
      if (!sprite || !sprite.active) return;

      const id = sprite.getData('__threeId') || `${type}_${Math.random().toString(36).slice(2, 9)}`;
      sprite.setData('__threeId', id);
      activeIds.add(id);

      const entity = sprite.getData('entity');
      let mesh = this.npcMeshes.get(id);

      if (!mesh) {
        // Create new NPC mesh
        const material = getMaterial(entity);
        mesh = this.createNPCMesh(material);
        this.npcGroup.add(mesh);
        this.npcMeshes.set(id, mesh);
      } else {
        // Update material if entity state changed (e.g., police chasing)
        const material = getMaterial(entity);
        const body = mesh.children[0];
        if (body && body.material !== material) {
          body.material = material;
        }
      }

      // Update position
      const pos = this.phaserToThree(sprite.x, sprite.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;

      // Update rotation based on direction
      const dir = entity?.direction || 'down';
      switch (dir) {
        case 'up': mesh.rotation.y = Math.PI; break;
        case 'down': mesh.rotation.y = 0; break;
        case 'left': mesh.rotation.y = Math.PI / 2; break;
        case 'right': mesh.rotation.y = -Math.PI / 2; break;
        default: mesh.rotation.y = 0; break;
      }
    });
  }

  destroy() {
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}
