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
  membrane: new Tone.PolySynth(Tone.MembraneSynth).toDestination(),
  plucky: new Tone.PolySynth(Tone.Synth, {
    envelope: {
      attack: 0.005,
      decay: 0.3,
      sustain: 0,
      release: 0.3,
    },
  }).toDestination(),
  fm: new Tone.PolySynth(Tone.FMSynth).toDestination(),
  duo: new Tone.PolySynth(Tone.DuoSynth).toDestination(),
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
/**
 * Keeps the update loop running by scheduling another call after 100 ms.
 * Called once by setup(), then by its own setTimeout().
 */
function update() {
  setTimeout(update, 100); // call update() again in 100 milliseconds
}

// ---------- Use ----------
// Use the state to make sound and move shapes. This is called every 100ms.
/**
 * Plays the stored notes of enabled shapes. Notes are scheduled a short time
 * apart, and each note's velocity is based on the shape's size, capped at 1.
 * Called by setup(), then by its own setTimeout() once per second.
 */
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

/**
 * Updates every shape's colour, size, and screen position. Shape positions
 * are stored at their centers, so half the size is subtracted to get the
 * top-left coordinates expected by setPositionPixels().
 * Called by setup(), then repeatedly through requestAnimationFrame().
 */
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

// ---------- Helper Functions ----------

/**
 * Moves the configured shape's center to the pointer's viewport coordinates.
 * Called by pointerMove() when Shift is not held.
 */
function moveShape(event) {
  shapeInConfig.position = {
    x: event.clientX,
    y: event.clientY,
  };
}

/**
 * Resizes the configured shape around its center. It measures the pointer's
 * distance from the center on both axes, uses the larger distance to keep the
 * shape square, doubles it to get the full size, and enforces a 10-pixel
 * minimum.
 * Called by pointerMove() when Shift is held.
 */
function resizeShape(event) {
  shapeInConfig.size = Math.max(
    10,
    2 *
      Math.max(
        Math.abs(event.clientX - shapeInConfig.position.x),
        Math.abs(event.clientY - shapeInConfig.position.y),
      ),
  );
}

/**
 * Removes the last stored note from the configured shape when Backspace is
 * pressed. Does nothing if no shape is being configured.
 * Called by keyDown() for each key press.
 */
function removeNoteFromShape(event) {
  if (event.key === "Backspace" && shapeInConfig != null) {
    shapeInConfig.notes.pop();
  }
}

/**
 * Maps a note key to a note, stores it on the configured shape, and plays it
 * immediately as a preview. It ignores held-key repeats and keys not in the
 * configured key list.
 * Called by keyDown() for each key press.
 */
function addNoteToShape(event) {
  if (shapeInConfig != null && event.repeat == false) {
    let index = keys.indexOf(event.key);
    if (index >= 0 && index < notes.length) {
      let note = notes[index];
      shapeInConfig.notes.push(note);

      synth.triggerAttackRelease(note, "8n");
    }
  }
}

/**
 * Registers pointer-over and pointer-out listeners on a shape's element. Each
 * listener passes that shape to its corresponding handler.
 * Called by newShape() after creating the shape.
 */
function setShapeEventListeners(s) {
  s.element.addEventListener("pointerover", (event) => {
    shapeOver(event, s);
  });
  s.element.addEventListener("pointerout", (event) => {
    shapeOut(event, s);
  });
}

/**
 * Adds the properties this program needs to a new shape: its starting size,
 * center position, colour, empty note list, disabled state, and default
 * instrument.
 * Called by newShape() immediately after createShape().
 */
function setShapeCustomProperties(s, event) {
  s.size = initialSize;
  s.setSize(s.size);
  s.position = { x: event.clientX, y: event.clientY };
  s.setColour(Math.random() * 360); // random colour

  // Add properties to the shape for our instrument
  s.notes = [];
  s.enabled = false;
  s.instrument = instruments.fm;
}

// ---------- Controls (Event Handlers) ----------

/**
 * Marks the shape under the pointer as the current focus.
 * Called by the pointerover listener registered in setShapeEventListeners().
 */
function shapeOver(event, shape) {
  shapeInFocus = shape;
  console.log(`Pointer over ${shape.hue}.`);
}

/**
 * Clears the current focus when the pointer leaves a shape.
 * Called by the pointerout listener registered in setShapeEventListeners().
 */
function shapeOut(event, shape) {
  shapeInFocus = null;
  console.log(`Pointer out ${shape.hue}.`);
}

/**
 * Starts Tone.js after a user gesture, creates and configures a shape,
 * registers its pointer listeners, and adds it to the shapes list.
 * Called by pointerDown() when the pointer is not over an existing shape.
 */
function newShape(event) {
  Tone.start(); // browsers only allow sound after the player has pressed something

  let s = createShape();
  setShapeCustomProperties(s, event);

  // Set up event handlers
  setShapeEventListeners(s);

  shapes.push(s);
  shapeInFocus = s;
}

/**
 * Switches a shape between enabled and disabled. Enabled shapes are highlighted
 * and their notes are played by useSound().
 * Called by pointerDown() after a quick second press on the focused shape.
 */
function toggleShapeEnable(s) {
  s.enabled = !s.enabled;
}

/**
 * Handles a pointer press. If a shape is focused, starts configuring it and
 * checks whether this is a quick second press to toggle playback. Otherwise,
 * creates a new shape.
 * Registered as the window's pointerdown handler by setup().
 */
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

/**
 * Chooses an instrument and colour according to the configured shape's screen
 * quadrant, then ends configuration.
 * Registered as the window's pointerup handler by setup().
 */
function pointerUp(event) {
  // When the pointer is released, we can assign an instrument and colour to the shape.
  if (shapeInConfig) {
    if (
      shapeInConfig.position.x < window.innerWidth / 2 &&
      shapeInConfig.position.y < window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.fm;
      shapeInConfig.hue = 60 + 90 * 0 + Math.random() * 25; // random yellow
    } else if (
      shapeInConfig.position.x >= window.innerWidth / 2 &&
      shapeInConfig.position.y < window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.membrane;
      shapeInConfig.hue = 60 + 90 * 1 + Math.random() * 25; // random cyan
    } else if (
      shapeInConfig.position.x < window.innerWidth / 2 &&
      shapeInConfig.position.y >= window.innerHeight / 2
    ) {
      shapeInConfig.instrument = instruments.plucky;
      shapeInConfig.hue = 60 + 90 * 2 + Math.random() * 25; // random blue
    } else {
      shapeInConfig.instrument = instruments.duo;
      shapeInConfig.hue = 60 + 90 * 3 + Math.random() * 25; // random red
    }

    shapeInConfig = null;
  }
}

/**
 * Handles pointer movement while a shape is being configured. Moves the shape
 * normally, or resizes it when Shift is held.
 * Registered as the window's pointermove handler by setup().
 */
function pointerMove(event) {
  if (shapeInConfig) {
    if (event.shiftKey) {
      // With Shift held, resize the shape based on the pointer's distance
      resizeShape(event);
    } else {
      // Otherwise, move the shape's center to the pointer.
      moveShape(event);
    }
  }
}

/**
 * Sends each key press to the note-add and note-remove helpers.
 * Registered as the window's keydown handler by setup().
 */
function keyDown(event) {
  addNoteToShape(event);

  removeNoteFromShape(event);
}

// ---------- Setup ----------
// Setup is run once, at the start of the program. It sets everything up for us!
/**
 * Starts the update, drawing, and sound loops, then registers the window's
 * pointer and keyboard handlers.
 * Called once at the bottom of this file.
 */
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
