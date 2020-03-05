import { select, templates, settings} from '../settings.js';
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
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
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
      .then(function([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]){
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) { // eslint-disable-line
    const thisBooking = this;

    thisBooking.booked = {};
    
    
    for(let event of eventsCurrent){
      thisBooking.makeBooked(event.date, event.hour, event.duration, event.table);
    }

    for(let booking of bookings){
      thisBooking.makeBooked(booking.date, booking.hour, booking.duration, booking.table);
    }
    
    for(let event of eventsRepeat){
      for(let i = new Date(thisBooking.datePicker.minDate); i <= thisBooking.datePicker.maxDate; i.setDate(i.getDate()+1)){ //get the dates between min and max
        if(i.getDay() != 1){ // avoid mondays
          thisBooking.makeBooked(utils.dateToStr(i), event.hour, event.duration, event.table);
        }
      }
    }
    console.log(thisBooking.booked);
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;
    
    if(!thisBooking.booked.hasOwnProperty(date)){ // don't overwrite dates
      thisBooking.booked[date] = {};
      
    }
    const floatHour = parseFloat(hour);
    const floatDuration = parseFloat(duration);
    for(let i = floatHour; i <= floatHour + floatDuration; i += 0.5){
      if(!thisBooking.booked[date].hasOwnProperty(i.toString())){ //don't overwrite tables
        thisBooking.booked[date][i.toString()] = [];
      }
      thisBooking.booked[date][i.toString()].push(table);
    }
  }
}
