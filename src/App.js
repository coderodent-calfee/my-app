import logo from './logo.svg';
import './App/sass/main.scss';
import React, { Component } from 'react';
import { Route, Routes } from 'react-router-dom';

import Menu from './App/scripts/components/menu';
import Home from './App/scripts/components/home';
import About from './App/scripts/components/about';

class App extends React.Component {

  state = {
    data: {},
  };

  // communications between child components pass through here
  handleSearchResults(data) {
    this.setState({ data: data });
  }

  render() {
    return (
        <div className="App">
          <Menu searchResults={this.handleSearchResults.bind(this)} data={this.state.data} />
          <Routes>
            <Route path="/" element=<Home data={this.state.data} /> exact />
            <Route path="/about" element=<About /> />
          </Routes>
        </div>
    );
  }

}

export default App;
