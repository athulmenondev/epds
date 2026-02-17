import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {/* Remove the <div> here if App.jsx already handles the 
               className={isDarkMode ? 'dark' : 'light'} 
            */}
            {children}
        </ThemeContext.Provider>
    );
};