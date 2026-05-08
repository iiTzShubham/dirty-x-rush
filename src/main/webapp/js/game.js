"use strict";

// Deterministic pseudo-random generator used for reproducible level layouts.
class RNG {
    constructor(seed) {
        this.seed = seed >>> 0;
    }

    next() {
        this.seed = (1664525 * this.seed + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }

    range(min, max) {
        return min + (max - min) * this.next();
    }

    pick(list) {
        return list[Math.floor(this.next() * list.length)];
    }
}

// Creates level metadata, themes, terrain params, obstacle sets, and collectibles.
class LevelManager {
    constructor() {
        this.levels = this.createLevels();
    }

    createLevels() {
        // Level themes are aligned with difficulty progression and background image keys.
        const themes = [
            this.theme("Meadow Sprint", ["#87d5ff", "#deefff"], "#2c8b5a", "#6e4c2b", "#f6ba3d", "forest"),
            this.theme("Canyon Bend", ["#97c6f9", "#f5e4bf"], "#b8733e", "#77542f", "#cc4f34", "canyon"),
            this.theme("Forest Trail", ["#8bc6de", "#d8f4cf"], "#34754e", "#6a5034", "#7aaf46", "forest"),
            this.theme("Dust Storm", ["#9ab0bf", "#e9cda7"], "#8f7449", "#6a5234", "#e9a240", "canyon"),
            this.theme("Ice Ridge", ["#8ebce8", "#d9f0ff"], "#5f7ea2", "#58606a", "#8ad0ef", "forest"),
            this.theme("Quarry Clash", ["#9eb2bd", "#d9ddd6"], "#6a7a7f", "#57524f", "#f1c24a", "canyon"),
            this.theme("Volcano Run", ["#5f677f", "#e9a963"], "#8a3e2f", "#442d2a", "#ff6331", "volcano"),
            this.theme("Night Shift", ["#334056", "#778fba"], "#2f3a55", "#504741", "#acd5ff", "volcano"),
            this.theme("Toxic Swamp", ["#6f9e9a", "#c7d9a7"], "#4e6d3a", "#564835", "#c5f062", "volcano"),
            this.theme("Championship Inferno", ["#4a5574", "#ea9056"], "#7a3c2d", "#4f3327", "#ffa34e", "volcano")
        ];

        const levels = [];
        // Build 10 progressive levels with deterministic generation per level index.
        for (let i = 0; i < 10; i += 1) {
            const index = i + 1;
            const difficulty = index <= 3 ? "Easy" : index <= 6 ? "Intermediate" : index <= 9 ? "Hard" : "Championship";
            const rng = new RNG(4300 + index * 91);
            const length = 4300 + i * 720;
            const terrainConfig = this.createTerrainConfig(i, length, rng);
            const obstacles = this.createObstacles(i, length, terrainConfig, rng);
            const collectibles = this.createCollectibles(i, length, terrainConfig, rng);
            const targetTime = 56 + i * 7;
            levels.push({
                id: index,
                name: themes[i].name,
                difficulty,
                theme: themes[i],
                length,
                finishX: length - 220,
                targetTime,
                terrainConfig,
                obstacles,
                collectibles
            });
        }
        return levels;
    }

    theme(name, sky, mountain, dirt, accent, bgKey) {
        return {
            name,
            skyTop: sky[0],
            skyBottom: sky[1],
            mountain,
            dirt,
            accent,
            bgKey
        };
    }

    createTerrainConfig(levelIndex, length, rng) {
        // Terrain gets steeper/rougher on higher levels.
        const baseY = 495 - Math.min(70, levelIndex * 7);
        const amplitude = 34 + levelIndex * 7;
        const frequency = 0.0038 + levelIndex * 0.0002;
        const detail = 0.009 + levelIndex * 0.0003;
        const gaps = [];
        const gapCount = levelIndex < 2 ? 0 : Math.min(1 + Math.floor(levelIndex / 2), 4);

        for (let i = 0; i < gapCount; i += 1) {
            // Late-game gaps become bridge/lava hazards.
            const x = 1300 + i * (780 + levelIndex * 68) + rng.range(-110, 110);
            const width = 120 + levelIndex * 10 + rng.range(-15, 20);
            const type = levelIndex >= 6 ? (levelIndex >= 8 ? "lava" : "bridge") : "pit";
            gaps.push({ x, width, type });
        }

        const bumps = [];
        const bumpCount = 6 + levelIndex * 2;
        for (let i = 0; i < bumpCount; i += 1) {
            bumps.push({
                x: 420 + i * (420 + levelIndex * 15) + rng.range(-80, 80),
                radius: rng.range(140, 360),
                height: rng.range(16, 60 + levelIndex * 5)
            });
        }

        const mudZones = [];
        if (levelIndex >= 1) {
            for (let i = 0; i < Math.floor(levelIndex / 2) + 1; i += 1) {
                mudZones.push({
                    x: 780 + i * (1000 + levelIndex * 30) + rng.range(-90, 120),
                    width: 180 + rng.range(-20, 50)
                });
            }
        }

        const slipperyZones = [];
        if (levelIndex >= 4) {
            for (let i = 0; i < 1 + Math.floor(levelIndex / 3); i += 1) {
                slipperyZones.push({
                    x: 900 + i * (1150 + levelIndex * 40) + rng.range(-100, 100),
                    width: 220 + rng.range(-15, 45)
                });
            }
        }

        return {
            baseY,
            amplitude,
            frequency,
            detail,
            roughness: 12 + levelIndex * 2,
            gaps,
            bumps,
            mudZones,
            slipperyZones,
            length
        };
    }

