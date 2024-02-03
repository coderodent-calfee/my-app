/**
 * This file will hold the Main content that lives in the main body of the site
 * 
 */
import React, { useState } from 'react';

import * as Bezier from "./bezier";


function Home(props) {
   /**
    * preserves constructed product components as a cache
    * 
    * @memberof Home
   */
 
   const [productCache, setProductCache] = useState(new Map());

   // components constructed and displayed as a result of the search
   let productShown = new Map();

   //minimum onClick function for products displayed, for debugging
   const dumpProduct = (product, e) => {
      console.log("Product:" + JSON.stringify(product, null, 2));
   }

   let productsRecieved = props.data.products;

   if (productsRecieved) {
      productsRecieved.forEach((product) => {
         if (productCache.has(product._id)) {
            productShown.set(product._id, productCache.get(product._id));
         } else {
            let productComponent = <div className="product-item" key={'product' + product._id} _id={product._id} onClick={dumpProduct.bind(this, product)} >
               <div className="product" >
                  <img src={product.picture} alt={product.name}></img>
                  <div className="details" >
                     <div className="name" >{product.name}</div>
                     <div className="price" >${product.price}</div>
                  </div>
               </div>
            </div>;
            productCache.set(product._id, productComponent);
         }
      });
   }
   /**
    * Renders the default app in the window, we have assigned this to an element called root.
    * 
    * @returns JSX
    * @memberof Home
   */
   return (
      <section id="home">
         <div className="content">
            <div className="product-container">{Array.from(productShown.values())}</div>
         </div>
      </section>
   );
};

// Export out the React Component
export default Home;