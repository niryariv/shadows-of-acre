/**
 * Lightweight procedural sound design for the stealth mission.
 *
 * The AudioContext is deliberately created lazily: call unlock() from a click,
 * keydown, or pointer event before expecting sound on mobile browsers.
 */
export class StealthAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.masterLevel = 0.72;
    this.noiseBuffer = null;
    this.nextFootstepAt = 0;
    this.stepSide = 1;
    this.guardCueCount = 0;
    this.guardAlertCount = 0;
    this.lastGuardCue = null;
    this.objectImpactCount = 0;
    this.lastObjectImpact = null;
    this.ambientRequested = false;
    this.ambientNodes = null;
    this.nextCityCue = 0;
  }

  async unlock() {
    const context = this._ensureContext();
    if (!context) return false;

    try {
      if (context.state === "suspended") await context.resume();

      // A one-sample silent sound finishes the unlock on older iOS versions.
      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.master);
      source.start();

      if (this.ambientRequested) this._startAmbient();
      return context.state === "running";
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.master || !this.context) return;

    try {
      const now = this.context.currentTime;
      const gain = this.master.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(Math.max(0.0001, gain.value), now);
      gain.exponentialRampToValueAtTime(
        this.muted ? 0.0001 : this.masterLevel,
        now + 0.025,
      );
    } catch {
      // Muting must never interfere with the game loop.
    }
  }

  alarm() {
    if (!this._canPlay()) return;
    try {
      const t = this.context.currentTime;
      this._noise(t, 0.14, 0.34, 480, "lowpass", 0.7, 0);
      this._tone(t, 0.18, 92, 38, 0.38, "sine", 0, 0.002);
      this._tone(t + 0.025, 0.12, 240, 70, 0.12, "triangle", 0);
    } catch {}
  }

  pickup() {
    if (!this._canPlay()) return;
    try {
      const t = this.context.currentTime;
      this._tone(t, 0.12, 523.25, 659.25, 0.1, "sine", -0.08, 0.004);
      this._tone(t + 0.075, 0.15, 659.25, 987.77, 0.11, "sine", 0.08, 0.004);
      this._tone(t + 0.16, 0.25, 987.77, 1318.51, 0.09, "sine", 0, 0.006);
    } catch {}
  }

  splash(intensity = 0.55) {
    if (!this._canPlay()) return;
    try {
      const t = this.context.currentTime;
      const strength = Math.min(1, Math.max(0.2, intensity));
      this._noise(t, 0.12, 0.18 * strength, 1150, "bandpass", 0.72, 0);
      this._noise(t + 0.035, 0.24, 0.13 * strength, 420, "lowpass", 0.8, 0);
      this._tone(t, 0.18, 125, 62, 0.07 * strength, "sine", 0);
    } catch {}
  }

  gasp() {
    if (!this._canPlay()) return;
    try {
      const t = this.context.currentTime;
      this._noise(t, 0.28, 0.2, 820, "bandpass", 1.2, 0);
      this._tone(t + 0.03, 0.32, 155, 78, 0.09, "sine", 0);
    } catch {}
  }

  footstep(intensity = 1) {
    if (!this._canPlay()) return;

    try {
      const t = this.context.currentTime;
      // Protect against animation-loop callers and duplicated movement events.
      if (t < this.nextFootstepAt) return;
      this.nextFootstepAt = t + 0.115;

      const strength = Math.min(1.35, Math.max(0.15, Number(intensity) || 1));
      const pan = this.stepSide * 0.09;
      this.stepSide *= -1;

      this._noise(t, 0.055, 0.12 * strength, 1050, "bandpass", 0.75, pan, 0.002);
      this._noise(t + 0.015, 0.11, 0.13 * strength, 310, "lowpass", 0.8, pan);
      this._tone(
        t,
        0.095,
        105 + Math.random() * 22,
        53,
        0.12 * strength,
        "sine",
        pan,
      );
    } catch {}
  }

  guardFootstep({
    distance = 12,
    pan = 0,
    approach = 0,
    alerted = false,
    muffled = false,
    submerged = false,
    armor = false,
    masking = 1,
  } = {}) {
    const audibleRange = submerged ? 13 : muffled ? 16 : 24;
    const proximity = Math.max(0, Math.min(1, 1 - distance / audibleRange));
    if (proximity <= 0) return false;

    const direction = approach > 0.22 ? "approaching" : approach < -0.22 ? "receding" : "crossing";
    this.guardCueCount += 1;
    this.lastGuardCue = {
      distance: Number(distance.toFixed(2)),
      pan: Number(Math.max(-1, Math.min(1, pan)).toFixed(2)),
      direction,
      muffled: Boolean(muffled),
      submerged: Boolean(submerged),
      alerted: Boolean(alerted),
    };
    if (!this._canPlay()) return true;

    try {
      const t = this.context.currentTime;
      const strength =
        masking *
        Math.pow(proximity, 0.78) *
        (alerted ? 1.2 : 1) *
        (approach > 0.22 ? 1.08 : approach < -0.22 ? 0.86 : 0.96);
      const stereo = Math.max(-0.92, Math.min(0.92, pan));
      const highFrequency = submerged ? 120 : muffled ? 240 : approach > 0.22 ? 1180 : 820;
      const lowFrequency = submerged ? 62 : muffled ? 105 : 185;

      // A hard sole striking kurkar: a short grit transient followed by a
      // lower body thump. Brighter transients read as approaching footsteps.
      this._noise(
        t,
        submerged ? 0.075 : 0.045,
        0.17 * strength,
        highFrequency,
        submerged || muffled ? "lowpass" : "bandpass",
        muffled ? 0.62 : 0.9,
        stereo,
        0.002,
      );
      this._noise(
        t + 0.012,
        muffled ? 0.16 : 0.105,
        0.19 * strength,
        lowFrequency,
        "lowpass",
        0.72,
        stereo,
      );
      this._tone(
        t,
        0.09,
        alerted ? 102 : 88,
        46,
        0.1 * strength,
        "sine",
        stereo,
      );

      if (armor && !submerged && proximity > 0.22) {
        const metalStrength = strength * (muffled ? 0.28 : 0.48);
        this._tone(t + 0.045, 0.075, 1450, 910, 0.026 * metalStrength, "triangle", stereo);
        this._tone(t + 0.07, 0.055, 2130, 1320, 0.016 * metalStrength, "sine", stereo);
      }
      return true;
    } catch {
      return false;
    }
  }

  guardSuspicion({ distance = 12, pan = 0, muffled = false } = {}) {
    const proximity = Math.max(0, Math.min(1, 1 - distance / 23));
    if (proximity <= 0) return false;
    this.guardAlertCount += 1;
    if (!this._canPlay()) return true;

    try {
      const t = this.context.currentTime;
      const stereo = Math.max(-0.9, Math.min(0.9, pan));
      const strength = Math.pow(proximity, 0.7) * (muffled ? 0.42 : 0.78);
      // A restrained breath/grunt and sudden mail movement communicates that
      // a patrol has heard or glimpsed something without turning into dialogue.
      this._noise(t, 0.24, 0.12 * strength, muffled ? 310 : 690, "bandpass", 1.2, stereo);
      this._tone(t + 0.025, 0.22, 132, 82, 0.075 * strength, "triangle", stereo);
      this._tone(t + 0.09, 0.06, 1720, 1080, 0.018 * strength, "sine", stereo);
      return true;
    } catch {
      return false;
    }
  }

  objectImpact({ material = "wood", strength = 0.5, pan = 0 } = {}) {
    const impactStrength = Math.max(0.2, Math.min(1, Number(strength) || 0.5));
    const stereo = Math.max(-0.9, Math.min(0.9, Number(pan) || 0));
    this.objectImpactCount += 1;
    this.lastObjectImpact = {
      material,
      strength: Number(impactStrength.toFixed(2)),
      pan: Number(stereo.toFixed(2)),
    };
    if (!this._canPlay()) return true;

    try {
      const t = this.context.currentTime;
      if (material === "pottery") {
        this._noise(t, 0.075, 0.16 * impactStrength, 1450, "bandpass", 1.3, stereo, 0.001);
        this._tone(t, 0.13, 940, 410, 0.11 * impactStrength, "triangle", stereo);
        this._tone(t + 0.035, 0.11, 1320, 620, 0.065 * impactStrength, "sine", stereo);
      } else {
        this._noise(t, 0.09, 0.18 * impactStrength, 330, "lowpass", 0.78, stereo, 0.001);
        this._tone(t, 0.14, 118, 48, 0.15 * impactStrength, "sine", stereo);
        this._tone(t + 0.018, 0.07, 510, 205, 0.055 * impactStrength, "triangle", stereo);
      }
      return true;
    } catch {
      return false;
    }
  }

  guardDiagnostics() {
    return {
      footsteps: this.guardCueCount,
      alerts: this.guardAlertCount,
      last: this.lastGuardCue,
      objectImpacts: this.objectImpactCount,
      lastObjectImpact: this.lastObjectImpact,
    };
  }

  ambientStart() {
    this.ambientRequested = true;
    if (!this._canPlay()) return;
    try {
      this._startAmbient();
    } catch {}
  }

  timeBell() {
    if (!this._canPlay()) return;
    try {
      const t=this.context.currentTime;
      for(const delay of [0,.8]) {
        this._tone(t+delay,1.8,220,218,.06,"sine",-.35,.003);
        this._tone(t+delay,1.2,587,581,.035,"sine",-.35,.003);
      }
    } catch {}
  }

  cityAmbience(dt, activity, nearby, indoors) {
    this.nextCityCue-=dt;
    if(this.nextCityCue>0||!this._canPlay())return;
    this.nextCityCue=1.1+Math.random()*1.5;
    if(indoors||activity<.12||nearby<.05)return;
    try {
      const t=this.context.currentTime, level=activity*nearby, pan=(Math.random()-.5)*1.6;
      // Indistinct market voices and soles on stone: no anachronistic dialogue.
      for(let i=0;i<3;i++) {
        this._noise(t+i*.18,.16,.04*level,360+i*170,"bandpass",3,pan,.015);
        this._tone(t+i*.18,.14,130+i*18,100+i*15,.018*level,"triangle",pan,.02);
      }
      this._noise(t+.7,.07,.07*level,680,"bandpass",.8,-pan);
    } catch {}
  }

  _ensureContext() {
    if (this.context) return this.context;

    try {
      const AudioContextClass =
        globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return null;

      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0.0001 : this.masterLevel;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      this.context = null;
      this.master = null;
      return null;
    }
  }

  _canPlay() {
    return Boolean(
      this.context &&
        this.master &&
        this.context.state !== "closed" &&
        this.context.state === "running",
    );
  }

  _noise(
    start,
    duration,
    volume,
    frequency,
    filterType = "bandpass",
    q = 1,
    pan = 0,
    attack = 0.003,
  ) {
    const context = this.context;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const output = this._pan(pan);

    source.buffer = this._getNoiseBuffer();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);

    const peak = Math.max(0.0001, volume);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.start(start, Math.random() * 0.8, duration + 0.015);
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect(); filter.disconnect(); envelope.disconnect();
      if(output !== this.master) output.disconnect();
    };
  }

  _tone(
    start,
    duration,
    fromFrequency,
    toFrequency,
    volume,
    type = "sine",
    pan = 0,
    attack = 0.003,
  ) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const output = this._pan(pan);
    const end = start + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, fromFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, toFrequency),
      end,
    );

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      start + attack,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect(); envelope.disconnect();
      if(output !== this.master) output.disconnect();
    };
  }

  _click(start, volume = 0.12, pan = 0) {
    this._noise(start, 0.018, volume, 2800, "highpass", 0.9, pan, 0.001);
    this._tone(start, 0.022, 840, 180, volume * 0.55, "square", pan, 0.001);
  }

  _pan(amount) {
    if (typeof this.context.createStereoPanner !== "function") {
      return this.master;
    }

    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.min(1, Math.max(-1, amount));
    panner.connect(this.master);
    return panner;
  }

  _getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;

    const context = this.context;
    const length = Math.ceil(context.sampleRate * 2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;

    for (let i = 0; i < length; i += 1) {
      // A little correlation makes the source less brittle than pure white noise.
      const white = Math.random() * 2 - 1;
      previous = previous * 0.28 + white * 0.72;
      samples[i] = previous;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  _startAmbient() {
    if (this.ambientNodes || !this._canPlay()) return;

    const context = this.context;
    const t = context.currentTime;
    const noise = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const highpass = context.createBiquadFilter();
    const bedGain = context.createGain();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();

    noise.buffer = this._getNoiseBuffer();
    noise.loop = true;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 520;
    highpass.type = "highpass";
    highpass.frequency.value = 58;
    bedGain.gain.setValueAtTime(0.0001, t);
    bedGain.gain.exponentialRampToValueAtTime(0.028, t + 1.8);

    lfo.type = "sine";
    lfo.frequency.value = 0.075;
    lfoDepth.gain.value = 0.009;

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(bedGain);
    bedGain.connect(this.master);
    lfo.connect(lfoDepth);
    lfoDepth.connect(bedGain.gain);
    noise.start();
    lfo.start();

    this.ambientNodes = { noise, lowpass, highpass, bedGain, lfo, lfoDepth };
  }
}