    createObstacles(levelIndex, length, terrainConfig, rng) {
        const obstacles = [];
        const obstacleCount = 11 + levelIndex * 2;
        const poolEasy = ["rock", "log"];
        const poolIntermediate = ["rock", "log", "spike", "crate"];
        const poolHard = ["rock", "spike", "crate", "movingSaw"];
        const pool = levelIndex <= 2 ? poolEasy : levelIndex <= 5 ? poolIntermediate : poolHard;

        for (let i = 0; i < obstacleCount; i += 1) {
            const x = 420 + i * (length / (obstacleCount + 1)) + rng.range(-60, 80);
            // Keep spawn positions fair and avoid placing inside pits.
            if (x < 300 || x > length - 450) {
                continue;
            }
            if (Terrain.insideGap(x, terrainConfig.gaps)) {
                continue;
            }
            const type = rng.pick(pool);
            obstacles.push(new Obstacle(type, x, 0, rng, levelIndex));
        }

        return obstacles;
    }

    createCollectibles(levelIndex, length, terrainConfig, rng) {
        const stars = [];
        const count = 8 + levelIndex;
        for (let i = 0; i < count; i += 1) {
            const x = 500 + i * (length / (count + 1)) + rng.range(-50, 95);
            // Stars should never spawn directly in gaps.
            if (Terrain.insideGap(x, terrainConfig.gaps)) {
                continue;
            }
            stars.push({
                x,
                yOffset: 56 + rng.range(-14, 26),
                collected: false
            });
        }
        return stars;
    }

    getLevel(levelNumber) {
        return this.levels[levelNumber - 1];
    }
}

// Runtime terrain evaluator and renderer.
class Terrain {
    constructor(config, canvasHeight) {
        this.config = config;
        this.canvasHeight = canvasHeight;
    }

    static insideGap(x, gaps) {
        for (const gap of gaps) {
            if (x >= gap.x && x <= gap.x + gap.width) {
                return true;
            }
        }
        return false;
    }

    heightAt(x) {
        if (x < 0 || x > this.config.length) {
            return this.canvasHeight - 20;
        }
        if (Terrain.insideGap(x, this.config.gaps)) {
            return null;
        }

        const c = this.config;
        // Base sinusoid + detail wave + local bump fields.
        let y = c.baseY;
        y += Math.sin(x * c.frequency) * c.amplitude;
        y += Math.sin((x + 250) * c.detail) * c.roughness;
        for (const bump of c.bumps) {
            const dx = x - bump.x;
            const influence = Math.max(0, 1 - (dx * dx) / (bump.radius * bump.radius));
            y -= influence * bump.height;
        }
        return Math.max(220, Math.min(this.canvasHeight - 80, y));
    }

    slopeAt(x) {
        const left = this.heightAt(x - 5);
        const right = this.heightAt(x + 5);
        if (left === null || right === null) {
            return 0;
        }
        return Math.atan2(right - left, 10);
    }

    zoneAt(x) {
        // Surfaces affect traction and max speed behavior.
        const inGap = Terrain.insideGap(x, this.config.gaps);
        if (inGap) {
            const gap = this.config.gaps.find((g) => x >= g.x && x <= g.x + g.width);
            return gap ? gap.type : "pit";
        }
        for (const zone of this.config.mudZones) {
            if (x >= zone.x && x <= zone.x + zone.width) {
                return "mud";
            }
        }
        for (const zone of this.config.slipperyZones) {
            if (x >= zone.x && x <= zone.x + zone.width) {
                return "slippery";
            }
        }
        return "normal";
    }

    draw(ctx, cameraX, width, height, theme) {
        const step = 10;
        const startX = Math.max(0, Math.floor(cameraX / step) * step - step);
        const endX = Math.min(this.config.length, cameraX + width + step * 2);
        const segments = [];
        let active = [];

        for (let x = startX; x <= endX; x += step) {
            const y = this.heightAt(x);
            if (y === null) {
                if (active.length > 1) {
                    segments.push(active);
                }
                active = [];
                continue;
            }
            active.push({ x: x - cameraX, y });
        }
        if (active.length > 1) {
            segments.push(active);
        }

        for (const segment of segments) {
            // Fill sub-terrain polygon between track surface and bottom of canvas.
            ctx.beginPath();
            ctx.moveTo(segment[0].x, height);
            for (const p of segment) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.lineTo(segment[segment.length - 1].x, height);
            ctx.closePath();
            ctx.fillStyle = theme.dirt;
            ctx.fill();

            // Surface highlight line to improve separation between ground and sprites.
            ctx.beginPath();
            ctx.moveTo(segment[0].x, segment[0].y);
            for (const p of segment) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = "#2d241a";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Surface shadow line to add depth.
            ctx.beginPath();
            ctx.moveTo(segment[0].x, segment[0].y - 1);
            for (const p of segment) {
                ctx.lineTo(p.x, p.y - 1);
            }
            ctx.strokeStyle = "rgba(233, 186, 122, 0.35)";
            ctx.lineWidth = 7;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(segment[0].x, segment[0].y + 2);
            for (const p of segment) {
                ctx.lineTo(p.x, p.y + 2);
            }
            ctx.strokeStyle = "rgba(42, 30, 20, 0.45)";
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        this.drawGaps(ctx, cameraX, height);
        this.drawZones(ctx, cameraX);
    }

    drawGaps(ctx, cameraX, height) {
        for (const gap of this.config.gaps) {
            const gx = gap.x - cameraX;
            if (gx > 1500 || gx + gap.width < -100) {
                continue;
            }

            if (gap.type === "lava") {
                ctx.fillStyle = "#d94320";
                ctx.fillRect(gx, height - 70, gap.width, 70);
                ctx.fillStyle = "#f4bf45";
                for (let i = 0; i < gap.width; i += 18) {
                    ctx.fillRect(gx + i, height - 72 + (i % 24 === 0 ? -4 : 2), 10, 4);
                }
            } else if (gap.type === "bridge") {
                ctx.fillStyle = "#3b2e24";
                ctx.fillRect(gx, height - 30, gap.width, 30);
                ctx.strokeStyle = "#886f55";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(gx + 15, height - 35);
                ctx.lineTo(gx + 40, height - 12);
                ctx.moveTo(gx + gap.width - 45, height - 35);
                ctx.lineTo(gx + gap.width - 12, height - 10);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#121920";
                ctx.fillRect(gx, height - 65, gap.width, 65);
            }
        }
    }

    drawZones(ctx, cameraX) {
        for (const zone of this.config.mudZones) {
            const x = zone.x - cameraX;
            ctx.fillStyle = "rgba(72, 52, 34, 0.55)";
            ctx.fillRect(x, this.heightAt(zone.x + 2) - 10, zone.width, 12);
        }
        for (const zone of this.config.slipperyZones) {
            const x = zone.x - cameraX;
            ctx.fillStyle = "rgba(132, 211, 232, 0.45)";
            ctx.fillRect(x, this.heightAt(zone.x + 2) - 8, zone.width, 10);
        }
    }
}

// Obstacle model: per-type bounds, movement, and rendering behavior.
class Obstacle {
    constructor(type, x, y, rng, levelIndex) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.radius = 16 + Math.floor(rng.range(0, 10));
        this.width = 34 + Math.floor(rng.range(0, 36));
        this.height = 18 + Math.floor(rng.range(0, 26));
        this.speed = type === "movingSaw" ? 45 + levelIndex * 7 : 0;
        this.range = type === "movingSaw" ? 75 + levelIndex * 12 : 0;
        this.phase = rng.range(0, Math.PI * 2);
        this.spin = 0;
    }

