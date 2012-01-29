var http = require( 'http' );

var IO = {
	//event handling
	events : {},
	preventDefault : false,

	//register for an event
	register : function ( name, fun, thisArg ) {
		if ( !this.events[name] ) {
			this.events[ name ] = [];
		}
		this.events[ name ].push({
			fun : fun,
			thisArg : thisArg,
			args : Array.prototype.slice.call( arguments, 3 )
		});

		return this;
	},

	unregister : function ( name, fun ) {
		if ( !this.events[name] ) {
			return this;
		}

		this.events[ name ] = this.events[ name ].filter(function ( obj ) {
			return obj.fun !== fun;
		});

		return this;
	},

	//fire event!
	fire : function ( name ) {
		if ( !this.events[name] ) {
			return;
		}
		this.preventDefault = false;

		var args = Array.prototype.slice.call( arguments, 1 );

		this.events[ name ].forEach( fireEvent, this);

		function fireEvent( evt ) {
			var call = evt.fun.apply( evt.thisArg, evt.args.concat(args) );

			if ( call === false ) {
				this.preventDefault = true;
			}
		}
	},

	request : http.request,

	jsonp : function ( opts ) {
		var req = this.request({
			host : opts.host,
			path : opts.path
		});

		req.on( 'response', function ( resp ) {
			var data = '';

			resp.on( 'data', function ( body ) {
				data += body.toString();

			});

			resp.on( 'end', function () {
				opts.fun.apply( opts.thisArg, JSON.parse(data) );
			});
		});
	},

	toRequestString : function ( obj ) {
		return Object.keys( obj ).map(function ( key ) {
			return encodeURIComponent( key ) +
				'=' +
				encodeURIComponent( obj[key] );
		}).join( '&' );
	}
};

//build IO.in and IO.out
[ 'in', 'out' ].forEach(function ( dir ) {
	var fullName = dir + 'put';

	IO[ dir ] = {
		buffer : [],

		receive : function ( obj ) {
			IO.fire( 'receive' + fullName, obj );

			if ( IO.preventDefault ) {
				console.log( obj, 'preventDefault' );
				return this;
			}

			this.buffer.push( obj );

			return this;
		},

		//unload the next item in the buffer
		tick : function () {
			if ( this.buffer.length ) {
				IO.fire( fullName, this.buffer.shift() );
			}

			return this;
		},

		//unload everything in the buffer
		flush : function () {
			IO.fire( 'before' + fullName );

			if ( !this.buffer.length ) {
				return this;
			}

			var i = this.buffer.length;
			while( i --> 0 ) {
				this.tick();
			}

			IO.fire( 'after' + fullName );

			this.buffer = [];

			return this;
		}
	};
});

Object.merge = function () {
	return [].reduce.call( arguments, function ( ret, merger ) {

		Object.keys( merger ).forEach(function ( key ) {
			ret[ key ] = merger[ key ];
		});

		return ret;
	}, {} );
};

exports.IO = IO;
