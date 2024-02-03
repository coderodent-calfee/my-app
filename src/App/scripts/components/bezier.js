

"use strict";

//               n!    
//  b(n,k) = ----------
//           k! (n-k)! 
export function berenstienCoefficientFactorial(n, k) {
   function factorial(m) {
      let product = 1;
      for (; m > 1; m--) {
         product *= m;
      }
      return product;
   }

   let numerator = factorial(n - 1);
   let denominator = factorial(k) * factorial((n - 1) - k);
   return numerator / denominator;
}


//               n!       ₖ    n + 1 - i
//  b(n,k) = ---------- = ∏ = ----------
//           k! (n-k)!   ᵢ₌₁       i
function berenstienCoefficient(n, k) {
   let product = 1;
   n--;
   for (let i = 1; i <= k; i++) {
      product *= (n + 1 - i) / i;
   }
   return product;
}


export function berenstienCoefficients(N) {
   let C = [];

   for (let k = 0; k < N; k++) {
      let c = berenstienCoefficient(N, k);
      C.push(c);
   }
   return C;
}
//
// b(n,k) (1-t)ⁿ⁻ᵏtᵏPₖ
// a = (1-t)^(n-k)
// c = b(n,k)
// d = t^k
function summand(c, n, k, t){
   n--;
   let a = Math.pow(1 - t, n - k);
   let d = Math.pow(t, k);
   return c * a * d;
}


//       ₜ
//B(t) = Σ  b(n,k) (1-t)ⁿ⁻ᵏtᵏPₖ
//      ᵏ⁼⁰
function at(coefficients, N, t, controlPoints) {
   // we bound the controlpoints to 'this' for convienience, but they can be overridden
   if (controlPoints == undefined) {
      controlPoints = this;
   } else { 
      // TODO: however, we do need to be sure the number of control points N is the same
   }

   let point = [];
   let c = coefficients;
   let dimension = controlPoints[0].length
   for (let i = 0; i < dimension; i++) {
      point.push(0);
   }
   for (let k = 0; k < N; k++) {
      let factor = summand(c[k], N, k, t);
      for (let i = 0; i < dimension; i++) {
         point[i] += factor * controlPoints[k][i];
      }
   }
   return point;
}

// we can pass in a different set of control points to the function returned
// but they must Number the same(i.e.the count is equal)
// to save on calculating coefficients
export function getSplineFunc(controlPoints) {

   let N = controlPoints.length;
   let coefficients = berenstienCoefficients(N);

   let f = at.bind(controlPoints, coefficients, N);
   return f;
}

export function getSplineAt(controlPoints, t) {
   return getSplineFunc(controlPoints)(t);
}