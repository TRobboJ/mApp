"use strict";
import {
  TEST_ERROR_DATA,
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

// Selectors

const startBtnContainer = document.querySelector(".start-btn__container");
const easyBtn = document.querySelector(".easy-btn");
const hardBtn = document.querySelector(".hard-btn");
const scrollHint = document.querySelector(".scroll-hint");
const errorMsg = document.querySelector(".error-msg");
const records = document.querySelector(".records");
const guessesUl = document.querySelector(".guesses__ul");
const guessesContainer = document.querySelector(".countries-guesses-container");
const globeIcon = document.querySelector(".globe");
const darkModeBtn = document.querySelector(".dark-mode");
const spinnerContainer = document.querySelector(".spinner__container")
// const settingsBtn = document.querySelector(".settings");

class App {
  //default map variables
  _map;
  _defaultZoom = 3;
  _maxZoom = 7;
  _countryZoom = 4;
  _coords = [0, 0];
  //toggle for darkmode
  _darkMode;
  //polygon options
  _outlineOptions = {
    color: "purple",
    weight: 4,
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
  arrayDifficulty; // set through the easy and hard buttons and the functions _setArrayDifficulty
  


  constructor() {
    this._getLocalStorage();
    this._renderMap();
    this._globeRandomise();
    this._renderDarkModeIcon();
    //event listeners
    easyBtn.addEventListener("click", this._setArrayDifficultyEasy.bind(this));
    hardBtn.addEventListener("click", this._setArrayDifficultyHard.bind(this));
    guessesContainer.addEventListener("click", this._newGuess.bind(this));
    darkModeBtn.addEventListener("click", this._toggleDarkMode.bind(this));
  }

  _renderMap() {
    this._map = L.map("map").setView(this._coords, this._defaultZoom);

    // Set tilemap to light or dark mode (default is lightmode)
    let tileMap;
    let tileMapAttribution;
    if (this._darkMode) {
      tileMap = TILEMAP_DARK;
      tileMapAttribution = TILEMAP_DARK_ATTRIBUTION;
    }
    if (!this._darkMode){
      tileMap = TILEMAP_LIGHT;
      tileMapAttribution = TILEMAP_LIGHT_ATTRIBUTION;
    }
    
    // Render map using the tilemap
    L.tileLayer(
      tileMap,
      {
        attribution: tileMapAttribution,
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
    this._renderCountryBorder(); //this function also calls createAnswerAsObject(), toggleLoadingSpinner() and moveMapToCountry()
    if (!this._layer) return;
    this._removeCountryBorder();
    this._globeRandomise();
  }

  //these functions are called once after selecting the easy or hard buttons
  _setArrayDifficultyEasy(){
    this.arrayDifficulty = COUNTRIES_EASY; //COUNTRIES_EASY array as defined in config.js
    this._renderTurn();
  }

  _setArrayDifficultyHard(){
    this.arrayDifficulty = COUNTRIES_ALL; //COUNTRIES_ALL array as defined in config.js
    this._renderTurn();
  }

  _hideBtn() {
    startBtnContainer.classList.add("hidden");
    scrollHint.classList.remove("hidden");
    startBtnContainer.previousElementSibling.classList.add("hidden"); //hides the explanation paragraph above the buttons
  }

  _renderCountryBorder() {
    const countryName = this._answer;
    const _this = this;  
    const outlineOptions = this._outlineOptions;
    const map = this._map;

    this._toggleLoadingSpinner();
        async function getCountryJson(countryName){          
            try{
                let response = await fetch(`${OPEN_STREET_MAP_API}?country=${countryName.trim()}&polygon_geojson=1&format=json`);
                if(!response) throw `Error fetching json`
                return await response.json();
            } catch (error){
              throw `Error reaching server: Please refresh and try again. Error: ${error}`
              }
          }
      const response = getCountryJson(countryName);
      response.then(function(data){
    // uncomment the below console log to preview the answer for debugging.
        //console.log(data[0].display_name) 
        if (data.length === 0) return; 
        errorMsg.classList.add("hidden");
        _this._toggleLoadingSpinner();
        _this._moveMapToCountry(data);
        _this._layer = L.geoJSON(data[0].geojson, outlineOptions).addTo(map);
        _this._createAnswerAsObject();
      }).catch((err)=>{
        //render again logic
        console.log(err);
        _this._errorHandling(`Error fetching country: Trying again...`);
        _this._renderTurn();
        _this._toggleLoadingSpinner();
      })
  }

  _toggleLoadingSpinner(){
    spinnerContainer.classList.toggle("hidden");
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

  _toggleDarkMode() {
    this._darkMode = !this._darkMode;
    this._setLocalStorageDarkMode();
    this.reloadPage();
  }

  _renderDarkModeIcon()
  {
    let html;
    if(this._darkMode){
      html = `<i class="fa-solid fa-sun dark-mode dm-on"></i>`
      // settingsBtn.classList.remove("dm-off");
      // settingsBtn.classList.add("dm-on");
    }
    if (!this._darkMode){
      html = `<i class="fa-solid fa-moon dark-mode dm-off" id="dark-mode"></i>`
      // settingsBtn.classList.add("dm-off");
      // settingsBtn.classList.remove("dm-on");
    }
    
    darkModeBtn.innerHTML = html;
  }

  _globeRandomise() {
    //just a fun function to randomise the globe at the top of the screen (next to 01 mApp)
    //globe array is defined in countries.js file
    let random = this._randomNumberGenerator(GLOBES);
    let html = `<i class="fa-solid fa-earth-${GLOBES[random]} fa-3x logo globe"></i>`;
    globeIcon.innerHTML = html;
  }

  _errorHandling(err){
    errorMsg.innerText = err;
    errorMsg.classList.remove("hidden");
  }

  _renderPastGuesses(guess) {
    let html = `<li class="country country__${guess.status}" data-id="${guess.id}">
      <h2 class="country__title">${guess.countryName}</h2>
    </li>`;
    records.insertAdjacentHTML("afterbegin", html);
  }

  _setLocalStorage() {
    localStorage.setItem("countryGuesses", JSON.stringify(this._pastGuesses));
    
  }

  _setLocalStorageDarkMode(){
    localStorage.setItem("darkMode", this._darkMode);
  }

  _getLocalStorage() {
    const savedData = JSON.parse(localStorage.getItem("countryGuesses"));
    let darkMode = JSON.parse(localStorage.getItem("darkMode"));

    if(!darkMode) {darkMode = false};
    this._darkMode = darkMode;
    if (!savedData) return;
    this._pastGuesses = savedData;

    this._pastGuesses.forEach((guess) => {
      this._renderPastGuesses(guess);
    });
  }

  reloadPage(){
    //call to reload page only
    location.reload();
  }

  resetAll() {
    // call to remove all past guesses from storage and reload page
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