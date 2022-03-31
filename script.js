"use strict";
const randomCountryBtn = document.querySelector(".random-country-btn");
const records = document.querySelector(".records");
const guessesUl = document.querySelector(".guesses--ul");
const guessesContainer = document.querySelector(".countries-guesses-container");
const globeIcon = document.querySelector(".globe");

class App {
  //default map variables
  // Using #hashes before variable names is non standard from my experience. I could be wrong though.
  #map;
  #defaultZoom = 3;
  #maxZoom = 7;
  #countryZoom = 4;
  #coords = [0, 0];
  //polygon options
  #outlineOptions = {
    color: "purple",
    weight: 5,
    opacity: 0.8,
    fillOpacity: 0.2,
  };
  #layer;
  //arrays to store previous answers
  #pastQuestions = [];
  #pastGuesses = [];
  #answer;
  //editable options for difficulty
  guessDifficulty = 6; //changes amount of guess elements loaded to sidebar
  arrayDifficulty = countriesAll; //changes which country array is loaded -> change to 'countriesEasy' if you like

  constructor() {
    this._getLocalStorage();
    this._renderMap();
    this._globeRandomise();

    //event listeners
    randomCountryBtn.addEventListener("click", this._renderTurn.bind(this));
    guessesContainer.addEventListener("click", this._newGuess.bind(this));
  }
  _renderMap() {
    this.#map = L.map("map").setView(this.#coords, this.#defaultZoom);

    L.tileLayer(
      //light version of carto's tilemap.
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: this.#maxZoom,
        minZoom: this.#defaultZoom,
      }
    ).addTo(this.#map);
  }
  _renderTurn() {
    //this function is called on every click of the "RANDOM COUNTRY" button and also when a guess is made
    this._removeGuessList();
    this._renderCountryBorder();
    this._createAnswerAsObject();
    if (!this.#layer) return;
    this._removeCountryBorder();
    this._globeRandomise();
  }
  _renderCountryBorder() {
    const countryName = (this.#answer = this._getRandomCountry());
    const outlineOptions = this.#outlineOptions;
    const map = this.#map;
    
    // As long as you use arrow functions, 'this' should refer to original class.
    // Only traditional functions overwrite the value of 'this' as they create their own scope.
    // Before arrow functions older code often uses other workarounds such as

    fetch(
      "https://nominatim.openstreetmap.org/search?country=" +
        countryName.trim() +
        "&polygon_geojson=1&format=json"
    )
      .then((response) => response.json())
      .then((data) => {
        //fix mApp later. I want to use 'this' but I can't seem to bind it properly
        mApp._moveMapToCountry(data);
        mApp.#layer = L.geoJSON(data[0].geojson, outlineOptions).addTo(map);
      });
  }

  _removeCountryBorder() {
    this.#layer.remove();
  }
  _removeGuessList() {
    // guessUl.innerHTML = '' or guessUl.replaceChildren() would be more performant. Fewer loops = better.
    while (guessesUl.hasChildNodes()) {
      guessesUl.removeChild(guessesUl.firstChild);
    }
  }
  _randomNumberGenerator(arr) {
    return Math.floor(Math.random() * arr.length);
  }
  _getRandomCountries() {
    const indexes = [];
    const countries = [];
    while (this.guessDifficulty.length >= countries.length) {
      const random = this._randomNumberGenerator(this.arrayDifficulty);
      // Continue to generate X new answers that:
      // aren't the same as the current answer
      // aren't already in the list of answers
      if (this.arrayDifficulty[random] !== this.#answer && !countries.includes(random)) {
        console.log(this.arrayDifficulty[random], this.#answer);
        random = this._randomNumberGenerator(this.arrayDifficulty);
        countries.push(this.arrayDifficulty[random]);
        indexes.push(random);
      }
    }
    return countries;
  }
  _moveMapToCountry(data) {
    if (!data) return;
    this.#map.flyTo([data[0].lat, data[0].lon], this.#countryZoom, {
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
    if (!this.#answer) return;
    let guess = new Guess(this.#answer);
    this.#pastQuestions.push(guess);
    this._renderGuessList(guess);
  }
  _newGuess(event) {
    //make sure the map is loaded first
    if (!this.#map) return;
    const guessEl = event.target.closest(".country");
    //return if clicks happen other than on one of the guessable countries
    if (!guessEl) return;
    let answer;

    if (guessEl.innerText === this.#answer)
      answer = new Guess(this.#answer, "correct");
    if (guessEl.innerText !== this.#answer)
      answer = new Guess(this.#answer, "wrong");

    //save guesses to array (for local storage)
    this.#pastGuesses.push(answer);
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
    let random = Math.floor(Math.random() * globe.length);
    let html = `<i class="fa-solid fa-earth-${globe[random]} fa-5x logo globe"></i>`;
    globeIcon.innerHTML = html;
  }
  _renderPastGuesses(guess) {
    let html = `<li class="country country--${guess.status}" data-id="${guess.id}">
      <h2 class="country__title">${guess.countryName}</h2>
    </li>`;
    records.insertAdjacentHTML("afterbegin", html);
  }
  _setLocalStorage() {
    localStorage.setItem("countryGuesses", JSON.stringify(this.#pastGuesses));
  }

  _getLocalStorage() {
    const savedData = JSON.parse(localStorage.getItem("countryGuesses"));

    if (!savedData) return;

    this.#pastGuesses = savedData;

    this.#pastGuesses.forEach((guess) => {
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
  //Will likely remove later.
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

//TEST DATA
// const guess1 = new Guess("Australia", "correct");
// const guess2 = new Guess("Ireland", "wrong");
// mApp._renderPastGuesses(guess1);
// mApp._renderPastGuesses(guess2);

//TODO
//html and css rewrite (currently using Jonathan's CSS template)
//add load event to fetch + catch function (atm you can spam click randomise)
//fix mApp call within the then() block (should call "this")
//multiple countries of the same guess can be called with my _getRandomCountry function
//add dark version option of carto's tilemap
//remove random country button after first click -> change to "start"?

//MAYBE
//easy, med, hard? arrays?
