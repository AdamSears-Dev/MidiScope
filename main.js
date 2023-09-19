new Vue({
    el: '#app',
    data: {
      keys: [
        { note: 60, type: 'white', isActive: false }, // Middle C
        { note: 61, type: 'black', isActive: false }, // C#
        { note: 62, type: 'white', isActive: false }, // D
        { note: 63, type: 'black', isActive: false }, // D#
        { note: 64, type: 'white', isActive: false }, // E
        { note: 65, type: 'white', isActive: false }, // F
        { note: 66, type: 'black', isActive: false }, // F#
        { note: 67, type: 'white', isActive: false }, // G
        { note: 68, type: 'black', isActive: false }, // G#
        { note: 69, type: 'white', isActive: false }, // A
        { note: 70, type: 'black', isActive: false }, // A#
        { note: 71, type: 'white', isActive: false }, // B
        { note: 72, type: 'white', isActive: false }  // Next octave C
      ],
      keyMap: {
        'a': 60, // Middle C
        'w': 61, // C#
        's': 62, // D
        'e': 63, // D#
        'd': 64, // E
        'f': 65, // F
        't': 66, // F#
        'g': 67, // G
        'y': 68, // G#
        'h': 69, // A
        'u': 70, // A#
        'j': 71, // B
        'k': 72  // Next octave C
      },
      midiOutput: null,
      audioContext: new (window.AudioContext || window.webkitAudioContext)(),
      activeOscillators: {},
      oscillatorType: 'sine',
      analyser: null,
      canvas: null,
      canvasContext: null,
      volume: 50, 
    },
    mounted() {
      if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
          .then(this.onMIDISuccess, this.onMIDIFailure);
      } else {
        console.log('WebMIDI is not supported in this browser.');
      }
      window.addEventListener('keydown', this.keydown);
      window.addEventListener('keyup', this.keyup);

      // Initialize master gain node
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.value = this.volume / 100;
      
      // Initialize analyser and canvas
      this.analyser = this.audioContext.createAnalyser();
      this.canvas = document.getElementById('oscilloscope');
      this.canvasContext = this.canvas.getContext('2d');
  
      // Connect the analyser to the audio context
      this.analyser.connect(this.audioContext.destination);
  
      // Start drawing the oscilloscope
      this.drawOscilloscope();

      // Listen for mouseup events on the entire document
      document.addEventListener('mouseup', this.globalMouseUp);

    },
    watch: {
      volume: function(newVolume) {
        this.masterGainNode.gain.value = newVolume / 100;
      }
    },
    
    beforeDestroy() {
      document.removeEventListener('mouseup', this.globalMouseUp);
    },
    
    methods: {
      onMIDISuccess(midiAccess) {
        const outputs = Array.from(midiAccess.outputs.values());
        this.midiOutput = outputs[0];
      },
      onMIDIFailure() {
        console.log('Could not access your MIDI devices.');
      },
      playNote(note, index) {
        console.log(`Playing note: ${note}`);
    
        // WebMIDI logic
        if (this.midiOutput) {
          this.midiOutput.send([0x90, note, 0x7f]);
        }
    
        // Web Audio logic
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = this.oscillatorType;
        const gainNode = this.audioContext.createGain();

        oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), this.audioContext.currentTime);
        
        gainNode.gain.value = this.volume / 100;
        
        oscillator.connect(gainNode);  // Connect oscillator to gain node
        gainNode.connect(this.masterGainNode);  // Connect gain node to master gain node
        this.masterGainNode.connect(this.analyser);  // Connect master gain node to analyser
        
        // interesting additive synth effect?? use later // oscillator.connect(this.analyser);  // Connect the oscillator to the analyser
        oscillator.start();
        this.activeOscillators[note] = oscillator;
    
        // Update UI
        this.keys[index].isActive = true;
      },

      setOscillatorType(type) {
        this.oscillatorType = type;
      },

      stopNote(note, index) {
        console.log(`Stopping note: ${note}`);
    
        // WebMIDI logic
        if (this.midiOutput) {
          this.midiOutput.send([0x80, note, 0x7f]);
        }
    
        // Web Audio logic
        if (this.activeOscillators[note]) {
          this.activeOscillators[note].stop();
          delete this.activeOscillators[note];
        }
    
        // Update UI
        this.keys[index].isActive = false;
      },
      keydown(event) {
        const note = this.keyMap[event.key];
        if (note) {
          const index = this.keys.findIndex(k => k.note === note);
          if (!this.keys[index].isActive) {
            this.playNote(note, index);
          }
        }
      },
      keyup(event) {
        const note = this.keyMap[event.key];
        if (note) {
          const index = this.keys.findIndex(k => k.note === note);
          this.stopNote(note, index);
        }
      },
      globalMouseUp() {
        // Stop all active notes
        for (let index = 0; index < this.keys.length; index++) {
          if (this.keys[index].isActive) {
            this.stopNote(this.keys[index].note, index);
          }
        }
        },
      drawOscilloscope() {
          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.analyser.getByteTimeDomainData(dataArray);
      
          // Clear the canvas
          this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
          // Draw waveform
          this.canvasContext.beginPath();
          for (let i = 0; i < dataArray.length; i++) {
            const x = i * (this.canvas.width / dataArray.length);
            const y = (dataArray[i] / 255.0) * this.canvas.height;
            if (i === 0) {
              this.canvasContext.moveTo(x, y);
            } else {
              this.canvasContext.lineTo(x, y);
            }
          }
          this.canvasContext.stroke();
      
          // Continue drawing
          requestAnimationFrame(() => this.drawOscilloscope());
        }
      }      
    }
);
  