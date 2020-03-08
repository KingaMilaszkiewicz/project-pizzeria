import { select, templates, settings, classNames } from '../settings.js';
import { AmountWidget } from './AmountWidget.js';
import { DatePicker } from './DatePicker.js';
import { HourPicker } from './HourPicker.js';
import { utils } from '../utils.js';

export class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.dom = {};
    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }
  render(element) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(select.booking.form);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starter);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });

    //add overlay to selected table
    thisBooking.dom.tables.forEach(table => {
      table.addEventListener('click', function () {
        if (!this.classList.contains(classNames.booking.tableBooked)) {
          thisBooking.dom.tables.forEach(chosenTable => {
            chosenTable.classList.remove(classNames.booking.tableSelected);
          });
          this.classList.add(classNames.booking.tableSelected);
        }
      });
    });

    thisBooking.dom.form.addEventListener('submit', function (event) {
      event.preventDefault();
      thisBooking.sendBooking();
    });

    /*DONE: add event listener to the tables so it selects it (need to make an overlay?)
      DONE: if updateDOM then unselect the table
      TODO: send the object to API
      TODO: update the app.json with new reservation/reload the page unless can be done dynamically*/
  }

  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: utils.dateToStr(thisBooking.datePicker.value),
      hour: thisBooking.hourPicker.value,
      table: parseInt(thisBooking.dom.wrapper.querySelector(select.booking.tablesSelected).getAttribute(settings.booking.tableIdAttribute)),
      repeat: false,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    for (let starter of thisBooking.dom.starters) {
      if (starter.checked) {
        payload.starters.push(starter.value);
      }
    }
    console.log(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      }).then(function (parsedResponse) {
        console.log('parsedResponse', parsedResponse);
        thisBooking.makeBooked(parsedResponse.date, parsedResponse.hour, parsedResponse.duration, parsedResponse.table);
        thisBooking.updateDOM();
      });
  }

  getData() {
    const thisBooking = this;

    const startEndDates = {};
    startEndDates[settings.db.dateStartParamKey] = utils.dateToStr(thisBooking.datePicker.minDate);
    startEndDates[settings.db.dateEndParamKey] = utils.dateToStr(thisBooking.datePicker.maxDate);

    const endDate = {};
    endDate[settings.db.dateEndParamKey] = startEndDates[settings.db.dateEndParamKey];

    const params = {
      booking: utils.queryParams(startEndDates),
      eventsCurrent: settings.db.notRepeatParam + '&' + utils.queryParams(startEndDates),
      eventsRepeat: settings.db.repeatParam + '&' + utils.queryParams(endDate),
    };

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function ([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]) {
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) { // eslint-disable-line
    const thisBooking = this;

    thisBooking.booked = {};


    for (let event of eventsCurrent) {
      thisBooking.makeBooked(event.date, event.hour, event.duration, event.table);
    }

    for (let booking of bookings) {
      thisBooking.makeBooked(booking.date, booking.hour, booking.duration, booking.table);
    }

    for (let event of eventsRepeat) {
      for (let i = new Date(thisBooking.datePicker.minDate); i <= thisBooking.datePicker.maxDate; i.setDate(i.getDate() + 1)) { //get the dates between min and max
        if (i.getDay() != 1) { // avoid mondays
          thisBooking.makeBooked(utils.dateToStr(i), event.hour, event.duration, event.table);
        }
      }
    }
    console.log(thisBooking.booked);
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (!thisBooking.booked.hasOwnProperty(date)) { // don't overwrite dates
      thisBooking.booked[date] = {};

    }
    const floatHour = parseFloat(hour);
    const floatDuration = parseFloat(duration);
    for (let i = floatHour; i <= floatHour + floatDuration; i += 0.5) {
      if (!thisBooking.booked[date].hasOwnProperty(i.toString())) { // don't overwrite tables
        thisBooking.booked[date][i.toString()] = [];
      }
      thisBooking.booked[date][i.toString()].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    if (thisBooking.date instanceof Object) { // check if date is not an object, initial date is string but after onChange turns to array with date
      thisBooking.date = utils.dateToStr(thisBooking.date[0]);
    }

    for (let element of thisBooking.dom.tables) {
      const tableId = parseInt(element.getAttribute(settings.booking.tableIdAttribute));

      element.classList.remove(classNames.booking.tableSelected);

      if (thisBooking.booked[thisBooking.date] &&
        thisBooking.booked[thisBooking.date][thisBooking.hour] &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].indexOf(tableId) !== -1) {

        element.classList.add(classNames.booking.tableBooked);
      } else {
        element.classList.remove(classNames.booking.tableBooked);
      }
    }
  }
}
