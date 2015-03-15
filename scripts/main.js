var find = (function() {

	var f = {
		animal: {
			size: {
				x: 80, y: 58
			},
			sizeBig: {
				x: 320, y: 233
			},
			pos: {
				x: null, y: null
			},
			elm: null
		},
		enablePromo: false,
		settings: {
			tone: 0,
			requiredDistance: 40,
			stats: false,
			expertMode: false,
			animal: 'cow'
		},
		animals: {
			cow: {
				duration: 0.3,
				levels: 11,
				mooDelay: 1200
			},
			goat: {
				duration: 0.35,
				levels: 10,
				mooDelay: 1000
			},
			fox: {
				duration: 0.3,
				levels: 10,
				mooDelay: 400
			}
		},
		stats: {
			donated: 0,
			distance: null,
			elm: null,
			level: 0,
			inRange: null,
			started: false,
			wins: 0,
			points: 0,
			total: null,
			startedAt: null,
			seenPromo: 1,
			lastSecondsTaken: null
		},
		quotes: [
			'Damn. Can\'t believe I played more than once.',
			'Find the Invisible Cow is the new high-water mark for next-gen gaming',
			'On a scale of 1 to 10, I really enjoy this website.',
			'Greatest website ever? Yes. Greatest website ever. ',
			'The greatest thing since apple cider and donuts',
			'A masterpiece of the internet...',
			'It\'s obnoxious and wonderful and I love it.',
			'I played with my eyes closed. Way more fun that way.',
			'humanity has peaked. this is it. right here.',
			'I\'ve been playing this game for half an hour what is wrong with me???',
			'So simple. So inspiring. Thank you.'
		],
		init: function() {
			// Check for compatibility
			var is_ios = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
			if (is_ios || !f.audio.init()) {
				f.modal.open('no-audio');
				return false;
			}

			// Load saved scores
			f.load();

			// Add event listeners
			window.addEventListener('mousemove', f.update);
			window.addEventListener('click', f.click);
			document.querySelector('[data-expertMode]').addEventListener('change', function() {
				f.settings.expertMode = this.checked;
			});
			var animalSelectors = document.querySelectorAll('[data-animal]');

			for (var i = animalSelectors.length - 1; i >= 0; i--) {
				animalSelectors[i].addEventListener('change', function() {
					var animal = this.value;
					find.setAnimal(animal);

					for (var i = animalSelectors.length - 1; i >= 0; i--) {
						var option = animalSelectors[i].querySelector('[value="'+animal+'"]');
						option && (option.selected = true);
					};
				});
			};

			// Find elements
			f.animal.elm = document.getElementById('animal');

			// Add quote
			var quoteElm = document.getElementById('quote'),
				randomQuote = f.quotes[Math.floor(Math.random() * f.quotes.length)];
			if (quoteElm)
				quoteElm.innerText = randomQuote;

			// Open welcome modal
			f.modal.open('welcome');
			f.audio.showLoader('loader', '<button onclick="find.gameStart();">Start Game</button>');

			// Update stats
			f.stats.elm = document.getElementById('stats');
			f.updateTotal();
			f.updateStats();
		},
		gameStart: function() {
			// Run after 16 seconds to prevent animal from being found immediately
			setTimeout(function() {
				f.stats.started = true;
				f.stats.startedAt = f.time();
				f.animal.pos.x = f.random(window.innerWidth  - f.animal.size.x) + f.animal.size.x/2;
				f.animal.pos.y = f.random(window.innerHeight - f.animal.size.y) + f.animal.size.y/2;

				f.audio.start();

				f.modal.close();

				f.track2('Cow', 'gameStart');
			}, 16);
		},
		gameStop: function(win) {
			if (f.stats.started == false)
				return false;

			var secondsTaken = f.stats.lastSecondsTaken = Math.round((f.time() - f.stats.startedAt)/1000);
			f.stats.started = false;
			f.stats.startedAt = null;
			f.audio.stop();

			if (win) {
				f.addPoint(win);
				f.moo(function() {
					f.modal.open('congratulations');

					if (f.enablePromo && !f.stats.seenPromo && find.stats.wins > 1 && promo) {
						if (promo.start())
							f.stats.seenPromo += 1;
					}
				});
			}
			f.updateCursor();

			f.track2('Cow', 'gameStop', null, secondsTaken);
		},
		setAnimal: function(animal) {
			f.track2('Cow', 'setAnimal', animal);

			if (!(animal in f.animals))
				return console.error('Error: No such animal (', animal, ')');

			f.settings.animal = animal;
			f.animal.elm.setAttribute('data-animal', animal);
		},
		addPoint: function(win) {
			f.stats.points++;
			if (win) {
				// f.getScript('/api/foundOne?callback=find.setTotal');
				f.makeTotalRequest(true);
				f.stats.wins++;
			}
			f.updateStats();
		},
		random: function(max) {
			return parseInt(Math.random() * max);
		},
		click: function(e) {
			f.update(e);
			if (f.stats.inRange) {
				f.gameStop(true);
			}
		},
		moo: function(callback) {
			var elm = f.animal.elm;
			elm.classList.add('small');
			elm.style.left = f.animal.pos.x - f.animal.size.x/2 + 'px';
			elm.style.top  = f.animal.pos.y - f.animal.size.y/2 + 'px';
			elm.style.display = 'block';

			setTimeout(function() {
				elm.classList.remove('small');
				elm.style.left = null;
				elm.style.top = null;
			}, 100);

			setTimeout(function() {
				f.audio.moo();
				elm.classList.add('moo');
			}, f.animals[f.settings.animal].mooDelay);
			setTimeout(function() {
				elm.classList.remove('moo');
			}, 1400);

			setTimeout(function() {
				elm.style.display = 'none';
				typeof callback == 'function' && callback();
			}, 2400);
		},
		update: function(e) {
			if (f.stats.started) {
				f.updateDistance(e);
				f.updateCursor();
			}
			f.updateStats();
		},
		updateDistance: function(e) {
			var mouseX = e.x || e.clientX,
				mouseY = e.y || e.clientY,
				cowX = f.animal.pos.x,
				cowY = f.animal.pos.y,
				distance = f.stats.distance = parseInt(Math.sqrt(
					Math.pow(mouseX - cowX, 2) +
					Math.pow(mouseY - cowY, 2)
				)),
				level = f.stats.level = Math.max(0, f.animals[f.settings.animal].levels - parseInt((1 - Math.exp((Math.E - distance)/1000)) * 2 * f.animals[f.settings.animal].levels));

			return distance;
		},
		updateCursor: function() {
			if (f.stats.started && f.stats.distance < f.settings.requiredDistance) {
				f.stats.inRange = true;
				if (!f.settings.expertMode)
					return document.body.style.cursor = 'pointer';
			} else {
				f.stats.inRange = false;
				return document.body.style.cursor = 'default';
			}
		},
		updateStats: function() {
			if (!f.stats.elm)
				return false;
			var html = '';
			html += '<div class="feedback"><a href="https://twitter.com/intent/tweet?text=www.FindTheInvisibleCow.com%20by%20@scriptist" target="_blank">Send feedback with twitter</a></div>';
			if (f.stats.total)
				html += '<div class="total">' + f.numberFormat(f.stats.total) + '</div>';
			else
				html += '<div class="total">' + '9,100,000+' + '</div>';
			html += '<div class="points">' + f.numberFormat(f.stats.points) + '</div>';
			if (f.settings.stats) {
				html += '<div class="more">';
				for (key in f.stats) {
					if (key != 'elm') {
						var val = f.stats[key];
						html += '<span class="key">' + key + ':</span> ' + val + '<br />';
					}
				};
				html += '</div>';
			}
			f.stats.elm.innerHTML = html;

			f.save();
		},
		updateTotal: function() {
			// f.getScript('/api/getFound?callback=find.setTotal');
			f.makeTotalRequest();
		},
		makeTotalRequest: function(increment) {
			var type = 'GET',
				data;

			if (increment) {
				type = 'PUT';
			}


			var xhr = createCORSRequest(type, 'https://api.mongolab.com/api/1/databases/ftic/collections/count/52fea714e4b056266d60bd3a?apiKey=zq2DUayEFGTLl08aGo8tICf8Ywy6K_Y_');
			if (!xhr){
				return console.error('CORS not supported');
			}

			if (increment) {
				xhr.setRequestHeader('Content-Type', 'application/json');
				data = JSON.stringify( { "$inc" : { "count" : 1 } } );
			}

			xhr.send(data);

			/*SUCCESS -- do somenthing with data*/
			xhr.onload = function(){
				// process the response.
				f.setTotal(JSON.parse(xhr.responseText));
			};

			xhr.onerror = function(e){
				console.error(e);
			};
		},
		setTotal: function(data) {
			var i = parseInt(data.count);
			if (i && i > 6200000)
				f.stats.total = i;
			f.updateStats();
		},
		track: function(category, action, label, value) {
			return f.track2(category, action, label, value);
		},
		track2: function(category, action, label, value) {
			ga('send', 'event', category, action, label, value);
		},
		getScript: function(url) {
			return false;
			url += (url.match('/\?/') ? '&' : '?') + 't=' + f.time();

			var elm = document.createElement('script');
			elm.src = url;
			document.head.appendChild(elm);
		},
		numberFormat: function(x) {
			if (x)
				return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			else
				return '0';
		},
		save: function() {
			if (!localStorage)
				return false;

			localStorage['f-stats-donated'] = f.stats.donated;
			localStorage['f-stats-points'] = f.stats.points;
			localStorage['f-stats-seenPromo'] = f.stats.seenPromo;
			localStorage['f-stats-wins'] = f.stats.wins;
		},
		load: function() {
			if (!localStorage)
				return false;

			f.stats.donated = Number(localStorage['f-stats-donated']) || 0;
			f.stats.points = Number(localStorage['f-stats-points']) || 0;
			f.stats.seenPromo = Number(localStorage['f-stats-seenPromo']) || 0;
			f.stats.wins = Number(localStorage['f-stats-wins']) || 0;
		},
		time: function() {
			return (new Date()).getTime();
		},

		audio: {
			context: null,
			interval: null,
			fileFormat: null,
			iOSinitialised: !( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false ),
			sounds: {
				urls: {
					thunder: '/sounds/thunder',
					cowWin: '/sounds/cow/win',
					cow0: '/sounds/cow/0',
					cow1: '/sounds/cow/1',
					cow2: '/sounds/cow/2',
					cow3: '/sounds/cow/3',
					cow4: '/sounds/cow/4',
					cow5: '/sounds/cow/5',
					cow6: '/sounds/cow/6',
					cow7: '/sounds/cow/7',
					cow8: '/sounds/cow/8',
					cow9: '/sounds/cow/9',
					cow10: '/sounds/cow/10',
					cow11: '/sounds/cow/11',
					goatWin: '/sounds/goat/win',
					goat0: '/sounds/goat/0',
					goat1: '/sounds/goat/1',
					goat2: '/sounds/goat/2',
					goat3: '/sounds/goat/3',
					goat4: '/sounds/goat/4',
					goat5: '/sounds/goat/5',
					goat6: '/sounds/goat/6',
					goat7: '/sounds/goat/7',
					goat8: '/sounds/goat/8',
					goat9: '/sounds/goat/9',
					goat10: '/sounds/goat/10',
					foxWin: '/sounds/fox/win',
					fox0: '/sounds/fox/0',
					fox1: '/sounds/fox/1',
					fox2: '/sounds/fox/2',
					fox3: '/sounds/fox/3',
					fox4: '/sounds/fox/4',
					fox5: '/sounds/fox/5',
					fox6: '/sounds/fox/6',
					fox7: '/sounds/fox/7',
					fox8: '/sounds/fox/8',
					fox9: '/sounds/fox/9',
					fox10: '/sounds/fox/10'
				},
				data: {}
			},
			init: function() {
				try {
					// Fix up for prefixing
					window.AudioContext = window.AudioContext||window.webkitAudioContext;
					context = f.audio.context = new AudioContext();
				}
				catch(e) {
					return false;
				}

				var a = document.createElement("audio"),
					mp3Support = (typeof a.canPlayType === "function" && a.canPlayType("audio/mpeg") !== "");

				f.audio.fileFormat = (mp3Support) ? 'mp3' : 'ogg';

				// Load sounds
				for (var key in f.audio.sounds.urls) {
					f.audio.preload(key);
				}

				// iOS compatibility
				window.addEventListener('click', function() {
					if (!f.audio.iOSinitialised)
						f.audio.playTone(20000, 0.1);
					f.audio.iOSinitialised = true;
				});
				return true;
			},
			preload: function(key) {
				var request = new XMLHttpRequest();
				request.open('GET', f.audio.sounds.urls[key] + '.' + f.audio.fileFormat, true);
				request.responseType = 'arraybuffer';

				// Decode asynchronously
				request.onload = function() {
					f.audio.context.decodeAudioData(request.response, function(buffer) {
						f.audio.sounds.data[key] = buffer;
					}, function() {
						console.error('Could not decode audio');
					});
				}
				request.send();
			},
			showLoader: function(id, htmlOnceComplete) {
				var loader = document.getElementById(id),
					refreshInterval = 100,
					inner, setLoader, interval;
				if (!loader)
					return false;
				loader.innerHTML = '<div id="loader-inner"></div>';
				inner = document.getElementById('loader-inner'),
				setLoader = function() {
					var total = Object.keys(f.audio.sounds.urls).length,
						complete = Object.keys(f.audio.sounds.data).length,
						percent = complete / total * 100;
					inner.style.width = percent + '%';
					if (percent == 100) {
						clearInterval(interval);
						loader.classList.remove('loading');
						loader.innerHTML = htmlOnceComplete;
					}
				};
				interval = setInterval(setLoader, refreshInterval);
			},
			playLevel: function(level, tone) {
				if (tone) {
					// Play a tone
					f.audio.playTone(200 + level * 40, f.animals[f.settings.animal].duration);
				} else {
					// Play a spoken cow
					find.audio.play(f.settings.animal + level);
				}
			},
			start: function() {
				f.audio.playingFor = 0;
				f.audio.interval = setInterval(function() {
					f.audio.playLevel(f.stats.level);
				}, f.animals[f.settings.animal].duration * 1000);
			},
			stop: function() {
				clearInterval(f.audio.interval);
			},
			play: function(sound) {
				if (!(sound in find.audio.sounds.data)) {
					console.error('Could not play sound: ' + sound);
					return false;
				}
				var source = f.audio.context.createBufferSource();
				source.buffer = find.audio.sounds.data[sound];
				source.connect(f.audio.context.destination);
				source.start(0);
			},
			playTone: function(frequency, duration) {
				var oscillator = context.createOscillator();

				oscillator.type = f.settings.tone;
				oscillator.frequency.value = frequency;
				oscillator.connect(context.destination);
				oscillator.start(0);
				setTimeout(function() {
					oscillator.stop(0);
				}, duration * 1000);
			},
			moo: function() {
				f.audio.play(f.settings.animal + 'Win');
			}
		},
		modal: {
			open: function(name) {
				var elm = document.getElementById('modal-' + name);
				if (!elm)
					return false;
				f.modal.close();
				f.modal.checkPoints(elm);
				elm.style.display = 'block';
				document.body.classList.add('modalOpen');
				return true;
			},
			close: function() {
				var elms = document.querySelectorAll('[id^=modal-]');
				for (var i = 0; i < elms.length; i++) {
					elms[i].style.display = 'none';
				}
				document.body.classList.remove('modalOpen');
				return true;
			},
			checkPoints: function(modal) {
				var p = f.stats.points;

				var elms = modal.querySelectorAll('[data-points-equal], [data-points-max], [data-points-min]'),
					donatedElms = modal.querySelectorAll('[data-donated]');

				for (var i = elms.length - 1; i >= 0; i--) {
					var elm = elms[i],
						max = elm.getAttribute('data-points-max'),
						equal = elm.getAttribute('data-points-equal'),
						min = elm.getAttribute('data-points-min');

					if ((max !== null && p <= max) || (equal !== null && p == equal) || (min !== null && p >= min)) {
						elm.style.display = null;
					} else {
						elm.style.display = 'none';
					}
				};

				for (var i = donatedElms.length - 1; i >= 0; i--) {
					var elm = donatedElms[i],
						donated = !!parseInt(elm.getAttribute('data-donated'));

					if (f.stats.donated == donated) {
						elm.style.display = null;
					} else {
						elm.style.display = 'none';
					}
				};
			}
		}
	}

	f.init();

	return f;
})();

function createCORSRequest(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {

		// Check if the XMLHttpRequest object has a "withCredentials" property.
		// "withCredentials" only exists on XMLHTTPRequest2 objects.
		xhr.open(method, url, true);

	} else if (typeof XDomainRequest != "undefined") {

		// Otherwise, check if XDomainRequest.
		// XDomainRequest only exists in IE, and is IE's way of making CORS requests.
		xhr = new XDomainRequest();
		xhr.open(method, url);

	} else {

		// Otherwise, CORS is not supported by the browser.
		xhr = null;

	}
	return xhr;
}