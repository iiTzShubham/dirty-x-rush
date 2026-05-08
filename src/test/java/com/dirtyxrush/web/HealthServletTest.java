package com.dirtyxrush.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HealthServletTest {

    @Test
    void writesExpectedHealthJsonResponse() throws Exception {
        HealthServlet servlet = new HealthServlet();
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = new StringWriter();
        PrintWriter writer = new PrintWriter(body);

        when(response.getWriter()).thenReturn(writer);

        servlet.doGet(request, response);
        writer.flush();

        verify(response).setContentType("application/json");
        verify(response).setCharacterEncoding("UTF-8");
        assertEquals("{\"status\":\"ok\",\"game\":\"DIRTY X RUSH\"}", body.toString());
    }
}
