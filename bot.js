var IO = require( './IO.js' ).IO;

var bot = {
	name : 'Zirak',
	invocationPattern : '!!',

	baseURL : 'http://chat.stackoverflow.com/',
	roomid : 6147,
	fkey : 'e2a33e7b1b3536bb46b39d9bcefaffa8',

	commandRegex : /^\/([\w\-\_]+)\s*(.+)?$/,
	commands : {}, //will be filled as needed

	stopped : false,

	parseMessage : function ( msgObj ) {
		console.log( msgObj, 'parseMessage input' );

		if ( !this.validateMessage(msgObj) ) {
			console.log( msgObj, 'parseMessage invalid' );
			return;
		}

		var msg = this.cleanMessage( msgObj.content ),
			usr = msgObj.user_name;
		msg = msg.slice( this.invocationPattern.length ).trim();

		console.log( msg, 'parseMessage valid' );

		try {
			//it's a command
			if ( msg.startsWith('/') ) {
				console.log( msg, 'parseMessage command' );
				this.parseCommand( msg, msgObj );
				return;
			}

			console.log( msg, 'parseMessage guess' );
			//if it's valid and not a command, fire an event and let someone
			// else (or noone) worry about it
			IO.fire( 'messageReceived', msg, msgObj.user_name );
		}
		catch ( e ) {
			var err = 'Could not process input. Error: ';
			err += e.message;

			if ( e.lineNumber ) {
				err += ' on line ' + e.lineNumber;
			}

			this.reply( err, usr );
			throw e;
		}
	},

	parseCommand : function ( cmd, msgObj ) {
		console.log( cmd, 'parseCommand input' );

		if ( !this.commandRegex.test(cmd) ) {
			bot.reply( 'Invalid command ' + cmd );
		}

		var commandParts = cmd.match( this.commandRegex ),
			commandName = commandParts[ 1 ].toLowerCase(),
			commandArgs = commandParts[ 2 ] || '',

			usr = msgObj.user_name;

		console.log( commandParts, 'parseCommand matched' );
	},


	validateMessage : function ( msgObj ) {
		if ( this.stopped ) {
			return false;
		}

		var pathParts = location.pathname.split( '/' );

		if ( msgObj.room_id !== this.roomid ) {
			return false;
		}

		var msg = msgObj.content.toLowerCase().trim();

		//all we really care about
		if ( !msg.startsWith(this.invocationPattern) ) {
			return false;
		}

		return true;
	},

	commandExists : function ( cmdName ) {
		return this.commands.hasOwnProperty( cmdName );
	},

	cleanMessage : (function () {
		var htmlEntities = {
			'&quot;' : '"',
			'&amp;'  : '&',
			'&#39;'  : '\''
		};

		return function ( msg ) {
			msg = msg.trim();

			Object.keys( htmlEntities ).forEach(function ( entity ) {
				var regex = new RegExp( entity, 'g' );
				msg = msg.replace( regex, htmlEntities[entity] );
			});

			return msg;
		};
	}()),

	reply : function ( msg, usr ) {
		this.output.add( '@' + usr + ' ' + msg );
	},

	directReply : function ( msg, repliedID ) {
		this.output.add( ':' + repliedID + ' ' + msg );
	},

	output : {
		msg : '',

		add : function ( txt ) {
			IO.out.receive( txt );
		},

		build : function ( txt ) {
			this.msg += txt + '\n';
			console.log( txt, this.msg );
		},

		send : function () {
			var message = this.msg, that = this;

			if ( !message ) {
				return;
			}

			var req = IO.request({
				host : that.baseURL,
				path : '/chats/' + bot.roomid + '/messages/new',
				method : 'POST',
				headers : {
					'content-type' : 'application/x-www-form-urlencoded'
				}
			}, complete );

			req.end( 'fkey=' + bot.fkey + '&text=' + message );

			that.msg = '';

			function complete ( resp ) {
				//conflict, wait for next round to send message
				if ( resp.status === 409 ) {
					IO.out.receive( message.trim() );
				}
			}
		},
	},

	//some sugar
	addCommand : function ( cmd ) {
		cmd.permissions = cmd.permissions || {};
		cmd.permissions.use = cmd.permissions.use || 'ALL';
		cmd.permissions.del = cmd.permissions.del || 'NONE';

		cmd.description = cmd.description || '';

		cmd.canUse = function ( usrName ) {
			return this.permissions.use === 'ALL' ||
				this.permissions.use !== 'NONE' &&
				this.permissions.use.indexOf( usrName ) > -1;
		};

		cmd.canDel = function ( usrName ) {
			return this.permissions.del !== 'NONE' &&
				this.permissions.del === 'ALL' ||
				this.permissions.del.indexOf( usrName ) > -1;
		};

		cmd.del = function () {

		};

		cmd.exec = function () {
			return this.fun.apply( this, arguments );
		};

		this.commands[ cmd.name ] = cmd;
	},

	stop : function () {
		this.stopped = true;
	}
};

