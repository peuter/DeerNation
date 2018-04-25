var metadataparser=function(t){var r={};function e(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,e),o.l=!0,o.exports}return e.m=t,e.c=r,e.d=function(t,r,n){e.o(t,r)||Object.defineProperty(t,r,{configurable:!1,enumerable:!0,get:n})},e.r=function(t){Object.defineProperty(t,"__esModule",{value:!0})},e.n=function(t){var r=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(r,"a",r),r},e.o=function(t,r){return Object.prototype.hasOwnProperty.call(t,r)},e.p="",e(e.s=4)}([function(t,r){t.exports=window},function(t,r,e){"use strict";var n,o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"===("undefined"==typeof window?"undefined":o(window))&&(n=window)}t.exports=n},function(t,r,e){"use strict";(function(r){if(void 0!==r.URL)t.exports={makeUrlAbsolute:function(t,r){return new URL(r,t).href},parseUrl:function(t){return new URL(t).host}};else{var n=e(0);t.exports={makeUrlAbsolute:function(t,r){return null===n.parse(r).host?n.resolve(t,r):r},parseUrl:function(t){return n.parse(t).hostname}}}}).call(this,e(1))},function(t,r,e){"use strict";var n=function(){return function(t,r){if(Array.isArray(t))return t;if(Symbol.iterator in Object(t))return function(t,r){var e=[],n=!0,o=!1,u=void 0;try{for(var i,c=t[Symbol.iterator]();!(n=(i=c.next()).done)&&(e.push(i.value),!r||e.length!==r);n=!0);}catch(t){o=!0,u=t}finally{try{!n&&c.return&&c.return()}finally{if(o)throw u}}return e}(t,r);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),o=e(2),u=o.makeUrlAbsolute,i=o.parseUrl;function c(t){return t.replace(/www[a-zA-Z0-9]*\./,"").replace(".co.",".").split(".").slice(0,-1).join(" ")}function a(t){return function(r,e){for(var o=0,u=void 0,i=0;i<t.rules.length;i++){var c=n(t.rules[i],2),a=c[0],l=c[1],f=Array.from(r.querySelectorAll(a));if(f.length){var s=!0,p=!1,m=void 0;try{for(var y,b=f[Symbol.iterator]();!(s=(y=b.next()).done);s=!0){var g=y.value,d=t.rules.length-i;if(t.scorers){var v=!0,h=!1,A=void 0;try{for(var w,x=t.scorers[Symbol.iterator]();!(v=(w=x.next()).done);v=!0){var k=(0,w.value)(g,d);k&&(d=k)}}catch(t){h=!0,A=t}finally{try{!v&&x.return&&x.return()}finally{if(h)throw A}}}d>o&&(o=d,u=l(g))}}catch(t){p=!0,m=t}finally{try{!s&&b.return&&b.return()}finally{if(p)throw m}}}}if(!u&&t.defaultValue&&(u=t.defaultValue(e)),u){if(t.processors){var S=!0,U=!1,j=void 0;try{for(var O,_=t.processors[Symbol.iterator]();!(S=(O=_.next()).done);S=!0){u=(0,O.value)(u,e)}}catch(t){U=!0,j=t}finally{try{!S&&_.return&&_.return()}finally{if(U)throw j}}}return u.trim&&(u=u.trim()),u}}}var l={description:{rules:[['meta[property="og:description"]',function(t){return t.getAttribute("content")}],['meta[name="description"]',function(t){return t.getAttribute("content")}]]},icon:{rules:[['link[rel="apple-touch-icon"]',function(t){return t.getAttribute("href")}],['link[rel="apple-touch-icon-precomposed"]',function(t){return t.getAttribute("href")}],['link[rel="icon"]',function(t){return t.getAttribute("href")}],['link[rel="fluid-icon"]',function(t){return t.getAttribute("href")}],['link[rel="shortcut icon"]',function(t){return t.getAttribute("href")}],['link[rel="Shortcut Icon"]',function(t){return t.getAttribute("href")}],['link[rel="mask-icon"]',function(t){return t.getAttribute("href")}]],scorers:[function(t,r){var e=t.getAttribute("sizes");if(e){var n=e.match(/\d+/g);if(n)return n.reduce(function(t,r){return t*r})}}],defaultValue:function(t){return"favicon.ico"},processors:[function(t,r){return u(r.url,t)}]},image:{rules:[['meta[property="og:image:secure_url"]',function(t){return t.getAttribute("content")}],['meta[property="og:image:url"]',function(t){return t.getAttribute("content")}],['meta[property="og:image"]',function(t){return t.getAttribute("content")}],['meta[name="twitter:image"]',function(t){return t.getAttribute("content")}],['meta[property="twitter:image"]',function(t){return t.getAttribute("content")}],['meta[name="thumbnail"]',function(t){return t.getAttribute("content")}]],processors:[function(t,r){return u(r.url,t)}]},keywords:{rules:[['meta[name="keywords"]',function(t){return t.getAttribute("content")}]],processors:[function(t,r){return t.split(",").map(function(t){return t.trim()})}]},title:{rules:[['meta[property="og:title"]',function(t){return t.getAttribute("content")}],['meta[name="twitter:title"]',function(t){return t.getAttribute("content")}],['meta[property="twitter:title"]',function(t){return t.getAttribute("content")}],['meta[name="hdl"]',function(t){return t.getAttribute("content")}],["title",function(t){return t.text}]]},type:{rules:[['meta[property="og:type"]',function(t){return t.getAttribute("content")}]]},url:{rules:[["a.amp-canurl",function(t){return t.getAttribute("href")}],['link[rel="canonical"]',function(t){return t.getAttribute("href")}],['meta[property="og:url"]',function(t){return t.getAttribute("content")}]],defaultValue:function(t){return t.url},processors:[function(t,r){return u(r.url,t)}]},provider:{rules:[['meta[property="og:site_name"]',function(t){return t.getAttribute("content")}]],defaultValue:function(t){return c(i(t.url))}}};t.exports={buildRuleSet:a,getMetadata:function(t,r,e){var n={},o={url:r},u=e||l;return Object.keys(u).map(function(r){var e=a(u[r]);n[r]=e(t,o)}),n},getProvider:c,metadataRuleSets:l}},function(t,r,e){t.exports=e(3)}]);