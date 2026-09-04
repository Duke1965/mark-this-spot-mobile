# CORE FUNCTIONS — PINIT

This is a brief summary of what **PINIT** does and what it is intended for.

## User Story
Imagine the user driving down a countryside road. They pass a diner or curio shop that looks interesting but they don’t have time to stop.  
They grab their phone, open **PINIT**, and tap the round circle button — just like using Shazam when they hear a song.

They put the phone down and think nothing more of it.  
Behind the scenes, the app calculates:
- The car’s speed at the moment of tap.
- How far behind the car the interesting place is.
- It places a pin at that location on the map.

The app then calls **Google Maps** to identify nearby buildings and pull in a photo.

## AI Brain
- PINIT monitors the user’s pinning/sharing patterns.
- Based on activity (types of places pinned, photos taken, posts shared), the AI recommends similar or nearby spots.
- These recommendations appear on the **Results page** (⭐ icon bottom right).

## Results Page
- Shows a live Google Map with the user’s location.
- Displays both user-generated and AI recommendations as pins.
- Instead of clutter, pins with multiple recommendations are clustered with a **number badge** (e.g. “7”).
- When a user clicks a pin, details for that place open.

---

You (Cursor) have already helped us build most of this.  
This summary is to remind you of the **intended workflow and goals** before we work on tweaks.
