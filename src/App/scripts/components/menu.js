/**
 * This file will hold the Menu that lives at the top of the Page, this is all rendered using a React Component...
 * 
 */
import React, {useState} from 'react';
import { Link } from 'react-router-dom';

const MIN_SEARCH = 3;

/**
 * Main constructor for the Menu Class
 * @memberof Menu
 */
function Menu(props) {

   const [showingSearch, setShowingSearch] = useState("");
   const [typeAhead, setTypeAhead] = useState("");

   /**
    * Shows or hides the search container
    * @memberof Menu
    * @param e [Object] - the event from a click handler
    */
   const showSearchContainer = (e) => {
      e.preventDefault();
      setShowingSearch(!showingSearch);
   };

   /**
   * manages the visible type ahead behavior
   * @memberof Menu
   * @param e [Object] - the event from the search response
   */
   const handleTypeAhead = (e) => {
      if (e.target.value == 0) {
         setTypeAhead('enter search');
      } else {
         setTypeAhead(e.target.value);
      }
   };

   /**
   * manages the automatic search for products in the server
   * @memberof Menu
   * @param e [Object] - the event from the search response
   */
   const handleSearch = (searchValue) => {
      if (searchValue.length < MIN_SEARCH) {
         return;
      }
      const requestOptions = {
         method: 'GET'
      };

      const searchUrl = 'http://localhost:3035/search';
      let params = { searchText: searchValue };
      let url = searchUrl + '?' + (new URLSearchParams(params)).toString();

      fetch(url, requestOptions)
         .then((response) => {
            return response.json();
         }).then((data) => {
            props.searchResults(data);
            setTypeAhead(data.suggestedText ? (data.searchText + data.suggestedText.substr(data.searchText.length)) : data.searchText);
         }).catch((error) => {
            console.error(error);
         });
   }

   /**
    * Calls upon search change
    * @memberof Menu
    * @param e [Object] - the event from a text change handler
    */
   const onSearch = (e) => {
      handleTypeAhead(e);
      handleSearch(e.target.value);
   };

   /**
   * the arrow or return key acts as an autocomplete
   * @memberof Menu
   * @param e [Object] - the event from the search response
   */
   const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
         e.target.value = typeAhead;
         handleSearch(typeAhead);
      }
   };

   /**
    * Renders the default app in the window, we have assigned this to an element called root.
    * 
    * @returns JSX
    * @memberof App
   */
   return (
      <header className="menu">
         <div className="menu-container">
            <div className="menu-holder">
               <h1>REACT</h1>
               <nav>
                  <Link to="/"     className="nav-item" >Home</Link>
                  <Link to="/about" className="nav-item">About</Link>
                  <Link to="/shader" className="nav-item">Shader</Link>
                  <Link to="/map" className="nav-item">Map</Link>
                  <Link to="/height-map" className="nav-item">HeightMap</Link>
                  <a href="#" className="nav-item">ONE</a>
                  <a href="#" className="nav-item">TWO</a>
                  <a href="#" className="nav-item">THREE</a>
                  <a href="#" className="nav-item">FOUR</a>
                  <a href="#" className="nav-item">FIVE</a>
                  <a href="#" className="nav-item">SIX</a>
                  <a href="#" className="nav-item">SEVEN</a>
                  <a href="#" onClick={ showSearchContainer } >
                     <i className="material-icons search">search</i>
                  </a>
               </nav>
            </div>
         </div>
         <div className={(showingSearch ? "showing " : "") + "search-container"}>
            <div className="typeAhead" >{typeAhead}</div>
            <input type="text" id="search_input" onChange={onSearch} onKeyDown={handleKeyDown} />
            <a href="#" onClick={showSearchContainer}>
               <i className="material-icons close">close</i>
            </a>
         </div>
      </header>
   );
}


// Export out the React Component
export default Menu;