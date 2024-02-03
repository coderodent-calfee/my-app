/**
 * The Initial React Setup file
 * ...
 * 
 * === CSS
 * The stylesheets are handled seperately using the gulp sass rather than importing them directly into React.
 * You can find these in the ./app/sass/ folder
 * 
 * == JS
 * All files in here start from this init point for the React Components.
 *  
 * 
 * Firstly we need to import the React JS Library
 */
import React, { Component } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { createRoot } from 'react-dom/client';

import Menu from './components/menu';
import Home from './components/home';
import About from './components/about';
import Shader from './components/shader';
import Map from './components/map';
import HeightMap from './components/heightMap';

import test from './test.js';

/**
 * We can start our initial App here in the main.js file
 */
class App extends React.Component {

    state = {
        data: {},
    };

    // communications between child components pass through here
    handleSearchResults(data) {
        this.setState({ data: data });
    }

    /**
     * Renders the default app in the window, we have assigned this to an element called root.
     * 
     * @returns JSX
     * @memberof App
    */

    render() {
        return (
           <div className="App">
              <Menu searchResults={this.handleSearchResults.bind(this)} data={this.state.data} />
              <Routes>
                 <Route path="/" element=<Home data={this.state.data} /> exact />
                 <Route path="/about" element=<About /> />
                 <Route path="/shader" element=<Shader /> />
                 <Route path="/map" element=<Map /> />
                 <Route path="/height-map" element=<HeightMap /> />
              </Routes>
           </div>
        );
    }

}

// Render this out
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<HashRouter><App /></HashRouter>);

test();