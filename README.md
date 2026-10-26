# Musical Instrument

This browser program lets you create and move colored shapes. Each shape can
store notes and play them using a Tone.js instrument.

## How to use

1. Click an empty area to create a shape.
2. Click and hold a shape while moving the pointer to move it.
3. Hold **Shift** while moving the pointer to resize the shape.
4. Double-click a shape to enable or disable its repeating notes.
5. While holding the pointer down on a shape, press **A, S, D, F, G, H,** or
   **J** to add a note. Press **Backspace** to remove the most recently added
   note.
6. Release the pointer to choose the shape’s instrument based on its location:
   - Top-left: FM synth
   - Top-right: membrane synth
   - Bottom-left: pluck synth
   - Bottom-right: duo synth

Enabled shapes replay their stored notes about once per second. Larger shapes
play louder, up to the maximum volume.

## Notes

The browser may require a user interaction before it allows audio playback.
Clicking to create or interact with a shape starts Tone.js audio.

The instrument choices are configured in `script.js`. Although a metal synth
is created there, the current quadrant selection does not assign it to shapes.
