import { Product } from './components/Product.js';
import { Booking } from './components/Booking.js';
import { Home } from './components/Home.js';
import { Cart } from './components/Cart.js';
import { select, settings, classNames } from './settings.js';

const app = {
  initMenu: function () {
    const thisApp = this;

    for (let productData in thisApp.data.products) {
      new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
    }
  },

  initBooking: function () {
    const thisApp = this;
    /* find reservation widget container */
    thisApp.booking = document.querySelector(select.containerOf.booking);
    /* create new Booking class instance */
    const bookingObj = new Booking(thisApp.booking); // eslint-disable-line
  },

  initHome: function () {
    const thisApp = this;
    /* find reservation widget container */
    thisApp.home = document.querySelector(select.containerOf.home);
    /* create new Booking class instance */
    const homeObj = new Home(thisApp.home); // eslint-disable-line
  },

  initPages: function () {
    const thisApp = this;

    thisApp.pages = Array.from(document.querySelector(select.containerOf.pages).children);
    thisApp.navLinks = Array.from(document.querySelectorAll(select.nav.links));

    let pagesMatchingHash = [];
    if (window.location.hash.length > 2) {
      const idFromHash = window.location.hash.replace('#/', '');

      pagesMatchingHash = thisApp.pages.filter(function (page) {
        return page.id == idFromHash;
      });
    }
    thisApp.activatePage(pagesMatchingHash.length ? pagesMatchingHash[0].id : thisApp.pages[0].id);

    for (let link of thisApp.navLinks) {
      link.addEventListener('click', function (event) {
        const clickedElement = this;
        event.preventDefault();
        /* TODO: get page id from href */
        const pageId = clickedElement.getAttribute('href').replace('#', '');
        /* TODO: activate page*/
        thisApp.activatePage(pageId);
      });
    }
    document.querySelector(select.logo.link).addEventListener('click', function (event) {
      const clickedElement = this;
      event.preventDefault();
      const pageId = clickedElement.getAttribute('href').replace('#', '');
      thisApp.activatePage(pageId);
    });

    document.querySelectorAll(select.home.buttons).forEach(button => {
      button.addEventListener('click', function (event) {
        const clickedElement = this;
        event.preventDefault();
        const pageId = clickedElement.getAttribute('href').replace('#', '');
        app.activatePage(pageId);
      });
    });
  },

  activatePage: function (pageId) {
    const thisApp = this;

    window.location.hash = '#/' + pageId;

    if (pageId != 'home') { //hide and show nav
      thisApp.navLinks.forEach(nav => {
        nav.classList.remove(classNames.visibility.hidden);
      });
      document.querySelector(select.containerOf.cart).classList.remove(classNames.visibility.hidden);
    } else {
      thisApp.navLinks.forEach(nav => {
        nav.classList.add(classNames.visibility.hidden);
      });
      document.querySelector(select.containerOf.cart).classList.add(classNames.visibility.hidden);
    }

    for (let link of thisApp.navLinks) {
      link.classList.toggle(classNames.nav.active, link.getAttribute('href') == '#' + pageId);
    }
    for (let page of thisApp.pages) {
      page.classList.toggle(classNames.nav.active, page.getAttribute('id') == pageId);
    }
  },

  initData: function () {
    const thisApp = this;

    thisApp.data = {};

    const url = settings.db.url + '/' + settings.db.product;

    fetch(url)
      .then(function (rawResponse) {
        return rawResponse.json();
      })
      .then(function (parsedResponse) {
        /* save parsedResponse as thisApp.data.products */
        thisApp.data.products = parsedResponse;
        /* execute initMenu method */
        thisApp.initMenu();
      });
  },

  initCart: function () {
    const thisApp = this;

    const cartElem = document.querySelector(select.containerOf.cart);
    thisApp.cart = new Cart(cartElem);

    thisApp.productList = document.querySelector(select.containerOf.menu);

    thisApp.productList.addEventListener('add-to-cart', function (event) {
      app.cart.add(event.detail.product);
    });
  },

  init: function () {
    const thisApp = this;


    thisApp.initHome();
    thisApp.initPages();
    thisApp.initData();
    thisApp.initBooking();
    thisApp.initCart();


  },
};

app.init();
