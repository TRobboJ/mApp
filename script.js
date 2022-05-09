"use strict";
import {
  COUNTRIES_ALL,
  COUNTRIES_EASY,
  GLOBES,
  OPEN_STREET_MAP_API,
  TILEMAP_LIGHT,
  TILEMAP_DARK,
  TILEMAP_LIGHT_ATTRIBUTION,
  TILEMAP_DARK_ATTRIBUTION,
  TILEMAP_SUBDOMAINS,
} from "./config.js";

const startBtn = document.querySelector(".start-btn");
const scrollHint = document.querySelector(".scroll-hint");
const records = document.querySelector(".records");
const guessesUl = document.querySelector(".guesses--ul");
const guessesContainer = document.querySelector(".countries-guesses-container");
const globeIcon = document.querySelector(".globe");

class App {
  //default map variables
  _map;
  _defaultZoom = 3;
  _maxZoom = 7;
  _countryZoom = 4;
  _coords = [0, 0];
  //polygon options
  _outlineOptions = {
    color: "purple",
    weight: 5,
    opacity: 0.8,
    fillOpacity: 0.2,
  };
  _layer;
  //arrays to store previous answers
  _pastQuestions = [];
  _pastGuesses = [];
  _answer;
  //editable options for difficulty
  guessDifficulty = 6; //changes amount of guess elements loaded to sidebar
  arrayDifficulty = COUNTRIES_ALL; //changes which country array is loaded -> change to 'COUNTRIES_EASY' if you like

  constructor() {
    this._getLocalStorage();
    this._renderMap();
    this._globeRandomise();

    //event listeners
    startBtn.addEventListener("click", this._renderTurn.bind(this));
    guessesContainer.addEventListener("click", this._newGuess.bind(this));
  }
  _renderMap() {
    this._map = L.map("map").setView(this._coords, this._defaultZoom);

    L.tileLayer(
      //light version of carto's tilemap.
      TILEMAP_LIGHT,
      {
        attribution: TILEMAP_LIGHT_ATTRIBUTION,
        subdomains: TILEMAP_SUBDOMAINS,
        maxZoom: this._maxZoom,
        minZoom: this._defaultZoom,
      }
    ).addTo(this._map);
  }
  _renderTurn() {
    this._hideBtn();
    this._getNewAnswer();
    this._removeGuessList();
    this._renderCountryBorder();
    this._createAnswerAsObject();
    if (!this._layer) return;
    this._removeCountryBorder();
    this._globeRandomise();
  }
  _hideBtn() {
    startBtn.classList.add("hidden");
    scrollHint.classList.remove("hidden");
  }
  _renderCountryBorder() {
    const _this = this;
    const countryName = this._answer;
    const outlineOptions = this._outlineOptions;
    const map = this._map;
    console.log(countryName)
    fetch(
      `${OPEN_STREET_MAP_API}?country=${countryName.trim()}&polygon_geojson=1&format=json`
    )
      .then((response) => response.json())
      .then(function (data) {        
        _this._moveMapToCountry(data);
        _this._layer = L.geoJSON(data[0].geojson, outlineOptions).addTo(map);
      });
  }

  _removeCountryBorder() {
    this._layer.remove();
  }
  _removeGuessList() {
    guessesUl.innerHTML = "";
  }
  _randomNumberGenerator(arr) {
    return Math.floor(Math.random() * arr.length);
  }
  _getNewAnswer() {
    this._answer = this.arrayDifficulty[
      this._randomNumberGenerator(this.arrayDifficulty)
    ];
  }
  _getRandomCountries() {
    const indexes = [];
    const countries = [];

    while (this.guessDifficulty >= countries.length) {
      let random = this._randomNumberGenerator(this.arrayDifficulty);
      if (
        this.arrayDifficulty[random] !== this._answer &&
        !countries.includes(random)
      ) {
        random = this._randomNumberGenerator(this.arrayDifficulty);
        countries.push(this.arrayDifficulty[random]);
        indexes.push(random);
      }
    }

    return countries;
  }
  _moveMapToCountry(data) {
    if (!data) return;
    this._map.flyTo([data[0].lat, data[0].lon], this._countryZoom, {
      animate: true,
      pan: {
        duration: 0.5,
      },
      zoom: {
        animate: true,
      },
    });
  }
  _renderGuessList(guess) {
    const countries = this._getRandomCountries();
    //add current country(answer) as a guess
    let html = `<li class="country" data-id="${guess.id}">
      <h2 class="country__title">${guess.countryName}</h2>
    </li>`;
    //add random 3-4 other countries as guesses (dependant on this.guessDifficulty)
    for (let i = 0; i < countries.length; i++) {
      html += `<li class="country" data-id="${Math.floor(
        Math.random() * Date.now()
      )}">
        <h2 class="country__title">${countries[i]}</h2>
      </li>`;
    }

    //append list elements to ul with clickable element that calls _newGuess()
    guessesUl.insertAdjacentHTML("afterbegin", html);
    //this randomizes the list
    for (let i = guessesUl.children.length; i >= 0; i--) {
      guessesUl.appendChild(guessesUl.children[(Math.random() * i) | 0]);
    }
  }
  _createAnswerAsObject() {
    if (!this._answer) return;
    let guess = new Guess(this._answer);
    this._pastQuestions.push(guess);
    this._renderGuessList(guess);
  }
  _newGuess(event) {
    //make sure the map is loaded first
    if (!this._map) return;
    const guessEl = event.target.closest(".country");
    //return if clicks happen other than on one of the guessable countries
    if (!guessEl) return;
    let answer;

    if (guessEl.innerText === this._answer)
      answer = new Guess(this._answer, "correct");
    if (guessEl.innerText !== this._answer)
      answer = new Guess(this._answer, "wrong");

    //save guesses to array (for local storage)
    this._pastGuesses.push(answer);
    //remove map polygon_geojson
    this._removeCountryBorder();
    // Render past guesses on the list
    this._renderPastGuesses(answer);
    //save to local storage
    this._setLocalStorage();
    // remove layer
    this._removeCountryBorder();
    //render turn again
    this._renderTurn();
  }
  _globeRandomise() {
    //just a fun function to randomise the globe at the top of the screen (next to 01 mApp)
    //globe array is defined in countries.js file
    let random = this._randomNumberGenerator(GLOBES);
    let html = `<i class="fa-solid fa-earth-${GLOBES[random]} fa-3x logo globe"></i>`;
    globeIcon.innerHTML = html;
  }
  _renderPastGuesses(guess) {
    let html = `<li class="country country--${guess.status}" data-id="${guess.id}">
      <h2 class="country__title">${guess.countryName}</h2>
    </li>`;
    records.insertAdjacentHTML("afterbegin", html);
  }
  _setLocalStorage() {
    localStorage.setItem("countryGuesses", JSON.stringify(this._pastGuesses));
  }

  _getLocalStorage() {
    const savedData = JSON.parse(localStorage.getItem("countryGuesses"));

    if (!savedData) return;

    this._pastGuesses = savedData;

    this._pastGuesses.forEach((guess) => {
      this._renderPastGuesses(guess);
    });
  }

  reset() {
    //call to remove all past guesses from storage and reload page
    localStorage.removeItem("countryGuesses");
    location.reload();
  }
}

const mApp = new App();

class Guess {
  //I had originally planned to select the correct guess based on the ID.
  //Instead I used the innerText of the country name to match with answer.
  id;

  constructor(countryName, status) {
    this.countryName = countryName;
    this.status = status;
    this.id = this._generateUniqueID();
  }
  _generateUniqueID() {
    return Math.trunc(Math.random() * Date.now());
  }
}