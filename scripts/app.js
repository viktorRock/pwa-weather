var uid = "89123891231239"; // Dummy global id variable
var token = "eo4Dr8qhrFY";

(function () {
  'use strict';

  var injectedForecast = {
    key: 'newyork',
    label: 'New York, NY',
    currently: {
      time: 1453489490,
      summary: 'Clear',
      icon: 'partly-cloudy-day',
      temperature: 52.74,
      apparentTemperature: 74.34,
      precipProbability: 0.20,
      humidity: 0.77,
      windBearing: 125,
      windSpeed: 1.52
    },
    daily: {
      data: [{
          icon: 'clear-day',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'rain',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'snow',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'sleet',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'fog',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'wind',
          temperatureMax: 55,
          temperatureMin: 34
        }, {
          icon: 'partly-cloudy-day',
          temperatureMax: 55,
          temperatureMin: 34
        }
      ]
    }
  };

  var weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

  var app = {
    hasRequestPeding: false,
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  /* Event listener for refresh button */
  document.getElementById('butRefresh').addEventListener('click', function () {
    // console.log('getElementById - butRefresh');
    app.updateForecasts();
  });

  /* Event listener for Clear button */
  document.getElementById('butClear').addEventListener('click', function () {
    // console.log('getElementById - butClear');
    localforage.clear();
    app.selectedCities = [];
    app.visibleCards = {};
    app.updateForecastCard(injectedForecast);
    location.reload();
  });

  /* Event listener for add new city button */
  document.getElementById('butAdd').addEventListener('click', function () {
    // Open/show the add new city dialog
    // console.log('getElementById - butAdd');
    app.toggleAddDialog(true);
  });

  /* Event listener for add city button in add city dialog */
  document.getElementById('butAddCity').addEventListener('click', function () {
    // console.log('getElementById - butAddCity');
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({
      key: key,
      label: label
    });
    app.toggleAddDialog(false);
    app.saveSelectedCities();

  });

  /* Event listener for cancel button in add city dialog */
  document.getElementById('butAddCancel').addEventListener('click', function () {
    app.toggleAddDialog(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function (visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function (data) {
    // console.log('updateForecastCard');
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    //verify data is newer than what we already have, if not, bail
    var dateElem = card.querySelector('.date');
    if (dateElem.getAttribute('date-dt') >= data.currently.time) {
      return;
    }

    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.date').textContent =
      new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent =
      Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temperatureMin);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  //Cash Then Network method
  app.getForecast = function (key, label) {
    // console.log('getForecast');
    // console.log('label = ' + label);
    var url = weatherAPIUrlBase + key + '.json';

    //first getting from Cache
    if ('caches' in window) {
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(function (json) {
            // Only update if the XHR is still pending, otherwise the XHR was already returned
            if (app.hasRequestPeding) {
              json.key = key;
              json.label = label;
              app.updateForecastCard(json);
              console.log('update from cache: ' + new Date().toISOString().replace('T', ' ').replace(/\..*$/, ''));
            }
          });
        }
      });
    }

    // Make the XHR to get the data, then update the card
    app.hasRequestPeding = true;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.hasRequestPeding = false;
          app.updateForecastCard(response);
          console.log('update from XHR: ' + new Date().toISOString().replace('T', ' ').replace(/\..*$/, ''));
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function () {
    // console.log('updateForecasts');
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function (key) {
      app.getForecast(key)
      var card = app.visibleCards[key];
      card.querySelector('.date').textContent = new Date();
      //console.log('textContent = ' + card.querySelector('.location').textContent);

    });
  };

  app.saveSelectedCities = function () {
    window.localforage.setItem('selectedCities', app.selectedCities).then(function (value) {
      // console.log('Promises - localforage.setItem(selectedCities');
      // console.log('SelectedCities = ' + app.selectedCities);
    }).catch (function (err) {
      console.log(err);
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
	  // beforeinstallprompt Event fired

    // e.userChoice will return a Promise.
    // For more details read: https://developers.google.com/web/fundamentals/getting-started/primers/promises
    e.userChoice.then(function (choiceResult) {

      console.log(choiceResult.outcome);

      if (choiceResult.outcome == 'dismissed') {
        console.log('User cancelled home screen install');
      } else {
        console.log('User added to home screen');
      }
    });
  });
  document.addEventListener('DOMContentLoaded', function () {
    window.localforage.getItem('selectedCities').then(function (selectedCities) {
      // console.log('Promises - localforage.getItem(selectedCities)');
      // console.log(selectedCities)

      if (selectedCities == null) {
        // console.log('empty SelectedCities')
        app.updateForecastCard(injectedForecast);
        app.selectedCities.push(injectedForecast);
        app.saveSelectedCities();
      } else {
        app.selectedCities = selectedCities
          app.selectedCities.forEach(function (data) {
            app.getForecast(data.key, data.label)
          })
      }
    });
  });

 if ('serviceWorker' in navigator) {
    navigator.serviceWorker
     .register('/service-worker.js')
     .then(function() { 
        // console.log('Service Worker Registered'); 
      });
  }

})();
