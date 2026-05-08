# DIRTY X RUSH

DIRTY X RUSH is a browser-based 2D dirt bike racing game built with HTML5 Canvas and vanilla JavaScript, packaged as a Java Servlet WAR for Apache Tomcat.

## Features

- 10 playable levels with progressive difficulty
  - Levels 1-3: Easy
  - Levels 4-6: Intermediate
  - Levels 7-9: Hard
  - Level 10: Final Championship
- Side-view dirt bike physics
  - Acceleration, braking/reverse, gravity, jumping, air balance, slope alignment
- Obstacles and hazards
  - Rocks, logs, crates, spikes, moving saws
  - Mud zones, slippery zones, pits, broken bridges, lava gaps
- Collision detection for terrain, obstacles, finish line, collectibles, and hazards
- UI flow
  - Start screen, instructions panel, gameplay HUD, pause overlay, level complete, game over, championship complete
- Scoring and timer
  - Distance + star collectibles + finish bonus + time bonus
  - Best level score and best championship score stored in `localStorage`
- Minimal Java backend
  - `HomeServlet` (`/home`) redirects to game
  - `HealthServlet` (`/api/health`) returns JSON status
- No database required
- Custom generated visual assets for menu, backgrounds, and gameplay sprites

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Rendering: HTML5 Canvas
- Backend packaging: Java Servlets (Jakarta Servlet API)
- Build: Maven (`war` packaging)
- Target server: Apache Tomcat 10.1+ (Jakarta namespace)

## Project Structure

```text
dirty-x-rush/
|-- pom.xml
|-- README.md
`-- src/
    `-- main/
        |-- java/
        |   `-- com/dirtyxrush/web/
        |       |-- HomeServlet.java
        |       `-- HealthServlet.java
        `-- webapp/
            |-- index.html
            |-- css/
            |   `-- style.css
            |-- js/
            |   `-- game.js
            |-- assets/
            |   |-- images/
            |   |   |-- splash-race.png
            |   |   |-- bg-forest.png
            |   |   |-- bg-canyon.png
            |   |   `-- bg-volcano.png
            |   `-- sprites/
            |       |-- bike-rider-v1.png
            |       |-- obstacle-rock-v1.png
            |       |-- obstacle-log-v1.png
            |       |-- obstacle-crate-v1.png
            |       |-- obstacle-spike-v1.png
            |       |-- obstacle-saw-v1.png
            |       `-- star-v1.png
            `-- WEB-INF/
                `-- web.xml
```

## Code Architecture and Comments

- `game.js` is split into focused classes with inline comments:
  - `RNG`: deterministic random utility for reproducible level generation
  - `LevelManager`: level metadata, terrain configs, obstacle sets, collectibles
  - `Terrain`: height/slope queries, zone logic, and terrain rendering
  - `Obstacle`: per-type bounds, movement, and rendering
  - `Bike`: player physics, controls response, and bike rendering
  - `CollisionSystem`: precise bike/obstacle contact checks
  - `HUD`: HUD updates and timer formatting
  - `Game`: state machine, loop, scoring, progression, and draw pipeline
- Java servlets include purpose comments for routing and health checks.
- HTML/CSS include section comments for UI structure and styling intent.

## Controls

- `Arrow Right`: Accelerate / move forward
- `Arrow Left`: Brake / move backward
- `Arrow Up`: Jump / lift front
- `Arrow Down`: Balance down / slow down
- `Space`: Jump
- `P`: Pause / resume
- `R`: Restart current level

## How to Run Locally

### 1) Build WAR

```bash
mvn clean package
```

WAR output:

```text
target/dirty-x-rush.war
```

### 2) Run Tests

```bash
mvn test
```

### 3) Deploy to Apache Tomcat

1. Copy `target/dirty-x-rush.war` to Tomcat `webapps/`
2. Start Tomcat
3. Open:
   - `http://localhost:8080/dirty-x-rush/`
   - Optional health endpoint: `http://localhost:8080/dirty-x-rush/api/health`

## Gameplay Flow

1. Start from menu (dropdown lists all levels; locked levels are marked)
2. Finish line unlocks next level
3. Crash leads to game-over overlay with restart
4. Level 10 completion shows championship victory screen

## Notes

- Designed as a lightweight academic mini-project.
- No external paid assets.
- Visuals combine Canvas primitives with generated image assets.
- No database setup needed.

## Future Enhancements

- Sound effects and music toggles
- Ghost replay / best run tracking
- Mobile touch controls
- Additional bike types and skins
- More advanced suspension/rotation physics