    update(timeSeconds) {
        if (this.type === "movingSaw") {
            this.x = this.baseX + Math.sin(timeSeconds * 1.7 + this.phase) * this.range;
            this.spin = timeSeconds * 5 + this.phase;
        }
    }

    placeOnTerrain(terrain) {
        const ground = terrain.heightAt(this.x);
        if (ground === null) {
            return;
        }
        this.y = ground;
    }

    getBounds() {
        // Bounding boxes are tuned for gameplay rather than full sprite extents.
        if (this.type === "rock" || this.type === "movingSaw") {
            return {
                x: this.x - this.radius,
                y: this.y - this.radius * 2,
                w: this.radius * 2,
                h: this.radius * 2
            };
        }
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            w: this.width,
            h: this.height
        };
    }

    isDangerous() {
        return this.type === "spike" || this.type === "movingSaw";
    }

    draw(ctx, cameraX, spriteMap) {
        const drawX = this.x - cameraX;
        const drawY = this.y;
        const sprite = spriteMap ? spriteMap[this.type] : null;

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            // Use sprite rendering when available; fallback vector drawing otherwise.
            ctx.save();
            if (this.type === "rock") {
                const size = this.radius * 2.4;
                ctx.drawImage(sprite, drawX - size / 2, drawY - size * 0.78, size, size);
            } else if (this.type === "log") {
                const w = this.width * 1.25;
                const h = this.height * 1.3;
                ctx.drawImage(sprite, drawX - w / 2, drawY - h * 0.88, w, h);
            } else if (this.type === "crate") {
                const w = this.width * 1.22;
                const h = this.height * 1.24;
                ctx.drawImage(sprite, drawX - w / 2, drawY - h * 0.9, w, h);
            } else if (this.type === "spike") {
                const w = this.width * 1.2;
                const h = (this.height + 12) * 1.15;
                ctx.drawImage(sprite, drawX - w / 2, drawY - h * 0.9, w, h);
            } else if (this.type === "movingSaw") {
                const size = this.radius * 2.9;
                ctx.translate(drawX, drawY - this.radius - 5);
                ctx.rotate(this.spin);
                ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            }
            ctx.restore();
            return;
        }

        if (this.type === "rock") {
            ctx.fillStyle = "#4f5560";
            ctx.beginPath();
            ctx.arc(drawX, drawY - this.radius, this.radius, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        if (this.type === "log") {
            ctx.fillStyle = "#7a4d2e";
            ctx.fillRect(drawX - this.width / 2, drawY - this.height, this.width, this.height);
            ctx.strokeStyle = "#533219";
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX - this.width / 2, drawY - this.height, this.width, this.height);
            return;
        }
        if (this.type === "crate") {
            ctx.fillStyle = "#9a6a3d";
            ctx.fillRect(drawX - this.width / 2, drawY - this.height, this.width, this.height);
            ctx.strokeStyle = "#5c3a20";
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX - this.width / 2, drawY - this.height, this.width, this.height);
            ctx.beginPath();
            ctx.moveTo(drawX - this.width / 2, drawY - this.height);
            ctx.lineTo(drawX + this.width / 2, drawY);
            ctx.moveTo(drawX + this.width / 2, drawY - this.height);
            ctx.lineTo(drawX - this.width / 2, drawY);
            ctx.stroke();
            return;
        }
        if (this.type === "spike") {
            ctx.fillStyle = "#d14a4a";
            ctx.beginPath();
            ctx.moveTo(drawX - this.width / 2, drawY);
            ctx.lineTo(drawX, drawY - this.height - 10);
            ctx.lineTo(drawX + this.width / 2, drawY);
            ctx.closePath();
            ctx.fill();
            return;
        }
        if (this.type === "movingSaw") {
            ctx.fillStyle = "#9caabd";
            ctx.beginPath();
            ctx.arc(drawX, drawY - this.radius - 5, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#dce6f3";
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i += 1) {
                const angle = (Math.PI * 2 * i) / 8;
                const inner = this.radius - 3;
                const outer = this.radius + 5;
                ctx.beginPath();
                ctx.moveTo(drawX + Math.cos(angle) * inner, drawY - this.radius - 5 + Math.sin(angle) * inner);
                ctx.lineTo(drawX + Math.cos(angle) * outer, drawY - this.radius - 5 + Math.sin(angle) * outer);
                ctx.stroke();
            }
        }
    }
}

