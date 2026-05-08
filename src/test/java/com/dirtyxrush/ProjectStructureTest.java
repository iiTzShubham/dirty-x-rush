package com.dirtyxrush;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectStructureTest {

    @Test
    void requiredWebAppFilesExist() {
        Path root = Path.of("").toAbsolutePath();

        assertTrue(Files.exists(root.resolve("src/main/webapp/index.html")), "index.html is missing");
        assertTrue(Files.exists(root.resolve("src/main/webapp/css/style.css")), "style.css is missing");
        assertTrue(Files.exists(root.resolve("src/main/webapp/js/game.js")), "game.js is missing");
        assertTrue(Files.exists(root.resolve("src/main/webapp/WEB-INF/web.xml")), "web.xml is missing");
        assertTrue(Files.exists(root.resolve("src/main/java/com/dirtyxrush/web/HomeServlet.java")), "HomeServlet is missing");
        assertTrue(Files.exists(root.resolve("src/main/java/com/dirtyxrush/web/HealthServlet.java")), "HealthServlet is missing");
    }
}
