import {templates} from '../settings.js';

export class Home {
  constructor(element) {
    const thisHome = this;

    thisHome.dom = {};
    thisHome.render(element);
  }

  render(element){
    const thisHome = this;

    const generatedHTML = templates.homePage();

    thisHome.dom.wrapper = element;
    thisHome.dom.wrapper.innerHTML = generatedHTML;

  }
}