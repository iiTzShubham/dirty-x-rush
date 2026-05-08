package com.dirtyxrush.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HomeServletTest {

    @Test
    void redirectsToIndexHtmlUnderContextPath() throws Exception {
        HomeServlet servlet = new HomeServlet();
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getContextPath()).thenReturn("/dirty-x-rush");

        servlet.doGet(request, response);

        verify(response).sendRedirect("/dirty-x-rush/index.html");
    }
}
