/*
 * IDB Programming: A3 — a musical instrument
 *
 * All of the code for your instrument goes in this file. It's split into sections:
 *   settings — the "fixed" parts of your program
 *   state    — the parts of your program that change over time
 *   sound    — the Tone.js instruments and effects
 *   update   — updates the state every 100ms, if necessary
 *   use      — uses the state to make sound and shapes every 100ms, if necessary
 *   controls — what happens when the player uses the pointer
 *   setup    — starts everything
 *
 * The pointer events change the state. update() and use() each run every
 * 100ms, in a loop:
 *   1. update: change the state, e.g. based on time or on the pointer's movement
 *   2. use:    make sound and move shapes, based on the state
 *
 * Shapes come from shape.js: createShape() makes one, and its methods
 * (setPosition, setSize, setColour ...) change it.
 *
 * Tone.js documentation: https://tonejs.github.io/docs/15.1.22/
 */

import { createShape } from "./shape.js";

// ---------- Settings ----------
// Settings variables should contain all of the "fixed" parts of your programs
// For example: which notes you can play, how fast things move, the tempo.
const initialSize = 100;
const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
const keys = ["a", "s", "d", "f", "g", "h", "j"];
const instruments = {
  membrane: new Tone.MembraneSynth().toDestination(),
  plucky: new Tone.PluckSynth().toDestination(),
  fm: new Tone.FMSynth().toDestination(),
  duo: new Tone.DuoSynth().toDestination(),
};
const disabledSaturation = 25; // saturation for disabled shapes
const disabledLightness = 25; // lightness for disabled shapes

// ---------- State ----------
// State variables are the parts of your program that change over time.
// For example: where the pointer is, how fast it's moving, or whether a drone is on.
let shapes = [];
let shapeInFocus = null;
let shapeInConfig = null;
let shapeClickTime = 0;

// ---------- Sound ----------
// Make the instruments and plug them into the speakers.
const synth = new Tone.PolySynth(Tone.Synth).toDestination(); // can play several notes at once

// ---------- Update ----------
// Update the state. This is called every 100ms.
function update() {
  setTimeout(update, 100); // call update() again in 100 milliseconds
}

// ---------- Use ----------
// Use the state to make sound and move shapes. This is called every 100ms.
function useSound() {
  for (let s of shapes) {
    if (s.enabled) {
      let t = Tone.now(); // Schedule this shape's notes starting now.
      let i = 0; // Space each note slightly after the previous one.

      for (let note of s.notes) {
        // Make larger shapes louder, but keep velocity at or below 1.
        let volume = Math.min(s.size / 200, 1);
        s.instrument.triggerAttackRelease(note, "8n", t + i * 0.25, volume);
        i++;
      }
    }
  }

  // Repeat once per second. This controls how often enabled shapes play.
  setTimeout(useSound, 1000);
}

function use() {
  for (let s of shapes) {
    if (s.enabled) {
      s.setColour(s.hue, 100, 50); // Enabled shapes use a bright colour.
    } else {
      s.setColour(s.hue, disabledSaturation, disabledLightness);
    }

    s.setSize(s.size);

    // position stores the shape's center; setPositionPixels needs its top-left.
    s.setPositionPixels(s.position.x - s.size / 2, s.position.y - s.size / 2);
  }

  window.requestAnimationFrame(use);
}

// ---------- Controls (Event Handlers) ----------

function shapeOver(event, shape) {
  shapeInFocus = shape;
  console.log(`Pointer over ${shape.hue}.`);
}

function shapeOut(event, shape) {
  shapeInFocus = null;
  console.log(`Pointer out ${shape.hue}.`);
}

function setShapeEventListeners(s) {
  s.element.addEventListener("pointerover", (event) => {
    shapeOver(event, s);
  });
  s.element.addEventListener("pointerout", (event) => {
    shapeOut(event, s);
  });
}

function newShape(event) {
  Tone.start(); // browsers only allow sound after the player has pressed something

  let s = createShape();
  s.size = initialSize;
  s.setSize(s.size);
  s.position = { x: event.clientX, y: event.clientY };
  s.setColour(Math.random() * 360); // random colour

  // Add properties to the shape for our instrument
  s.notes = [];
  s.enabled = false;
  s.instrument = instruments.fm;

  // Set up event handlers
  setShapeEventListeners(s);

  shapes.push(s);
  shapeInFocus = s;
}

function toggleShapeEnable(s) {
  s.enabled = !s.enabled;
}

function pointerDown(event) {
  if (shapeInFocus) {
    if (Date.now() - shapeClickTime < 200) {
      toggleShapeEnable(shapeInFocus);
    }
    shapeInConfig = shapeInFocus;
    shapeClickTime = Date.now();
  } else {
    newShape(event);
  }
}

function pointerUp(event) {
  if (shapeInConfig) {
    if (
      shapeInConfig.position.x < window.innerWidth / 2 &&
      shapeInConfig.position.y < window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.fm;
    } else if (
      shapeInConfig.position.x >= window.innerWidth / 2 &&
      shapeInConfig.position.y < window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.membrane;
    } else if (
      shapeInConfig.position.x < window.innerWidth / 2 &&
      shapeInConfig.position.y >= window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.plucky;
    } else {
      shapeInConfig.instrument = instruments.duo;
    }

    shapeInConfig = null;
  }
}

function pointerMove(event) {
  if (shapeInConfig) {
    if (event.shiftKey) {
      // With Shift held, resize the shape based on the pointer's distance
      // from its center. The minimum size is 10 pixels.
      shapeInConfig.size = Math.max(
        10,
        2 *
          Math.max(
            Math.abs(event.clientX - shapeInConfig.position.x),
            Math.abs(event.clientY - shapeInConfig.position.y),
          ),
      );
    } else {
      // Otherwise, move the shape's center to the pointer.
      shapeInConfig.position = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  }
}

function keyDown(event) {
  if (shapeInConfig != null && event.repeat == false) {
    let index = keys.indexOf(event.key);
    if (index >= 0 && index < notes.length) {
      let note = notes[index];
      shapeInConfig.notes.push(note);

      synth.triggerAttackRelease(note, "8n"); // play the note for 1/8th of a second
    }
  }

  if (event.key === "Backspace" && shapeInConfig != null) {
    shapeInConfig.notes.pop();
  }
}

// ---------- Setup ----------
// Setup is run once, at the start of the program. It sets everything up for us!
function setup() {
  update(); // start the update loop
  use(); // start the use loop
  useSound(); // start the useSound loop

  // Put your event listener code here
  window.addEventListener("pointerdown", pointerDown);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointermove", pointerMove);

  window.addEventListener("keydown", keyDown);
}

setup(); // Always remember to call setup()!