IO.register( 'receiveinput', bot.validateMessage, bot );
IO.register( 'input', bot.parseMessage, bot );
IO.register( 'output', bot.output.build, bot.output );
IO.register( 'afteroutput', bot.output.send, bot.output );

exports.bot = bot;

////utility start

var polling = {
	//used in the SO chat requests, dunno exactly what for
	times : {},

	pollInterval : 5000,

	init : function () {
		var that = this;

		var req = IO.request({
			host : that.baseURL,
			path : '/chats/' + bot.roomid + '/events/',
			headers : {
				'Content-Type' : 'application/x-www-form-urlencoded'
			}
		}, finish );

		req.end(IO.toRequestString({
			fkey : that.fkey,
			since : 0,
			mode : 'Messages',
			msgCount : 0
		}));

		function finish ( resp ) {
			resp = JSON.parse( resp );

			that.times[ 'r' + roomid ] = resp.time;

			setTimeout(function () {
				that.poll();
			}, that.pollInterval );
		}
	},

	poll : function () {
		var that = this;

		var req = IO.request({
			host : that.baseURL,
			path : '/events',
			headers : {
				'Content-Type' : 'application/x-www-form-urlencoded'
			}
		}, function () {
			that.complete.apply( that, arguments );
		});

		req.end(IO.toRequestString( Object.merge({
			fkey : that.fkey
		}, bot.times )));
	},

	complete : function ( resp ) {
		if ( !resp ) {
			return;
		}
		resp = JSON.parse( resp );

		var that = this;
		Object.keys( resp ).forEach(function ( key ) {
			var msgObj = resp[ key ];

			if ( msgObj.t ) {
				that.times[ key ] = msgObj.t;
			}

			if ( msgObj.e ) {
				msgObj.e.forEach( that.handleMessageObject );
			}
		});

		IO.in.flush();
		IO.out.flush();

		setTimeout(function () {
			that.poll();
		}, this.pollInterval );
	},

	handleMessageObject : function ( msg ) {
		//event_type of 1 means new message
		if ( msg.event_type !== 1 ) {
			return;
		}
		//add the message to the input buffer
		IO.in.receive( msg );
	}
};
polling.init();

//small utility functions
Object.merge = function () {
	return [].reduce.call( arguments, function ( ret, merger ) {

		Object.keys( merger ).forEach(function ( key ) {
			ret[ key ] = merger[ key ];
		});

		return ret;
	}, {} );
};
String.prototype.indexesOf = function ( str ) {
	var part = this.valueOf(),

		//we use offset to determine the absolute distance from beginning
		index, offset = 0,
		len = str.length,
		ret = [];

	while ( (index = part.indexOf(str)) >= 0 ) {
		ret.push( index + offset );
		part = part.slice( index + len );
		offset += index + len;
	}

	return ret;
};
String.prototype.startsWith = function ( str ) {
	return this.indexOf( str ) === 0;
};
////utility end