// Player bike physics state + rendering.
class Bike {
    constructor(x, y) {
        this.spawnX = x;
        this.spawnY = y;
        this.bodyWidth = 88;
        this.bodyHeight = 36;
        this.reset();
    }

    reset() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.onGround = false;
        this.jumpLock = false;
        this.flipTimer = 0;
    }

    update(dt, input, zoneType) {
        const accel = 540;
        const brake = 620;
        const gravity = 980;
        const maxForward = zoneType === "mud" ? 220 : 340;
        const minReverse = -130;

        if (input.right) {
            this.vx += accel * dt;
        }
        if (input.left) {
            this.vx -= brake * dt;
        }
        if (input.down && this.onGround) {
            this.vx *= 1 - Math.min(0.6, 1.7 * dt);
        }

        // Surface-aware traction.
        const frictionGround = zoneType === "slippery" ? 0.995 : zoneType === "mud" ? 0.94 : 0.975;
        const frictionAir = 0.995;
        const friction = this.onGround ? frictionGround : frictionAir;
        this.vx *= Math.pow(friction, dt * 60);

        this.vx = Math.max(minReverse, Math.min(maxForward, this.vx));

        const jumpPressed = input.up || input.space;
        if (jumpPressed && this.onGround && !this.jumpLock) {
            this.vy = -430;
            this.onGround = false;
            this.jumpLock = true;
        }
        if (!jumpPressed) {
            this.jumpLock = false;
        }

        if (!this.onGround) {
            // Air control influences bike pitch and can cause flips.
            if (input.up) {
                this.angle -= 2.5 * dt;
            }
            if (input.down) {
                this.angle += 2.7 * dt;
            }
            this.angle += this.vx * 0.00008 * dt * 60;
        }

        this.vy += gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x < 20) {
            this.x = 20;
            this.vx = 0;
        }
    }

    applyGround(groundY, slope) {
        const previousVy = this.vy;
        const touching = this.y + this.bodyHeight / 2 >= groundY;
        if (touching) {
            // Snap to surface and blend angle toward terrain slope.
            this.y = groundY - this.bodyHeight / 2;
            this.vy = 0;
            this.onGround = true;
            this.angle += (slope - this.angle) * 0.18;
        } else {
            this.onGround = false;
        }
        return previousVy;
    }

    draw(ctx, cameraX, sprite) {
        const px = this.x - cameraX;
        const py = this.y;

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.translate(px, py + 2);
            ctx.rotate(this.angle);
            const drawW = 132;
            const drawH = 88;
            ctx.drawImage(sprite, -drawW / 2, -drawH * 0.79, drawW, drawH);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(this.angle);

        ctx.fillStyle = "#1f252d";
        ctx.fillRect(-34, -14, 68, 13);
        ctx.fillStyle = "#f58b2a";
        ctx.fillRect(-10, -22, 34, 8);
        ctx.fillStyle = "#2bc4a3";
        ctx.fillRect(-28, -21, 16, 6);
        ctx.fillStyle = "#1a1f26";
        ctx.fillRect(-14, -38, 12, 16);
        ctx.fillStyle = "#2f3c4d";
        ctx.fillRect(-5, -38, 8, 18);

        this.drawWheel(ctx, -26, 15);
        this.drawWheel(ctx, 26, 15);

        ctx.strokeStyle = "#b7c7d8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-26, 15);
        ctx.lineTo(-10, -2);
        ctx.lineTo(13, -2);
        ctx.lineTo(26, 15);
        ctx.stroke();

        ctx.restore();
    }

    drawWheel(ctx, x, y) {
        ctx.fillStyle = "#11151c";
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7d8792";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Collision helpers for precise obstacle contact.
class CollisionSystem {
    static intersects(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    static circleRectIntersects(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        return dx * dx + dy * dy <= circle.r * circle.r;
    }

    static circleCircleIntersects(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const r = a.r + b.r;
        return dx * dx + dy * dy <= r * r;
    }

    static bikeHitModel(bike) {
        // Smaller hit model than full sprite to avoid false collision reports.
        return {
            body: {
                x: bike.x - 30,
                y: bike.y - 18,
                w: 60,
                h: 30
            },
            wheels: [
                { x: bike.x - 26, y: bike.y + 15, r: 10.5 },
                { x: bike.x + 26, y: bike.y + 15, r: 10.5 }
            ]
        };
    }

    static bikeIntersectsObstacle(bike, obstacle) {
        const model = this.bikeHitModel(bike);
        const obstacleBounds = obstacle.getBounds();

        if (obstacle.type === "rock" || obstacle.type === "movingSaw") {
            // Round hazards use circle-circle / circle-rect checks.
            const obstacleCircle = {
                x: obstacle.x,
                y: obstacle.y - obstacle.radius,
                r: obstacle.radius * 0.82
            };

            if (this.circleRectIntersects(obstacleCircle, model.body)) {
                return true;
            }
            for (const wheel of model.wheels) {
                if (this.circleCircleIntersects(obstacleCircle, wheel)) {
                    return true;
                }
            }
            return false;
        }

        // Box hazards use body rect + wheel-circle checks.
        if (this.intersects(model.body, obstacleBounds)) {
            return true;
        }
        for (const wheel of model.wheels) {
            if (this.circleRectIntersects(wheel, obstacleBounds)) {
                return true;
            }
        }
        return false;
    }
}

// Heads-up display bindings and time formatting helpers.
class HUD {
    constructor() {
        this.level = document.getElementById("hudLevel");
        this.difficulty = document.getElementById("hudDifficulty");
        this.timer = document.getElementById("hudTimer");
        this.score = document.getElementById("hudScore");
        this.best = document.getElementById("hudBest");
        this.speed = document.getElementById("hudSpeed");
    }

    update(model) {
        this.level.textContent = model.level;
        this.difficulty.textContent = model.difficulty;
        this.timer.textContent = model.timer;
        this.score.textContent = String(model.score);
        this.best.textContent = String(model.best);
        this.speed.textContent = String(model.speed);
    }

    static formatTime(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const min = String(Math.floor(total / 60)).padStart(2, "0");
        const sec = String(total % 60).padStart(2, "0");
        return `${min}:${sec}`;
    }
}

// Main game controller: state machine, update loop, rendering, and UI wiring.
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.levelManager = new LevelManager();
        this.hud = new HUD();
        this.assets = this.loadAssets();

        this.overlay = document.getElementById("overlay");
        this.overlayTitle = document.getElementById("overlayTitle");
        this.overlaySubtitle = document.getElementById("overlaySubtitle");
        this.overlayMeta = document.getElementById("overlayMeta");
        this.overlayButtons = document.getElementById("overlayButtons");
        this.startControls = document.getElementById("startControls");
        this.levelSelect = document.getElementById("levelSelect");

        this.pauseButton = document.getElementById("pauseBtn");
        this.restartButton = document.getElementById("restartBtn");

        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };

        this.state = "menu";
        this.currentLevelNumber = 1;
        this.currentLevel = null;
        this.terrain = null;
        this.bike = new Bike(120, 350);
        this.cameraX = 0;
        this.timerSeconds = 0;
        this.collected = 0;
        this.distanceProgress = 0;
        this.levelScore = 0;
        this.championshipScore = 0;
        this.crashMessage = "";
        this.lastTimestamp = 0;

        this.unlockedLevel = Number(localStorage.getItem("dxrUnlockedLevel") || "1");
        this.totalBest = Number(localStorage.getItem("dxrTotalBest") || "0");

        this.bindEvents();
        this.populateLevelSelect();
        this.showStartScreen();
        requestAnimationFrame((ts) => this.loop(ts));
    }

    loadAssets() {
        // Sprites and image backdrops are optional; all have vector/gradient fallbacks.
        return {
            splash: this.loadImage("assets/images/splash-race.png"),
            forest: this.loadImage("assets/images/bg-forest.png"),
            canyon: this.loadImage("assets/images/bg-canyon.png"),
            volcano: this.loadImage("assets/images/bg-volcano.png"),
            sprites: {
                bike: this.loadImage("assets/sprites/bike-rider-v1.png"),
                rock: this.loadImage("assets/sprites/obstacle-rock-v1.png"),
                log: this.loadImage("assets/sprites/obstacle-log-v1.png"),
                crate: this.loadImage("assets/sprites/obstacle-crate-v1.png"),
                spike: this.loadImage("assets/sprites/obstacle-spike-v1.png"),
                movingSaw: this.loadImage("assets/sprites/obstacle-saw-v1.png"),
                star: this.loadImage("assets/sprites/star-v1.png")
            }
        };
    }

    loadImage(path) {
        const img = new Image();
        img.src = path;
        return img;
    }

    bindEvents() {
        const onKey = (event, isDown) => {
            const code = event.code;
            if (code === "ArrowLeft") this.input.left = isDown;
            if (code === "ArrowRight") this.input.right = isDown;
            if (code === "ArrowUp") this.input.up = isDown;
            if (code === "ArrowDown") this.input.down = isDown;
            if (code === "Space") this.input.space = isDown;
            if (isDown && code === "KeyP") this.togglePause();
            if (isDown && code === "KeyR") this.restartLevel();

            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) {
                event.preventDefault();
            }
        };
        window.addEventListener("keydown", (event) => onKey(event, true));
        window.addEventListener("keyup", (event) => onKey(event, false));

        this.pauseButton.addEventListener("click", () => this.togglePause());
        this.restartButton.addEventListener("click", () => this.restartLevel());
    }

    populateLevelSelect() {
        this.levelSelect.innerHTML = "";
        for (let i = 1; i <= 10; i += 1) {
            const level = this.levelManager.getLevel(i);
            const option = document.createElement("option");
            option.value = String(i);
            const locked = i > this.unlockedLevel;
            option.textContent = locked
                ? `Level ${i} - ${level.difficulty} (Locked)`
                : `Level ${i} - ${level.difficulty}`;
            this.levelSelect.appendChild(option);
        }
    }

    showOverlay(config) {
        this.overlay.classList.remove("hidden");
        this.overlay.classList.toggle("menu-overlay", config.mode === "menu");
        this.overlayTitle.textContent = config.title || "";
        this.overlaySubtitle.textContent = config.subtitle || "";
        this.overlayMeta.textContent = config.meta || "";
        this.overlayButtons.innerHTML = "";
        this.startControls.classList.toggle("hidden", !config.showLevelSelect);
        if (config.showLevelSelect) {
            this.populateLevelSelect();
        }

        // Build overlay actions dynamically so each state can configure its own controls.
        for (const buttonConfig of config.buttons || []) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = buttonConfig.label;
            if (buttonConfig.kind === "ghost") button.classList.add("ghost-btn");
            if (buttonConfig.kind === "danger") button.classList.add("danger-btn");
            button.addEventListener("click", buttonConfig.action);
            this.overlayButtons.appendChild(button);
        }
    }

    hideOverlay() {
        this.overlay.classList.add("hidden");
        this.overlay.classList.remove("menu-overlay");
    }

    showStartScreen() {
        this.state = "menu";
        this.populateLevelSelect();
        this.levelSelect.value = "1";
        this.showOverlay({
            mode: "menu",
            title: "DIRTY X RUSH",
            subtitle: "2D Dirt Bike Championship",
            meta: `Unlocked Levels: ${this.unlockedLevel} / 10  |  Best Championship Score: ${this.totalBest}`,
            showLevelSelect: true,
            buttons: [
                {
                    label: "Start Race",
                    action: () => {
                        const selected = Number(this.levelSelect.value || "1");
                        if (selected > this.unlockedLevel) {
                            this.overlayMeta.textContent = `Level ${selected} is locked. Complete Level ${this.unlockedLevel} to unlock the next one.`;
                            return;
                        }
                        this.championshipScore = 0;
                        this.startLevel(selected);
                    }
                }
            ]
        });
    }

    startLevel(levelNumber) {
        this.currentLevelNumber = levelNumber;
        this.currentLevel = this.levelManager.getLevel(levelNumber);
        this.terrain = new Terrain(this.currentLevel.terrainConfig, this.canvas.height);

        for (const obstacle of this.currentLevel.obstacles) {
            obstacle.placeOnTerrain(this.terrain);
        }
        for (const item of this.currentLevel.collectibles) {
            const y = this.terrain.heightAt(item.x);
            item.collected = false;
            item.y = (y === null ? this.canvas.height : y) - item.yOffset;
        }

        const startGround = this.terrain.heightAt(120) || (this.canvas.height - 130);
        this.bike = new Bike(120, startGround - 60);
        this.cameraX = 0;
        this.timerSeconds = 0;
        this.collected = 0;
        this.distanceProgress = 0;
        this.levelScore = 0;
        this.crashMessage = "";
        this.state = "running";
        this.hideOverlay();
        this.resetInput();
        this.updateHud();
    }

    resetInput() {
        this.input.left = false;
        this.input.right = false;
        this.input.up = false;
        this.input.down = false;
        this.input.space = false;
    }

    restartLevel() {
        if (!this.currentLevel) {
            return;
        }
        this.startLevel(this.currentLevelNumber);
    }

    togglePause() {
        if (this.state === "running") {
            this.state = "paused";
            this.showOverlay({
                title: "Paused",
                subtitle: `Level ${this.currentLevelNumber} - ${this.currentLevel.difficulty}`,
                meta: "Press P to resume or use the button below.",
                buttons: [
                    { label: "Resume", action: () => this.resume() },
                    { label: "Restart", kind: "ghost", action: () => this.restartLevel() },
                    { label: "Main Menu", kind: "danger", action: () => this.showStartScreen() }
                ]
            });
        } else if (this.state === "paused") {
            this.resume();
        }
    }

    resume() {
        if (this.state !== "paused") {
            return;
        }
        this.state = "running";
        this.hideOverlay();
        this.resetInput();
    }

    loop(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }
        const delta = Math.min(0.033, (timestamp - this.lastTimestamp) / 1000);
        this.lastTimestamp = timestamp;

        if (this.state === "running") {
            this.update(delta);
        }
        this.draw();
        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        const prevBikeX = this.bike.x;
        const prevBikeY = this.bike.y;
        const zoneType = this.terrain.zoneAt(this.bike.x);
        this.bike.update(dt, this.input, zoneType);

        const groundY = this.terrain.heightAt(this.bike.x);
        if (groundY === null) {
            this.bike.onGround = false;
        } else {
            const slope = this.terrain.slopeAt(this.bike.x);
            const landingSpeed = this.bike.applyGround(groundY, slope);
            if (landingSpeed > 650 && Math.abs(this.bike.angle - slope) > 1.0) {
                this.onCrash("Hard landing");
                return;
            }
        }

        if (this.bike.y > this.canvas.height + 140) {
            const zone = this.terrain.zoneAt(this.bike.x);
            if (zone === "lava") {
                this.onCrash("Fell into lava");
            } else if (zone === "bridge") {
                this.onCrash("Bridge collapsed");
            } else {
                this.onCrash("Fell into pit");
            }
            return;
        }

        this.timerSeconds += dt;
        this.distanceProgress = Math.max(this.distanceProgress, this.bike.x);

        for (const obstacle of this.currentLevel.obstacles) {
            obstacle.update(this.timerSeconds);
            obstacle.placeOnTerrain(this.terrain);
            this.handleObstacleCollision(obstacle);
            if (this.state !== "running") {
                return;
            }
        }

        // Swept pickup detection prevents missing stars at high speed.
        this.collectStars(prevBikeX, prevBikeY);
        this.levelScore = Math.floor(this.distanceProgress / 8) + this.collected * 100;

        if (Math.abs(this.bike.angle) > 1.57) {
            this.bike.flipTimer += dt;
            if (this.bike.flipTimer > 0.27) {
                this.onCrash("Bike flipped");
                return;
            }
        } else {
            this.bike.flipTimer = 0;
        }

        if (this.bike.x >= this.currentLevel.finishX) {
            this.completeLevel();
            return;
        }

        this.cameraX = this.bike.x - this.canvas.width * 0.34;
        this.cameraX = Math.max(0, Math.min(this.currentLevel.length - this.canvas.width, this.cameraX));

        this.updateHud();
    }

    handleObstacleCollision(obstacle) {
        if (!CollisionSystem.bikeIntersectsObstacle(this.bike, obstacle)) {
            return;
        }

        if (obstacle.isDangerous()) {
            this.onCrash("Hit dangerous obstacle");
            return;
        }

        const impact = Math.abs(this.bike.vx);
        if (impact > 205) {
            this.onCrash("Heavy obstacle impact");
            return;
        }

        this.bike.vx *= -0.25;
        this.bike.x -= 12;
        this.bike.vy -= 120;
    }

    collectStars(prevX, prevY) {
        const currentX = this.bike.x;
        const currentY = this.bike.y;
        const pickupRadius = 44;
        const pickupRadiusSq = pickupRadius * pickupRadius;
        for (const star of this.currentLevel.collectibles) {
            if (star.collected) {
                continue;
            }
            const nowDx = currentX - star.x;
            const nowDy = currentY - star.y;
            const nowDistSq = nowDx * nowDx + nowDy * nowDy;
            if (nowDistSq <= pickupRadiusSq) {
                star.collected = true;
                this.collected += 1;
                continue;
            }

            // Segment-distance check catches tunneling between frames.
            const sweptDistSq = this.pointToSegmentDistanceSq(star.x, star.y, prevX, prevY, currentX, currentY);
            if (sweptDistSq <= pickupRadiusSq) {
                star.collected = true;
                this.collected += 1;
            }
        }
    }

    pointToSegmentDistanceSq(px, py, x1, y1, x2, y2) {
        const vx = x2 - x1;
        const vy = y2 - y1;
        const lenSq = vx * vx + vy * vy;
        if (lenSq === 0) {
            const dx = px - x1;
            const dy = py - y1;
            return dx * dx + dy * dy;
        }
        let t = ((px - x1) * vx + (py - y1) * vy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * vx;
        const projY = y1 + t * vy;
        const dx = px - projX;
        const dy = py - projY;
        return dx * dx + dy * dy;
    }

    completeLevel() {
        const finishBonus = 250 * this.currentLevelNumber;
        const timeBonus = Math.max(0, Math.floor((this.currentLevel.targetTime - this.timerSeconds) * 24));
        const speedBonus = Math.max(0, Math.floor(this.bike.vx * 2));
        const total = this.levelScore + finishBonus + timeBonus + speedBonus;
        this.championshipScore += total;

        const bestKey = `dxrBestL${this.currentLevelNumber}`;
        const currentBest = Number(localStorage.getItem(bestKey) || "0");
        if (total > currentBest) {
            localStorage.setItem(bestKey, String(total));
        }

        this.unlockedLevel = Math.max(this.unlockedLevel, Math.min(10, this.currentLevelNumber + 1));
        localStorage.setItem("dxrUnlockedLevel", String(this.unlockedLevel));

        if (this.currentLevelNumber === 10) {
            this.totalBest = Math.max(this.totalBest, this.championshipScore);
            localStorage.setItem("dxrTotalBest", String(this.totalBest));
            this.state = "champion";
            this.showOverlay({
                title: "Championship Completed",
                subtitle: "DIRTY X RUSH Final Victory",
                meta: `Championship Score: ${this.championshipScore} | Best: ${this.totalBest}`,
                buttons: [
                    {
                        label: "Play Again",
                        action: () => {
                            this.championshipScore = 0;
                            this.startLevel(1);
                        }
                    },
                    { label: "Main Menu", kind: "ghost", action: () => this.showStartScreen() }
                ]
            });
            return;
        }

        this.state = "levelComplete";
        this.showOverlay({
            title: `Level ${this.currentLevelNumber} Complete`,
            subtitle: `${this.currentLevel.name} cleared`,
            meta: `Score: ${total} | Time: ${HUD.formatTime(this.timerSeconds)} | Stars: ${this.collected}`,
            buttons: [
                { label: "Next Level", action: () => this.startLevel(this.currentLevelNumber + 1) },
                { label: "Restart", kind: "ghost", action: () => this.startLevel(this.currentLevelNumber) },
                { label: "Main Menu", kind: "danger", action: () => this.showStartScreen() }
            ]
        });
    }

    onCrash(reason) {
        this.crashMessage = reason;
        this.state = "gameOver";
        this.showOverlay({
            title: "Game Over",
            subtitle: `Level ${this.currentLevelNumber} failed`,
            meta: `Reason: ${reason} | Time: ${HUD.formatTime(this.timerSeconds)} | Score: ${this.levelScore}`,
            buttons: [
                { label: "Restart Level", action: () => this.startLevel(this.currentLevelNumber) },
                { label: "Main Menu", kind: "ghost", action: () => this.showStartScreen() }
            ]
        });
    }

    updateHud() {
        const bestKey = `dxrBestL${this.currentLevelNumber}`;
        const best = Number(localStorage.getItem(bestKey) || "0");
        this.hud.update({
            level: this.currentLevelNumber,
            difficulty: this.currentLevel.difficulty,
            timer: HUD.formatTime(this.timerSeconds),
            score: this.levelScore,
            best,
            speed: Math.max(0, Math.floor(this.bike.vx))
        });
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.currentLevel || !this.terrain) {
            this.drawIdleBackground();
            return;
        }

        this.drawBackground(this.currentLevel.theme);
        this.terrain.draw(ctx, this.cameraX, this.canvas.width, this.canvas.height, this.currentLevel.theme);
        this.drawGroundContactShadows();
        this.drawCollectibles();
        this.drawFinishLine();

        for (const obstacle of this.currentLevel.obstacles) {
            const sx = obstacle.x - this.cameraX;
            if (sx > -120 && sx < this.canvas.width + 120) {
                obstacle.draw(ctx, this.cameraX, this.assets.sprites);
            }
        }

        this.bike.draw(ctx, this.cameraX, this.assets.sprites.bike);
    }

    drawGroundContactShadows() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";

        // Soft ellipses add grounding cues under bike and obstacles.
        const bikeGround = this.terrain.heightAt(this.bike.x);
        if (bikeGround !== null) {
            const bikeX = this.bike.x - this.cameraX;
            ctx.beginPath();
            ctx.ellipse(bikeX, bikeGround + 2, 26, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const obstacle of this.currentLevel.obstacles) {
            const sx = obstacle.x - this.cameraX;
            if (sx < -140 || sx > this.canvas.width + 140) {
                continue;
            }
            let rx = 14;
            let ry = 5;
            if (obstacle.type === "log") {
                rx = Math.max(18, obstacle.width * 0.42);
            } else if (obstacle.type === "crate") {
                rx = Math.max(14, obstacle.width * 0.34);
            } else if (obstacle.type === "spike") {
                rx = Math.max(14, obstacle.width * 0.36);
            } else if (obstacle.type === "movingSaw") {
                rx = Math.max(14, obstacle.radius * 1.05);
            }
            ctx.beginPath();
            ctx.ellipse(sx, obstacle.y + 2, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawIdleBackground() {
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, "#3b5f87");
        grad.addColorStop(1, "#18222f");
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const splash = this.assets.splash;
        if (splash.complete && splash.naturalWidth > 0) {
            this.drawCoverImage(splash, this.canvas.width, this.canvas.height, 0, 0, 0.55);
            const glow = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            glow.addColorStop(0, "rgba(5, 8, 12, 0.2)");
            glow.addColorStop(1, "rgba(5, 8, 12, 0.72)");
            this.ctx.fillStyle = glow;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBackground(theme) {
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, theme.skyTop);
        grad.addColorStop(1, theme.skyBottom);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Blend AI-generated background art with procedural mountain layers.
        this.drawBackdropForTheme(theme);
        this.drawMountainLayer(theme.mountain, 0.16, 210, 140, 0.5);
        this.drawMountainLayer("#33444f", 0.32, 290, 110, 0.45);
    }

    drawBackdropForTheme(theme) {
        const image = this.assets[theme.bgKey];
        if (!image || !image.complete || image.naturalWidth <= 0) {
            return;
        }

        const xShift = (this.cameraX * 0.12) % 280;
        this.drawCoverImage(image, this.canvas.width + 280, this.canvas.height * 0.82, -xShift - 120, 0, 0.62);
    }

    drawCoverImage(image, destW, destH, dx, dy, alpha) {
        const imgW = image.naturalWidth;
        const imgH = image.naturalHeight;
        const scale = Math.max(destW / imgW, destH / imgH);
        const srcW = destW / scale;
        const srcH = destH / scale;
        const srcX = Math.max(0, (imgW - srcW) * 0.5);
        const srcY = Math.max(0, (imgH - srcH) * 0.5);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(image, srcX, srcY, srcW, srcH, dx, dy, destW, destH);
        this.ctx.restore();
    }

    drawMountainLayer(color, parallax, baseY, variation, alpha) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, this.canvas.height);

        for (let sx = 0; sx <= this.canvas.width + 8; sx += 8) {
            const worldX = this.cameraX * parallax + sx;
            const y = baseY + Math.sin(worldX * 0.006) * variation + Math.sin(worldX * 0.013) * (variation * 0.35);
            ctx.lineTo(sx, y);
        }

        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawCollectibles() {
        const ctx = this.ctx;
        const starSprite = this.assets.sprites.star;
        for (const star of this.currentLevel.collectibles) {
            if (star.collected) {
                continue;
            }
            const x = star.x - this.cameraX;
            if (x < -30 || x > this.canvas.width + 30) {
                continue;
            }
            if (starSprite && starSprite.complete && starSprite.naturalWidth > 0) {
                const bob = Math.sin(this.timerSeconds * 4 + star.x * 0.01) * 3;
                const size = 30;
                ctx.drawImage(starSprite, x - size / 2, star.y - size / 2 + bob, size, size);
            } else {
                this.drawStar(ctx, x, star.y, 11, "#ffd95c", "#f0932b");
            }
        }
    }

    drawStar(ctx, x, y, radius, fill, stroke) {
        const spikes = 5;
        const outer = radius;
        const inner = radius * 0.45;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(x, y - outer);
        for (let i = 0; i < spikes; i += 1) {
            ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer);
            rot += step;
            ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner);
            rot += step;
        }
        ctx.lineTo(x, y - outer);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawFinishLine() {
        const x = this.currentLevel.finishX - this.cameraX;
        const y = this.terrain.heightAt(this.currentLevel.finishX) || (this.canvas.height - 120);
        this.ctx.fillStyle = "#f5f8ff";
        this.ctx.fillRect(x - 6, y - 140, 12, 140);
        for (let i = 0; i < 8; i += 1) {
            this.ctx.fillStyle = i % 2 === 0 ? "#111" : "#fff";
            this.ctx.fillRect(x + 6, y - 130 + i * 14, 46, 14);
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    new Game(canvas);
});
